import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, isKnownCategory } from "../brain/categories";
import { parseBrlInput } from "../brain/money";
import { parseNubankCsv, type NubankSource } from "../brain/nubank";
import { createTransaction, importDrafts, listTransactions, updateTransaction } from "../brain/store";
import { protectedProcedure, router } from "../index";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sourceSchema = z.enum(["nubank_account", "nubank_card"]);

export const financeRouter = router({
  categories: protectedProcedure.query(() => ({
    expense: EXPENSE_CATEGORIES,
    income: INCOME_CATEGORIES,
  })),
  list: protectedProcedure
    .input(z.object({ month: monthSchema.optional(), categoryId: z.string().optional() }))
    .query(({ ctx, input }) => listTransactions(ctx.db, input)),
  create: protectedProcedure
    .input(
      z.object({
        kind: z.enum(["expense", "income"]),
        amount: z.string().min(1),
        categoryId: z.string().min(1),
        description: z.string().min(1).max(500),
        occurredOn: daySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const amountCents = parseBrlInput(input.amount);
      if (amountCents === null || amountCents <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Valor inválido." });
      }
      if (!isKnownCategory(input.kind, input.categoryId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Categoria inválida." });
      }
      const id = await createTransaction(ctx.db, {
        kind: input.kind,
        amountCents,
        categoryId: input.categoryId,
        description: input.description.trim(),
        occurredOn: input.occurredOn,
        source: "web",
        confidence: 100,
      });
      return { id };
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        kind: z.enum(["expense", "income"]).optional(),
        amount: z.string().min(1).optional(),
        categoryId: z.string().min(1).optional(),
        description: z.string().min(1).max(500).optional(),
        occurredOn: daySchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let amountCents: number | undefined;
      if (input.amount) {
        const parsed = parseBrlInput(input.amount);
        if (parsed === null || parsed <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Valor inválido." });
        }
        amountCents = parsed;
      }
      if (input.kind && input.categoryId && !isKnownCategory(input.kind, input.categoryId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Categoria inválida." });
      }
      try {
        await updateTransaction(ctx.db, input.id, {
          kind: input.kind,
          amountCents,
          categoryId: input.categoryId,
          description: input.description?.trim(),
          occurredOn: input.occurredOn,
        });
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error instanceof Error ? error.message : "Lançamento não encontrado.",
        });
      }
      return { ok: true };
    }),
  importNubank: protectedProcedure
    .input(z.object({ csv: z.string().min(1).max(2_000_000), source: sourceSchema }))
    .mutation(async ({ ctx, input }) => {
      let drafts;
      try {
        drafts = parseNubankCsv(input.csv, input.source);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "CSV inválido.",
        });
      }
      const categorized = drafts.filter((draft) => draft.kind !== "transfer");
      const mapped = new Map<number, string>();
      for (const chunk of chunks(categorized, 50)) {
        const result = await ctx.brain.mapCategories(
          chunk.map((draft) => ({
            index: draft.index,
            description: draft.description,
            amountCents: draft.amountCents,
            kind: draft.kind as "expense" | "income",
          })),
        );
        for (const item of result) mapped.set(item.index, item.categoryId);
      }
      return importDrafts(ctx.db, input.source as NubankSource, drafts, mapped);
    }),
});

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
