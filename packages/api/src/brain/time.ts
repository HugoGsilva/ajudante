import { DEFAULT_TIMEZONE } from "./categories";

export type ZonedNow = {
  date: string;
  hour: number;
  minute: number;
  weekday: string;
};

export function zonedNow(timeZone = DEFAULT_TIMEZONE, now = new Date()): ZonedNow {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const hour = Number(parts.hour ?? "0");
  return {
    date: `${parts.year ?? "1970"}-${parts.month ?? "01"}-${parts.day ?? "01"}`,
    hour: hour === 24 ? 0 : hour,
    minute: Number(parts.minute ?? "0"),
    weekday: parts.weekday ?? "Sun",
  };
}

export function currentMonth(timeZone = DEFAULT_TIMEZONE, now = new Date()): string {
  return zonedNow(timeZone, now).date.slice(0, 7);
}

export function monthRange(month: string): { from: string; to: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("Mês inválido.");
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new Error("Mês inválido.");
  const from = `${match[1]}-${match[2]}-01`;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { from, to };
}

export function formatDateTimePt(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatWhen(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
