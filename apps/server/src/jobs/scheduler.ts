import { dashboardSummary } from "@ajudante/api/brain/consult";
import { formatBrl } from "@ajudante/api/brain/money";
import {
  dueReminders,
  getProfile,
  markNotesFolded,
  markNotified,
  openNotes,
  ownerChatId,
  replaceProfile,
} from "@ajudante/api/brain/store";
import { currentMonth, formatDateTimePt, zonedNow } from "@ajudante/api/brain/time";
import type { Database } from "@ajudante/db";

import type { Gemini } from "../llm/gemini";
import type { Telegram } from "../telegram/api";

const SCHEDULER_FLAG = "__ajudanteScheduler";

export function startScheduler(deps: {
  db: Database;
  gemini: Gemini;
  telegram: Telegram | null;
  timeZone: string;
}) {
  const flag = globalThis as typeof globalThis & { [SCHEDULER_FLAG]?: boolean };
  if (flag[SCHEDULER_FLAG]) return;
  flag[SCHEDULER_FLAG] = true;
  let lastMinute = "";
  const timer = setInterval(() => {
    const now = zonedNow(deps.timeZone);
    const key = `${now.date}T${now.hour}:${now.minute}`;
    if (key === lastMinute) return;
    lastMinute = key;
    void runReminders(deps).catch(logJob);
    if (now.hour === 8 && now.minute === 0) void runBriefing(deps).catch(logJob);
    if (now.weekday === "Sun" && now.hour === 3 && now.minute === 0) void runCompression(deps).catch(logJob);
  }, 20_000);
  timer.unref?.();
}

async function runReminders(deps: { db: Database; telegram: Telegram | null }) {
  if (!deps.telegram) return;
  const chatId = await ownerChatId(deps.db);
  if (!chatId) return;
  const due = await dueReminders(deps.db);
  for (const task of due) {
    await deps.telegram.sendMessage(chatId, `🔔 Lembrete: ${task.title}`);
    await markNotified(deps.db, task.id);
  }
}

async function runBriefing(deps: {
  db: Database;
  gemini: Gemini;
  telegram: Telegram | null;
  timeZone: string;
}) {
  if (!deps.telegram) return;
  const chatId = await ownerChatId(deps.db);
  if (!chatId) return;
  const summary = await dashboardSummary(deps.db, currentMonth(deps.timeZone), deps.timeZone);
  const lines = [
    `Mês ${summary.month}`,
    `Entradas ${formatBrl(summary.incomeCents)}`,
    `Gastos ${formatBrl(summary.expenseCents)}`,
    `Saldo ${formatBrl(summary.balanceCents)}`,
    `Pendências: ${summary.pendingTasks}`,
    summary.tasksToday.length
      ? summary.tasksToday
          .map((task) => `• ${task.title}${task.notifyAt ? ` (${formatDateTimePt(task.notifyAt, deps.timeZone)})` : ""}`)
          .join("\n")
      : "Nenhuma tarefa com aviso hoje.",
  ];
  const text = await deps.gemini.writeBriefing(lines.join("\n"));
  await deps.telegram.sendMessage(chatId, text);
}

async function runCompression(deps: { db: Database; gemini: Gemini }) {
  const notes = await openNotes(deps.db);
  if (notes.length === 0) return;
  const next = await deps.gemini.compressProfile(
    await getProfile(deps.db),
    notes.map((note) => note.content),
  );
  if (!next) return;
  await replaceProfile(deps.db, next);
  await markNotesFolded(
    deps.db,
    notes.map((note) => note.id),
  );
}

function logJob(error: unknown) {
  console.error("job", error instanceof Error ? error.message : error);
}
