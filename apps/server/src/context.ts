import type { Context as ApiContext } from "@ajudante/api/context";
import type { Context as HonoContext } from "hono";

import { auth, brain, db, timeZone } from "./services";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions): Promise<ApiContext> {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    db,
    session,
    brain,
    timeZone,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
