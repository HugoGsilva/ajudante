export function parseCommand(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const head = trimmed.slice(1).split(/\s+/)[0]?.split("@")[0]?.toLowerCase();
  return head || null;
}

const HELP = [
  "Comandos, sem chamar o modelo:",
  "/hoje — tarefas do dia e gasto de hoje",
  "/saldo — entradas, gastos e saldo do mês",
  "/tarefas — pendências",
  "/contexto — o que está no perfil",
  "/dashboard — link do painel",
  "/ajuda — esta lista",
].join("\n");

export function helpText(): string {
  return HELP;
}
