import type { Database } from "@ajudante/db";

import { categoryName, resolveCategory } from "./categories";
import { helpText } from "./commands";
import { formatBrl } from "./money";
import { expenseByCategory, getProfile, listIdeas, listTasks, pendingTaskCount, sumKind, tasksOnDay } from "./store";
import { currentMonth, formatDateTimePt, monthRange, zonedNow } from "./time";
import type { ConsultSubject } from "./intents";

export async function dashboardSummary(db: Database, month: string, timeZone: string) {
  const range = monthRange(month);
  const [incomeCents, expenseCents, byCategory, pendingTasks, tasksToday] = await Promise.all([
    sumKind(db, "income", range),
    sumKind(db, "expense", range),
    expenseByCategory(db, range),
    pendingTaskCount(db),
    tasksOnDay(db, zonedNow(timeZone).date, timeZone),
  ]);
  return {
    month,
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    byCategory,
    pendingTasks,
    tasksToday: tasksToday.map((task) => ({ id: task.id, title: task.title, notifyAt: task.notifyAt })),
  };
}

export async function answerConsult(
  db: Database,
  input: {
    subject: ConsultSubject;
    categoryFilter?: string;
    from?: string;
    to?: string;
    timeZone: string;
  },
): Promise<string> {
  if (input.subject === "tarefas") {
    const pending = (await listTasks(db)).filter((task) => task.status === "pending");
    if (pending.length === 0) return "Nenhuma tarefa pendente.";
    return pending
      .slice(0, 12)
      .map((task) => `• ${task.title}${task.notifyAt ? ` — ${formatDateTimePt(task.notifyAt, input.timeZone)}` : ""}`)
      .join("\n");
  }
  if (input.subject === "ideias") {
    const notes = await listIdeas(db);
    if (notes.length === 0) return "Nenhuma ideia guardada.";
    return notes
      .slice(0, 8)
      .map((idea) => `• ${idea.title}`)
      .join("\n");
  }
  const month = input.from?.slice(0, 7) ?? currentMonth(input.timeZone);
  const range = input.from && input.to ? { from: input.from, to: nextDay(input.to) } : monthRange(month);
  const category = input.categoryFilter
    ? resolveCategory("expense", input.categoryFilter)
    : undefined;
  if (input.subject === "gastos") {
    if (category) {
      const total = await sumKind(db, "expense", range, category.id);
      return `${categoryName(category.id)}: ${formatBrl(total)}.`;
    }
    const groups = await expenseByCategory(db, range);
    const total = groups.reduce((sum, item) => sum + item.totalCents, 0);
    if (groups.length === 0) return "Nenhum gasto nesse período.";
    const lines = groups.slice(0, 6).map((item) => `• ${item.name}: ${formatBrl(item.totalCents)}`);
    return [`Gastos: ${formatBrl(total)}.`, ...lines].join("\n");
  }
  const income = await sumKind(db, "income", range);
  const expense = await sumKind(db, "expense", range);
  const label = input.from && input.to ? `${input.from} a ${input.to}` : month;
  return [
    label,
    `Entradas ${formatBrl(income)}`,
    `Gastos ${formatBrl(expense)}`,
    `Saldo ${formatBrl(income - expense)}`,
  ].join("\n");
}

export async function runCommand(
  db: Database,
  name: string,
  opts: { dashboardUrl: string; timeZone: string },
): Promise<string> {
  const today = zonedNow(opts.timeZone);
  if (name === "ajuda" || name === "start" || name === "help") return helpText();
  if (name === "dashboard") return `Painel: ${opts.dashboardUrl}`;
  if (name === "contexto") {
    const text = await getProfile(db);
    return text.trim() ? text : "O perfil ainda está vazio.";
  }
  if (name === "hoje") {
    const tasksToday = await tasksOnDay(db, today.date, opts.timeZone);
    const spent = await sumKind(db, "expense", { from: today.date, to: nextDay(today.date) });
    const lines = [`Hoje, ${today.date.split("-").reverse().join("/")}. Gasto: ${formatBrl(spent)}.`];
    if (tasksToday.length === 0) lines.push("Nenhuma tarefa com aviso hoje.");
    else lines.push(...tasksToday.map((task) => `• ${task.title}`));
    return lines.join("\n");
  }
  if (name === "saldo") {
    return answerConsult(db, { subject: "saldo", timeZone: opts.timeZone });
  }
  if (name === "tarefas") {
    return answerConsult(db, { subject: "tarefas", timeZone: opts.timeZone });
  }
  return "Não conheço esse comando. /ajuda";
}

function nextDay(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
