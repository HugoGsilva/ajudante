import { normalizeLabel } from "./categories";
import { parseBrlInput } from "./money";

export type NubankSource = "nubank_account" | "nubank_card";

export type NubankDraft = {
  index: number;
  occurredOn: string;
  description: string;
  amountCents: number;
  kind: "expense" | "income" | "transfer";
  externalId: string;
};

export function parseNubankCsv(csv: string, source: NubankSource): NubankDraft[] {
  const rows = parseCsv(csv);
  const header = rows[0];
  if (!header || rows.length < 2) throw new Error("O CSV está vazio.");
  const columns = header.map((cell) => normalizeLabel(cell));

  if (source === "nubank_account") {
    const date = columnIndex(columns, ["data"]);
    const amount = columnIndex(columns, ["valor"]);
    const description = columnIndex(columns, ["descricao"]);
    const identifier = columnIndex(columns, ["identificador"]);
    if (date < 0 || amount < 0 || description < 0) {
      throw new Error("Esse CSV não parece o extrato da conta. Esperava Data, Valor e Descrição.");
    }
    return collect(rows.slice(1), (cells, index) => {
      const signed = parseBrlInput(cells[amount] ?? "");
      const occurredOn = parseDay(cells[date] ?? "");
      const text = (cells[description] ?? "").trim();
      if (signed === null || signed === 0 || !occurredOn || !text) return null;
      const fatura = /pagamento de fatura/i.test(text);
      const kind = fatura ? "transfer" : signed > 0 ? "income" : "expense";
      const bankId = identifier >= 0 ? (cells[identifier] ?? "").trim() : "";
      return {
        index,
        occurredOn,
        description: text,
        amountCents: Math.abs(signed),
        kind,
        externalId: bankId || stableId(`${occurredOn}|${text}|${signed}`),
      };
    });
  }

  const date = columnIndex(columns, ["date"]);
  const amount = columnIndex(columns, ["amount"]);
  const title = columnIndex(columns, ["title"]);
  if (date < 0 || amount < 0 || title < 0) {
    throw new Error("Esse CSV não parece a fatura do cartão. Esperava date, title e amount.");
  }
  return collect(rows.slice(1), (cells, index) => {
    const signed = parseBrlInput(cells[amount] ?? "");
    const occurredOn = parseDay(cells[date] ?? "");
    const text = (cells[title] ?? "").trim();
    if (signed === null || signed === 0 || !occurredOn || !text) return null;
    const payment = /pagamento recebido/i.test(text);
    const kind = payment ? "transfer" : signed < 0 ? "income" : "expense";
    return {
      index,
      occurredOn,
      description: text,
      amountCents: Math.abs(signed),
      kind,
      externalId: stableId(`${occurredOn}|${text}|${signed}`),
    };
  });
}

function collect(
  rows: string[][],
  map: (cells: string[], index: number) => NubankDraft | null,
): NubankDraft[] {
  const drafts: NubankDraft[] = [];
  rows.forEach((cells, index) => {
    if (cells.every((cell) => cell.trim() === "")) return;
    const draft = map(cells, index);
    if (draft) drafts.push(draft);
  });
  return drafts;
}

function columnIndex(columns: string[], names: string[]): number {
  return columns.findIndex((column) => names.includes(column));
}

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const first = input.split("\n").find((line) => line.trim()) ?? "";
  const commas = first.split(",").length;
  const semis = first.split(";").length;
  const delimiter = semis > commas ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char ?? "";
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char ?? "";
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim() !== ""));
}

function parseDay(raw: string): string | null {
  const value = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}
