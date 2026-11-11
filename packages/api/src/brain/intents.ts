export type IntentName = "GASTO" | "RECEITA" | "TAREFA" | "NOTA" | "CONSULTA" | "CONVERSA";
export type ConsultSubject = "saldo" | "gastos" | "tarefas" | "ideias";
export type MemoryType = "habit" | "preference" | "entity" | "fact";

export type Intent = {
  intent: IntentName;
  amountReais?: number;
  categoryId?: string;
  description?: string;
  title?: string;
  content?: string;
  notifyAt?: string;
  occurredOn?: string;
  confidence: number;
  subject?: ConsultSubject;
  categoryFilter?: string;
  from?: string;
  to?: string;
  reply: string;
  newContext?: string;
  memoryType?: MemoryType;
};

const INTENTS = new Set<IntentName>(["GASTO", "RECEITA", "TAREFA", "NOTA", "CONSULTA", "CONVERSA"]);
const SUBJECTS = new Set<ConsultSubject>(["saldo", "gastos", "tarefas", "ideias"]);
const MEMORY = new Set<MemoryType>(["habit", "preference", "entity", "fact"]);

export function normalizeIntent(raw: unknown): Intent | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const intent = String(record.intent ?? "").toUpperCase();
  if (!INTENTS.has(intent as IntentName)) return null;
  const confidence = normalizeConfidence(record.confidence);
  const subject = optionalEnum(record.subject, SUBJECTS);
  const memoryType = optionalEnum(record.memory_type ?? record.memoryType, MEMORY);
  const newContext = clip(record.new_context ?? record.newContext, 500);
  return {
    intent: intent as IntentName,
    amountReais: optionalNumber(record.amount),
    categoryId: clip(record.category, 80),
    description: clip(record.description, 500),
    title: clip(record.title, 200),
    content: clip(record.content, 4000),
    notifyAt: optionalInstant(record.notify_at ?? record.notifyAt),
    occurredOn: optionalDay(record.occurred_on ?? record.occurredOn),
    confidence,
    subject,
    categoryFilter: clip(record.category_filter ?? record.categoryFilter, 80),
    from: optionalDay(record.from),
    to: optionalDay(record.to),
    reply: clip(record.reply, 1000) ?? "",
    newContext,
    memoryType: newContext ? (memoryType ?? "fact") : undefined,
  };
}

function normalizeConfidence(value: unknown): number {
  const number = optionalNumber(value);
  if (number === undefined) return 50;
  const scaled = number <= 1 ? number * 100 : number;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim().replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function optionalEnum<T extends string>(value: unknown, allowed: Set<T>): T | undefined {
  if (typeof value !== "string") return undefined;
  const token = value.trim().toLowerCase() as T;
  return allowed.has(token) ? token : undefined;
}

function optionalDay(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1];
}

function optionalInstant(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function clip(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}
