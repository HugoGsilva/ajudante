export function monthTitle(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, monthNumber - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}
