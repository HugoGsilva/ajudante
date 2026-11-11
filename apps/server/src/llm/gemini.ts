import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@ajudante/api/brain/categories";
import { normalizeIntent, type Intent } from "@ajudante/api/brain/intents";
import { formatBrl } from "@ajudante/api/brain/money";
import type { CategoryMapInput } from "@ajudante/api/brain/types";

export type TurnInput = {
  text?: string;
  audio?: { mimeType: string; bytes: Uint8Array };
  profile: string;
  nowLabel: string;
};

const INTENT_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: ["GASTO", "RECEITA", "TAREFA", "NOTA", "CONSULTA", "CONVERSA"] },
    amount: { type: "number" },
    category: { type: "string" },
    description: { type: "string" },
    title: { type: "string" },
    content: { type: "string" },
    notify_at: { type: "string" },
    occurred_on: { type: "string" },
    confidence: { type: "number" },
    subject: { type: "string", enum: ["saldo", "gastos", "tarefas", "ideias"] },
    category_filter: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    reply: { type: "string" },
    new_context: { type: "string" },
    memory_type: { type: "string", enum: ["habit", "preference", "entity", "fact"] },
  },
  required: ["intent", "reply", "confidence"],
};

export function createGemini(config: { apiKey?: string; model: string; timeZone: string }) {
  return {
    classify(input: TurnInput): Promise<Intent> {
      return classify(config, input);
    },
    mapCategories(rows: CategoryMapInput[]): Promise<{ index: number; categoryId: string }[]> {
      return mapCategories(config, rows);
    },
    writeBriefing(facts: string): Promise<string> {
      return writeBriefing(config, facts);
    },
    compressProfile(current: string, notes: string[]): Promise<string | null> {
      return compressProfile(config, current, notes);
    },
  };
}

export type Gemini = ReturnType<typeof createGemini>;

async function classify(config: { apiKey?: string; model: string; timeZone: string }, input: TurnInput): Promise<Intent> {
  const categories = [
    ...EXPENSE_CATEGORIES.map((item) => `${item.id} (gasto: ${item.name})`),
    ...INCOME_CATEGORIES.map((item) => `${item.id} (receita: ${item.name})`),
  ].join(", ");
  const system = [
    "Você é o núcleo do segundo cérebro do dono. Devolva só JSON.",
    `Agora: ${input.nowLabel} (${config.timeZone}).`,
    `Perfil do dono: ${input.profile.trim() || "ainda vazio"}.`,
    `Categorias permitidas: ${categories}.`,
    "intent: GASTO, RECEITA, TAREFA, NOTA, CONSULTA ou CONVERSA.",
    "amount é o valor em reais. category é um id da lista. occurred_on é YYYY-MM-DD. notify_at é ISO com fuso.",
    "confidence é 0 a 100. reply é a frase curta em português.",
    "CONSULTA não inventa número. subject: saldo, gastos, tarefas ou ideias.",
    "Se o dono revelar hábito, preferência, pessoa ou fato estável, preencha new_context e memory_type.",
    "Pagamento de fatura não é gasto.",
  ].join("\n");
  const parts: Record<string, unknown>[] = [];
  if (input.audio) {
    parts.push({
      inlineData: {
        mimeType: input.audio.mimeType,
        data: Buffer.from(input.audio.bytes).toString("base64"),
      },
    });
  }
  parts.push({ text: input.text?.trim() || "Classifique a mensagem do dono." });
  const raw = await generate(config, system, parts, INTENT_SCHEMA);
  const intent = normalizeIntent(raw);
  if (!intent) throw new Error("O modelo não devolveu um JSON de intenção.");
  return intent;
}

async function mapCategories(
  config: { apiKey?: string; model: string },
  rows: CategoryMapInput[],
): Promise<{ index: number; categoryId: string }[]> {
  if (rows.length === 0) return [];
  const fallback = rows.map((row) => ({
    index: row.index,
    categoryId: row.kind === "income" ? "entrada" : "outros",
  }));
  if (!config.apiKey) return fallback;
  const list = [
    ...EXPENSE_CATEGORIES.map((item) => `${item.id}=${item.name}`),
    ...INCOME_CATEGORIES.map((item) => `${item.id}=${item.name}`),
  ].join(", ");
  const lines = rows
    .map((row) => `${row.index}. ${row.kind} ${formatBrl(row.amountCents)} ${row.description}`)
    .join("\n");
  try {
    const raw = await generate(
      config,
      `Mapeie cada linha para um categoryId desta lista e nenhum outro: ${list}. Devolva JSON {"items":[{"index":0,"categoryId":"mercado"}]}.`,
      [{ text: lines }],
      {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                categoryId: { type: "string" },
              },
              required: ["index", "categoryId"],
            },
          },
        },
        required: ["items"],
      },
    );
    const items = Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: { index?: unknown; categoryId?: unknown }[] }).items
      : [];
    const mapped = new Map(fallback.map((item) => [item.index, item.categoryId]));
    for (const item of items) {
      if (typeof item.index !== "number" || typeof item.categoryId !== "string") continue;
      const row = rows.find((candidate) => candidate.index === item.index);
      if (!row) continue;
      const allowed = row.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      if (allowed.some((category) => category.id === item.categoryId)) {
        mapped.set(item.index, item.categoryId);
      }
    }
    return [...mapped.entries()].map(([index, categoryId]) => ({ index, categoryId }));
  } catch (error) {
    console.error("mapCategories", error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function writeBriefing(config: { apiKey?: string; model: string }, facts: string): Promise<string> {
  if (!config.apiKey) return `Bom dia.\n${facts}`;
  try {
    const raw = await generate(
      config,
      "Escreva um bom-dia curto em português, com os fatos abaixo e nenhum número inventado. No máximo 800 caracteres. JSON {\"text\":\"...\"}.",
      [{ text: facts }],
      {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    );
    const text = (raw as { text?: unknown }).text;
    return typeof text === "string" && text.trim() ? text.trim() : `Bom dia.\n${facts}`;
  } catch (error) {
    console.error("briefing", error instanceof Error ? error.message : error);
    return `Bom dia.\n${facts}`;
  }
}

async function compressProfile(
  config: { apiKey?: string; model: string },
  current: string,
  notes: string[],
): Promise<string | null> {
  if (!config.apiKey || notes.length === 0) return null;
  const raw = await generate(
    config,
    "Reescreva o perfil do dono em português, texto corrido, no máximo 1200 caracteres. Una o perfil atual com as anotações. Remova redundância. Não invente. JSON {\"profile\":\"...\"}.",
    [{ text: `Perfil atual:\n${current || "(vazio)"}\n\nAnotações:\n${notes.map((note) => `- ${note}`).join("\n")}` }],
    {
      type: "object",
      properties: { profile: { type: "string" } },
      required: ["profile"],
    },
  );
  const profile = (raw as { profile?: unknown }).profile;
  return typeof profile === "string" && profile.trim() ? profile.trim().slice(0, 1200) : null;
}

async function generate(
  config: { apiKey?: string; model: string },
  system: string,
  parts: Record<string, unknown>[],
  responseSchema: unknown,
): Promise<unknown> {
  if (!config.apiKey) throw new Error("GEMINI_API_KEY ausente.");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Gemini respondeu ${response.status}.`);
  }
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts
    ?.filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join("\n");
  if (!text) throw new Error("Gemini devolveu resposta vazia.");
  return JSON.parse(stripFence(text));
}

function stripFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/.exec(trimmed);
  return fenced?.[1]?.trim() ?? trimmed;
}
