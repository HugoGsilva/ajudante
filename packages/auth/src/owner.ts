import type { Database } from "@ajudante/db";
import * as schema from "@ajudante/db/schema/auth";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import type { createAuth } from "./index";

type Auth = ReturnType<typeof createAuth>;

export async function ensureOwnerAccount(
  auth: Auth,
  database: Database,
  input: { email?: string; password?: string; name?: string },
) {
  const email = input.email?.trim().toLowerCase();
  const password = input.password ?? "";
  if (!email || password.length < 8) return;

  const hashed = await hashPassword(password);
  if (!hashed.includes(":")) throw new Error("Hash de senha inesperado.");
  const existing = await database.select().from(schema.user).limit(1);
  const name = input.name?.trim() || "Hugo";

  if (existing.length === 0) {
    const id = crypto.randomUUID();
    await database.insert(schema.user).values({
      id,
      name,
      email,
      emailVerified: true,
    });
    await database.insert(schema.account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: hashed,
    });
    return;
  }

  const owner = existing[0];
  if (!owner) return;
  await database
    .update(schema.user)
    .set({ email, name, emailVerified: true })
    .where(eq(schema.user.id, owner.id));

  const accounts = await database.select().from(schema.account).where(eq(schema.account.userId, owner.id));
  const credential = accounts.find((item) => item.providerId === "credential");
  if (credential) {
    await database
      .update(schema.account)
      .set({ password: hashed, accountId: owner.id })
      .where(eq(schema.account.id, credential.id));
    return;
  }

  await database.insert(schema.account).values({
    id: crypto.randomUUID(),
    accountId: owner.id,
    providerId: "credential",
    userId: owner.id,
    password: hashed,
  });
}
