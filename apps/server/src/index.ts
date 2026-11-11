import { appRouter } from "@ajudante/api/routers/index";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { createContext } from "./context";
import { ENV } from "./env.server";
import { startScheduler } from "./jobs/scheduler";
import { auth, db, gemini, turnConfig } from "./services";
import { createTelegram, type TelegramUpdate } from "./telegram/api";
import { createUpdateHandler } from "./telegram/handle";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: ENV.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", async (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

const telegram = ENV.TELEGRAM_BOT_TOKEN ? createTelegram(ENV.TELEGRAM_BOT_TOKEN) : null;
const handleUpdate = telegram
  ? createUpdateHandler({ db, telegram, gemini, config: turnConfig })
  : null;

app.post("/telegram/webhook", async (c) => {
  if (ENV.TELEGRAM_MODE !== "webhook" || !handleUpdate) return c.body(null, 200);
  if (ENV.TELEGRAM_WEBHOOK_SECRET && c.req.header("x-telegram-bot-api-secret-token") !== ENV.TELEGRAM_WEBHOOK_SECRET) {
    return c.body(null, 401);
  }
  const update = await c.req.json<TelegramUpdate>().catch(() => null);
  if (update && typeof update.update_id === "number") await handleUpdate(update);
  return c.body(null, 200);
});

app.get("/", (c) => {
  return c.text("OK");
});

if (telegram && ENV.TELEGRAM_MODE === "polling" && handleUpdate) {
  void telegram.deleteWebhook().catch((error: unknown) => {
    console.error("deleteWebhook", error instanceof Error ? error.message : error);
  });
  void poll(telegram, handleUpdate);
}

if (telegram && ENV.TELEGRAM_MODE === "webhook") {
  if (!ENV.TELEGRAM_WEBHOOK_URL) {
    console.error("TELEGRAM_MODE=webhook exige TELEGRAM_WEBHOOK_URL.");
  } else {
    void telegram.setWebhook(ENV.TELEGRAM_WEBHOOK_URL, ENV.TELEGRAM_WEBHOOK_SECRET).catch((error: unknown) => {
      console.error("setWebhook", error instanceof Error ? error.message : error);
    });
  }
}

startScheduler({ db, gemini, telegram, timeZone: turnConfig.timeZone });

async function poll(
  client: NonNullable<typeof telegram>,
  handle: (update: TelegramUpdate) => Promise<void>,
) {
  let offset = 0;
  for (;;) {
    try {
      const updates = await client.getUpdates(offset);
      for (const update of updates) {
        offset = update.update_id + 1;
        await handle(update);
      }
    } catch (error) {
      console.error("poll", error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

const port = Number(process.env.PORT || 3000);

export default {
  port,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};
