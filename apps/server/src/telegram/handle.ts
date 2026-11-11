import { applyIntent } from "@ajudante/api/brain/apply";
import { categoryName } from "@ajudante/api/brain/categories";
import { parseCommand } from "@ajudante/api/brain/commands";
import { runCommand } from "@ajudante/api/brain/consult";
import { formatBrl } from "@ajudante/api/brain/money";
import { isTelegramOwner } from "@ajudante/api/brain/owner";
import { createTransaction, getProfile, rememberChat, takeConfirmation } from "@ajudante/api/brain/store";
import { formatWhen } from "@ajudante/api/brain/time";
import type { Database } from "@ajudante/db";

import type { Gemini } from "../llm/gemini";
import type { Telegram, TelegramUpdate } from "./api";

export type TurnConfig = {
  ownerId?: string;
  dashboardUrl: string;
  timeZone: string;
  thresholdCents: number;
  minConfidence: number;
};

export function createUpdateHandler(deps: {
  db: Database;
  telegram: Telegram;
  gemini: Gemini;
  config: TurnConfig;
}) {
  return async function handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.callback_query) {
      await handleCallback(deps, update);
      return;
    }
    const message = update.message;
    if (!message) return;
    if (!isTelegramOwner(message.from?.id, deps.config.ownerId)) return;
    const chatId = String(message.chat.id);
    await rememberChat(deps.db, chatId);
    try {
      if (message.text) {
        const command = parseCommand(message.text);
        if (command) {
          const text = await runCommand(deps.db, command, deps.config);
          await deps.telegram.sendMessage(chatId, text);
          return;
        }
      }
      const audioFile = message.voice ?? message.audio;
      const audio = audioFile ? await deps.telegram.download(audioFile.file_id) : undefined;
      if (audio && audioFile?.mime_type) audio.mimeType = audioFile.mime_type;
      if (!message.text && !audio) return;
      const intent = await deps.gemini.classify({
        text: message.text,
        audio,
        profile: await getProfile(deps.db),
        nowLabel: formatWhen(new Date().toISOString(), deps.config.timeZone),
      });
      const result = await applyIntent(deps.db, intent, deps.config, chatId);
      await deps.telegram.sendMessage(chatId, result.text, result.confirmationId);
    } catch (error) {
      console.error("telegram", error instanceof Error ? error.message : error);
      await deps.telegram.sendMessage(chatId, "Não consegui tratar isso agora. Tenta de novo.");
    }
  };
}

async function handleCallback(
  deps: { db: Database; telegram: Telegram; config: TurnConfig },
  update: TelegramUpdate,
): Promise<void> {
  const callback = update.callback_query;
  if (!callback) return;
  await deps.telegram.answerCallback(callback.id).catch(() => undefined);
  if (!isTelegramOwner(callback.from.id, deps.config.ownerId)) return;
  const chatId = String(callback.message?.chat.id ?? "");
  if (!chatId) return;
  await rememberChat(deps.db, chatId);
  const data = callback.data ?? "";
  const match = /^([yn]):([0-9a-f-]{36})$/i.exec(data);
  if (!match) return;
  const decision = match[1]?.toLowerCase();
  const id = match[2];
  if (!id) return;
  const pending = await takeConfirmation(deps.db, id);
  if (!pending) {
    await deps.telegram.sendMessage(chatId, "Essa confirmação já foi respondida.");
    return;
  }
  if (decision === "n") {
    await deps.telegram.sendMessage(chatId, "Cancelei. Manda de novo do jeito certo.");
    return;
  }
  await createTransaction(deps.db, {
    kind: pending.payload.kind,
    amountCents: pending.payload.amountCents,
    categoryId: pending.payload.categoryId,
    description: pending.payload.description,
    occurredOn: pending.payload.occurredOn,
    source: "telegram",
    confidence: pending.payload.confidence,
  });
  await deps.telegram.sendMessage(
    chatId,
    `Anotei ${formatBrl(pending.payload.amountCents)} em ${categoryName(pending.payload.categoryId)}.`,
  );
}
