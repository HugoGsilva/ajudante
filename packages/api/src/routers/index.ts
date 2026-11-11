import { dashboardRouter, memoryRouter } from "./dashboard";
import { financeRouter } from "./finance";
import { ideasRouter, tasksRouter } from "./tasks";
import { protectedProcedure, publicProcedure, router } from "../index";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  dashboard: dashboardRouter,
  finance: financeRouter,
  tasks: tasksRouter,
  ideas: ideasRouter,
  memory: memoryRouter,
});
export type AppRouter = typeof appRouter;
