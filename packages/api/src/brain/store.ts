import { categories, confirmations, ideas, memoryNotes, ownerState, profile, tasks, transactions } from "@ajudante/db/schema/index";
import type { ConfirmationPayload } from "@ajudante/db/schema/brain";
import type { Database } from "@ajudante/db";
import { and, asc, desc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";

import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryName } from "./categories";
import type { MemoryType } from "./intents";
import type { NubankDraft, NubankSource } from "./nubank";
import { monthRange } from "./time";

const OWNER = "owner";

let catalogReady: Promise<void> | null = null;

export function ensureReady(db: Database): Promise<void> {
  catalogReady ??= ensureCatalog(db).catch((error: unknown) => {
    catalogReady = null;
    throw error;
  });
  return catalogReady;
}

async function ensureCatalog(db: Database): Promise<void> {
  await db
    .insert(categories)
    .values([
      ...EXPENSE_CATEGORIES.map((item) => ({ ...item, kind: "expense" })),
      ...INCOME_CATEGORIES.map((item) => ({ ...item, kind: "income" })),
    ])
    .onConflictDoNothing();
  await db.insert(profile).values({ id: OWNER, content: "" }).onConflictDoNothing();
  await db.insert(ownerState).values({ id: OWNER }).onConflictDoNothing();
}

export type TransactionView = {
  id: string;
  kind: string;
  amountCents: number;
  categoryId: string | null;
  categoryName: string;
  description: string;
  occurredOn: string;
  source: string;
  createdAt: string;
};

export async function listTransactions(
  db: Database,
  filter: { month?: string; categoryId?: string },
): Promise<TransactionView[]> {
  await ensureReady(db);
  const conditions = [];
  if (filter.month) {
    const range = monthRange(filter.month);
    conditions.push(gte(transactions.occurredOn, range.from));
    conditions.push(lt(transactions.occurredOn, range.to));
  }
  if (filter.categoryId) conditions.push(eq(transactions.categoryId, filter.categoryId));
  const rows = await db
    .select({
      id: transactions.id,
      kind: transactions.kind,
      amountCents: transactions.amountCents,
      categoryId: transactions.categoryId,
      description: transactions.description,
      occurredOn: transactions.occurredOn,
      source: transactions.source,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
    .limit(300);
  return rows.map((row) => ({
    ...row,
    categoryName: categoryName(row.categoryId),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createTransaction(
  db: Database,
  input: {
    kind: "expense" | "income";
    amountCents: number;
    categoryId: string;
    description: string;
    occurredOn: string;
    source: string;
    confidence?: number;
    externalId?: string;
  },
): Promise<string> {
  await ensureReady(db);
  const id = crypto.randomUUID();
  await db.insert(transactions).values({
    id,
    kind: input.kind,
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    description: input.description,
    occurredOn: input.occurredOn,
    source: input.source,
    externalId: input.externalId,
    confidence: input.confidence,
  });
  return id;
}

export async function updateTransaction(
  db: Database,
  id: string,
  patch: {
    kind?: "expense" | "income";
    amountCents?: number;
    categoryId?: string;
    description?: string;
    occurredOn?: string;
  },
): Promise<void> {
  await ensureReady(db);
  const updated = await db
    .update(transactions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(transactions.id, id))
    .returning({ id: transactions.id });
  if (updated.length === 0) throw new Error("Lançamento não encontrado.");
}

export async function sumKind(
  db: Database,
  kind: "expense" | "income",
  range: { from: string; to: string },
  categoryId?: string,
): Promise<number> {
  const conditions = [
    eq(transactions.kind, kind),
    gte(transactions.occurredOn, range.from),
    lt(transactions.occurredOn, range.to),
  ];
  if (categoryId) conditions.push(eq(transactions.categoryId, categoryId));
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${transactions.amountCents}), 0)` })
    .from(transactions)
    .where(and(...conditions));
  return Number(row?.total ?? 0);
}

export type CategoryTotal = { categoryId: string; name: string; totalCents: number };

export async function expenseByCategory(
  db: Database,
  range: { from: string; to: string },
): Promise<CategoryTotal[]> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<string>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.kind, "expense"),
        gte(transactions.occurredOn, range.from),
        lt(transactions.occurredOn, range.to),
      ),
    )
    .groupBy(transactions.categoryId);
  return rows
    .map((row) => ({
      categoryId: row.categoryId ?? "outros",
      name: categoryName(row.categoryId),
      totalCents: Number(row.total),
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export type TaskView = {
  id: string;
  title: string;
  content: string | null;
  status: string;
  notifyAt: string | null;
  createdAt: string;
};

export async function listTasks(db: Database): Promise<TaskView[]> {
  await ensureReady(db);
  const rows = await db.select().from(tasks).orderBy(asc(tasks.notifyAt), desc(tasks.createdAt));
  return rows.map(toTask);
}

export async function createTask(
  db: Database,
  input: { title: string; content?: string; notifyAt?: string },
): Promise<string> {
  await ensureReady(db);
  const id = crypto.randomUUID();
  await db.insert(tasks).values({
    id,
    title: input.title,
    content: input.content,
    notifyAt: input.notifyAt ? new Date(input.notifyAt) : null,
  });
  return id;
}

export async function setTaskStatus(db: Database, id: string, status: "pending" | "done"): Promise<void> {
  const updated = await db
    .update(tasks)
    .set({ status })
    .where(eq(tasks.id, id))
    .returning({ id: tasks.id });
  if (updated.length === 0) throw new Error("Tarefa não encontrada.");
}

export async function tasksOnDay(db: Database, day: string, timeZone: string): Promise<TaskView[]> {
  const all = await listTasks(db);
  return all.filter((task) => task.status === "pending" && task.notifyAt && dayKey(task.notifyAt, timeZone) === day);
}

export async function dueReminders(db: Database, now = new Date()): Promise<TaskView[]> {
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "pending"),
        isNull(tasks.notifiedAt),
        lte(tasks.notifyAt, now),
        gte(tasks.notifyAt, from),
      ),
    )
    .orderBy(asc(tasks.notifyAt));
  return rows.map(toTask);
}

export async function markNotified(db: Database, id: string, when = new Date()): Promise<void> {
  await db.update(tasks).set({ notifiedAt: when }).where(eq(tasks.id, id));
}

export type IdeaView = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

export async function listIdeas(db: Database): Promise<IdeaView[]> {
  await ensureReady(db);
  const rows = await db.select().from(ideas).orderBy(desc(ideas.createdAt)).limit(100);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function createIdea(db: Database, input: { title: string; content: string }): Promise<string> {
  await ensureReady(db);
  const id = crypto.randomUUID();
  await db.insert(ideas).values({ id, title: input.title, content: input.content });
  return id;
}

export async function getProfile(db: Database): Promise<string> {
  await ensureReady(db);
  const [row] = await db.select().from(profile).where(eq(profile.id, OWNER));
  return row?.content ?? "";
}

export async function replaceProfile(db: Database, content: string): Promise<void> {
  await ensureReady(db);
  await db
    .insert(profile)
    .values({ id: OWNER, content, updatedAt: new Date() })
    .onConflictDoUpdate({ target: profile.id, set: { content, updatedAt: new Date() } });
}

export type NoteView = {
  id: string;
  memoryType: string;
  content: string;
  createdAt: string;
  foldedAt: string | null;
};

export async function listNotes(db: Database): Promise<NoteView[]> {
  await ensureReady(db);
  const rows = await db.select().from(memoryNotes).orderBy(desc(memoryNotes.createdAt)).limit(100);
  return rows.map((row) => ({
    id: row.id,
    memoryType: row.memoryType,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    foldedAt: row.foldedAt?.toISOString() ?? null,
  }));
}

export async function addNote(db: Database, memoryType: MemoryType, content: string): Promise<void> {
  await ensureReady(db);
  await db.insert(memoryNotes).values({
    id: crypto.randomUUID(),
    memoryType,
    content,
  });
}

export async function openNotes(db: Database): Promise<NoteView[]> {
  const notes = await listNotes(db);
  return notes.filter((note) => !note.foldedAt);
}

export async function markNotesFolded(db: Database, ids: string[], when = new Date()): Promise<void> {
  if (ids.length === 0) return;
  for (const id of ids) {
    await db.update(memoryNotes).set({ foldedAt: when }).where(eq(memoryNotes.id, id));
  }
}

export async function rememberChat(db: Database, chatId: string): Promise<void> {
  await ensureReady(db);
  await db
    .insert(ownerState)
    .values({ id: OWNER, telegramChatId: chatId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: ownerState.id,
      set: { telegramChatId: chatId, updatedAt: new Date() },
    });
}

export async function ownerChatId(db: Database): Promise<string | null> {
  await ensureReady(db);
  const [row] = await db.select().from(ownerState).where(eq(ownerState.id, OWNER));
  return row?.telegramChatId ?? null;
}

export async function openConfirmation(
  db: Database,
  chatId: string,
  payload: ConfirmationPayload,
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(confirmations).values({ id, chatId, payload });
  return id;
}

export async function takeConfirmation(
  db: Database,
  id: string,
): Promise<{ chatId: string; payload: ConfirmationPayload } | null> {
  const [row] = await db
    .update(confirmations)
    .set({ resolvedAt: new Date() })
    .where(and(eq(confirmations.id, id), isNull(confirmations.resolvedAt)))
    .returning({ chatId: confirmations.chatId, payload: confirmations.payload });
  return row ?? null;
}

export async function importDrafts(
  db: Database,
  source: NubankSource,
  drafts: NubankDraft[],
  categoriesByIndex: Map<number, string>,
): Promise<{ inserted: number; skipped: number; transfers: number }> {
  await ensureReady(db);
  let inserted = 0;
  let skipped = 0;
  let transfers = 0;
  for (const draft of drafts) {
    if (draft.kind === "transfer") transfers += 1;
    const categoryId =
      draft.kind === "transfer"
        ? null
        : (categoriesByIndex.get(draft.index) ?? (draft.kind === "income" ? "entrada" : "outros"));
    const result = await db
      .insert(transactions)
      .values({
        id: crypto.randomUUID(),
        kind: draft.kind,
        amountCents: draft.amountCents,
        categoryId,
        description: draft.description,
        occurredOn: draft.occurredOn,
        source,
        externalId: draft.externalId,
        confidence: draft.kind === "transfer" ? 100 : 80,
      })
      .onConflictDoNothing({ target: [transactions.source, transactions.externalId] })
      .returning({ id: transactions.id });
    if (result.length === 0) skipped += 1;
    else inserted += 1;
  }
  return { inserted, skipped, transfers };
}

export async function pendingTaskCount(db: Database): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`count(*)` })
    .from(tasks)
    .where(eq(tasks.status, "pending"));
  return Number(row?.total ?? 0);
}

function toTask(row: typeof tasks.$inferSelect): TaskView {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    notifyAt: row.notifyAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
