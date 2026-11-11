import type { Database } from "@ajudante/db";

import { categoryName, resolveCategory } from "./categories";
import { answerConsult } from "./consult";
import type { Intent } from "./intents";
import { formatBrl, reaisToCents } from "./money";
import { needsConfirmation } from "./owner";
import { addNote, createIdea, createTask, createTransaction, openConfirmation } from "./store";
import { formatDateTimePt, zonedNow } from "./time";

export type TurnSettings = {
  thresholdCents: number;
  minConfidence: number;
  timeZone: string;
};

export type TurnResult = {
  text: string;
  confirmationId?: string;
};

export async function applyIntent(
  db: Database,
  intent: Intent,
  settings: TurnSettings,
  chatId: string,
): Promise<TurnResult> {
  if (intent.newContext && intent.memoryType) {
    await addNote(db, intent.memoryType, intent.newContext);
  }
  if (intent.intent === "GASTO" || intent.intent === "RECEITA") {
    return saveMoney(db, intent, settings, chatId);
  }
  if (intent.intent === "TAREFA") {
    const title = intent.title || intent.description || "Tarefa";
    await createTask(db, { title, content: intent.content, notifyAt: intent.notifyAt });
    const when = intent.notifyAt ? ` Aviso ${formatDateTimePt(intent.notifyAt, settings.timeZone)}.` : " Sem aviso.";
    return { text: intent.reply || `Anotei a tarefa "${title}".${when}` };
  }
  if (intent.intent === "NOTA") {
    const title = intent.title || "Ideia";
    const content = intent.content || intent.description || title;
    await createIdea(db, { title, content });
    return { text: intent.reply || `Guardei a ideia "${title}".` };
  }
  if (intent.intent === "CONSULTA") {
    const text = await answerConsult(db, {
      subject: intent.subject ?? "saldo",
      categoryFilter: intent.categoryFilter,
      from: intent.from,
      to: intent.to,
      timeZone: settings.timeZone,
    });
    return { text };
  }
  return { text: intent.reply || "Não entendi. Pode dizer de outro jeito?" };
}

async function saveMoney(
  db: Database,
  intent: Intent,
  settings: TurnSettings,
  chatId: string,
): Promise<TurnResult> {
  const kind = intent.intent === "GASTO" ? "expense" : "income";
  if (intent.amountReais === undefined || intent.amountReais <= 0) {
    return { text: intent.reply || "Qual o valor?" };
  }
  const amountCents = reaisToCents(intent.amountReais);
  const category = resolveCategory(kind, intent.categoryId);
  const occurredOn = intent.occurredOn ?? zonedNow(settings.timeZone).date;
  const description = intent.description || intent.title || categoryName(category.id);
  const confidence = category.known ? intent.confidence : Math.min(intent.confidence, 40);
  if (
    needsConfirmation({
      kind,
      amountCents,
      confidence,
      thresholdCents: settings.thresholdCents,
      minConfidence: settings.minConfidence,
      categoryKnown: category.known,
    })
  ) {
    const confirmationId = await openConfirmation(db, chatId, {
      kind,
      amountCents,
      categoryId: category.id,
      description,
      occurredOn,
      confidence,
    });
    const label = kind === "expense" ? "gasto" : "entrada";
    return {
      confirmationId,
      text: `Confirmar ${label} de ${formatBrl(amountCents)} em ${categoryName(category.id)}? ${description}`,
    };
  }
  await createTransaction(db, {
    kind,
    amountCents,
    categoryId: category.id,
    description,
    occurredOn,
    source: "telegram",
    confidence,
  });
  const verb = kind === "expense" ? "Anotei o gasto" : "Anotei a entrada";
  return { text: intent.reply || `${verb} de ${formatBrl(amountCents)} em ${categoryName(category.id)}.` };
}
