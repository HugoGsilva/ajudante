import { createAuth } from "@ajudante/auth";
import { createDb } from "@ajudante/db";
import { DEFAULT_TIMEZONE } from "@ajudante/api/brain/categories";

import { ENV } from "./env.server";
import { createGemini } from "./llm/gemini";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
export const timeZone = ENV.APP_TIMEZONE || DEFAULT_TIMEZONE;

export const gemini = createGemini({
  apiKey: ENV.GEMINI_API_KEY || undefined,
  model: ENV.GEMINI_MODEL,
  timeZone,
});

export const brain = {
  mapCategories: (rows: Parameters<typeof gemini.mapCategories>[0]) => gemini.mapCategories(rows),
};

function integerEnv(value: string | number | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const turnConfig = {
  ownerId: ENV.TELEGRAM_OWNER_ID || undefined,
  dashboardUrl: ENV.DASHBOARD_URL,
  timeZone,
  thresholdCents: integerEnv(ENV.EXPENSE_CONFIRM_CENTS, 10_000),
  minConfidence: integerEnv(ENV.CONFIDENCE_MIN, 70),
};

