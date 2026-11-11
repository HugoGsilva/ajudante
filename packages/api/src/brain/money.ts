export function reaisToCents(value: number): number {
  return Math.round(value * 100);
}

export function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function parseBrlInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/^r\$/i, "");
  if (!cleaned) return null;
  const negative = cleaned.startsWith("-");
  const unsigned = cleaned.replace(/^[+-]/, "");
  let normalized = unsigned;
  if (unsigned.includes(",") && unsigned.includes(".")) {
    normalized =
      unsigned.lastIndexOf(",") > unsigned.lastIndexOf(".")
        ? unsigned.replace(/\./g, "").replace(",", ".")
        : unsigned.replace(/,/g, "");
  } else if (unsigned.includes(",")) {
    normalized = unsigned.replace(/\./g, "").replace(",", ".");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(Math.abs(value) * 100);
  return negative ? -cents : cents;
}
