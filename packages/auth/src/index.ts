import type { Database } from "@ajudante/db";
import * as schema from "@ajudante/db/schema/auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
};

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = [],
) {
  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: env.BETTER_AUTH_URL.startsWith("https://") ? "none" : "lax",
        secure: env.BETTER_AUTH_URL.startsWith("https://"),
        httpOnly: true,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const existing = await database.select({ id: schema.user.id }).from(schema.user).limit(1);
            if (existing.length > 0) {
              throw new APIError("FORBIDDEN", {
                message: "Já existe um dono. O cadastro está fechado.",
              });
            }
            return { data: user };
          },
        },
      },
    },
    plugins: [],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];

export { ensureOwnerAccount } from "./owner";
