import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createIdea, createTask, listIdeas, listTasks, setTaskStatus } from "../brain/store";
import { protectedProcedure, router } from "../index";

export const tasksRouter = router({
  list: protectedProcedure.query(({ ctx }) => listTasks(ctx.db)),
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().max(4000).optional(),
        notifyAt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.notifyAt && Number.isNaN(new Date(input.notifyAt).getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Data do aviso inválida." });
      }
      const id = await createTask(ctx.db, input);
      return { id };
    }),
  setStatus: protectedProcedure
    .input(z.object({ id: z.string().min(1), status: z.enum(["pending", "done"]) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await setTaskStatus(ctx.db, input.id, input.status);
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error instanceof Error ? error.message : "Tarefa não encontrada.",
        });
      }
      return { ok: true };
    }),
});

export const ideasRouter = router({
  list: protectedProcedure.query(({ ctx }) => listIdeas(ctx.db)),
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(200), content: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const id = await createIdea(ctx.db, input);
      return { id };
    }),
});
