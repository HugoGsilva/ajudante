import { z } from "zod";

import { dashboardSummary } from "../brain/consult";
import { getProfile, listNotes } from "../brain/store";
import { currentMonth } from "../brain/time";
import { protectedProcedure, router } from "../index";

export const dashboardRouter = router({
  summary: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }))
    .query(({ ctx, input }) => {
      const month = input.month ?? currentMonth(ctx.timeZone);
      return dashboardSummary(ctx.db, month, ctx.timeZone);
    }),
});

export const memoryRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => ({
    profile: await getProfile(ctx.db),
    notes: await listNotes(ctx.db),
  })),
});
