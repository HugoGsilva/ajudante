export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const EXPENSE_CATEGORIES = [
  { id: "alimentacao", name: "Alimentação" },
  { id: "mercado", name: "Mercado" },
  { id: "transporte", name: "Transporte" },
  { id: "moradia", name: "Moradia" },
  { id: "contas", name: "Contas" },
  { id: "saude", name: "Saúde" },
  { id: "educacao", name: "Educação" },
  { id: "lazer", name: "Lazer" },
  { id: "assinaturas", name: "Assinaturas" },
  { id: "compras", name: "Compras" },
  { id: "impostos", name: "Impostos" },
  { id: "outros", name: "Outros" },
] as const;

export const INCOME_CATEGORIES = [
  { id: "salario", name: "Salário" },
  { id: "freelance", name: "Freelance" },
  { id: "rendimento", name: "Rendimento" },
  { id: "entrada", name: "Outras entradas" },
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]["id"];
export type IncomeCategoryId = (typeof INCOME_CATEGORIES)[number]["id"];

const expenseIds = new Set<string>(EXPENSE_CATEGORIES.map((item) => item.id));
const incomeIds = new Set<string>(INCOME_CATEGORIES.map((item) => item.id));

export function categoryName(id: string | null | undefined): string {
  const found = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find((item) => item.id === id);
  return found?.name ?? "Sem categoria";
}

export function resolveCategory(
  kind: "expense" | "income",
  raw: string | undefined,
): { id: string; known: boolean } {
  const token = normalizeLabel(raw ?? "");
  const list = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const found = list.find((item) => item.id === token || normalizeLabel(item.name) === token);
  if (found) return { id: found.id, known: true };
  return { id: kind === "expense" ? "outros" : "entrada", known: false };
}

export function isKnownCategory(kind: "expense" | "income", id: string): boolean {
  return kind === "expense" ? expenseIds.has(id) : incomeIds.has(id);
}

export function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
