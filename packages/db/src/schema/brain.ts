import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type ConfirmationPayload = {
  kind: "expense" | "income";
  amountCents: number;
  categoryId: string;
  description: string;
  occurredOn: string;
  confidence: number;
};

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    amountCents: integer("amount_cents").notNull(),
    categoryId: text("category_id").references(() => categories.id),
    description: text("description").notNull(),
    occurredOn: date("occurred_on").notNull(),
    source: text("source").notNull(),
    externalId: text("external_id"),
    confidence: integer("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("transactions_occurred_on_idx").on(table.occurredOn),
    index("transactions_category_idx").on(table.categoryId),
    uniqueIndex("transactions_source_external_idx").on(table.source, table.externalId),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content"),
    status: text("status").notNull().default("pending"),
    notifyAt: timestamp("notify_at", { withTimezone: true }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("tasks_notify_at_idx").on(table.notifyAt)],
);

export const ideas = pgTable("ideas", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profile = pgTable("profile", {
  id: text("id").primaryKey(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memoryNotes = pgTable("memory_notes", {
  id: text("id").primaryKey(),
  memoryType: text("memory_type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  foldedAt: timestamp("folded_at", { withTimezone: true }),
});

export const confirmations = pgTable("confirmations", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  payload: jsonb("payload").$type<ConfirmationPayload>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const ownerState = pgTable("owner_state", {
  id: text("id").primaryKey(),
  telegramChatId: text("telegram_chat_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
