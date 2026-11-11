import type { Session } from "@ajudante/auth";
import type { Database } from "@ajudante/db";

import type { BrainServices } from "./brain/types";

export type Context = {
  session: Session | null;
  db: Database;
  brain: BrainServices;
  timeZone: string;
};
