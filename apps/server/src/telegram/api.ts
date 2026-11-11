export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallback;
};

type TelegramMessage = {
  message_id: number;
  from?: { id: number };
  chat: { id: number };
  text?: string;
  voice?: { file_id: string; mime_type?: string };
  audio?: { file_id: string; mime_type?: string };
};

type TelegramCallback = {
  id: string;
  from: { id: number };
  data?: string;
  message?: { chat: { id: number }; message_id?: number };
};

export function createTelegram(token: string) {
  const base = `https://api.telegram.org/bot${token}`;

  async function call<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(body ? `${base}/${method}` : `${base}/${method}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(35_000),
    });
    const payload = (await response.json()) as { ok: boolean; description?: string; result?: T };
    if (!payload.ok) throw new Error(payload.description || `Telegram ${method} falhou.`);
    return payload.result as T;
  }

  return {
    sendMessage(chatId: string | number, text: string, confirmationId?: string) {
      return call("sendMessage", {
        chat_id: chatId,
        text: text.slice(0, 4000),
        reply_markup: confirmationId
          ? {
              inline_keyboard: [
                [
                  { text: "Sim", callback_data: `y:${confirmationId}` },
                  { text: "Cancelar", callback_data: `n:${confirmationId}` },
                ],
              ],
            }
          : undefined,
      });
    },
    answerCallback(callbackId: string) {
      return call("answerCallbackQuery", { callback_query_id: callbackId });
    },
    async download(fileId: string): Promise<{ mimeType: string; bytes: Uint8Array }> {
      const file = await call<{ file_path?: string }>("getFile", { file_id: fileId });
      if (!file.file_path) throw new Error("Telegram não devolveu o arquivo.");
      const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error("Falha ao baixar o áudio.");
      const bytes = new Uint8Array(await response.arrayBuffer());
      const mimeType = file.file_path.endsWith(".mp3") ? "audio/mpeg" : "audio/ogg";
      return { mimeType, bytes };
    },
    getUpdates(offset: number) {
      return call<TelegramUpdate[]>("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message", "callback_query"],
      });
    },
    setWebhook(url: string, secret?: string) {
      return call("setWebhook", {
        url,
        secret_token: secret || undefined,
        allowed_updates: ["message", "callback_query"],
      });
    },
    deleteWebhook() {
      return call("deleteWebhook", { drop_pending_updates: false });
    },
  };
}

export type Telegram = ReturnType<typeof createTelegram>;
