import { isTelegramOwner, needsConfirmation } from "./owner";
import { parseBrlInput } from "./money";
import { parseCommand } from "./commands";
import { normalizeIntent } from "./intents";
import { parseNubankCsv } from "./nubank";

import { describe, expect, test } from "bun:test";

describe("trava do telegram", () => {
  test("descarta quando o id do dono não está definido", () => {
    expect(isTelegramOwner(1, undefined)).toBe(false);
    expect(isTelegramOwner(1, "")).toBe(false);
  });

  test("só aceita o id exato", () => {
    expect(isTelegramOwner(42, "42")).toBe(true);
    expect(isTelegramOwner(7, "42")).toBe(false);
    expect(isTelegramOwner(undefined, "42")).toBe(false);
  });
});

describe("confirmação", () => {
  const base = { kind: "expense" as const, thresholdCents: 10_000, minConfidence: 70, categoryKnown: true };
  test("pede acima do limite ou com pouca confiança", () => {
    expect(needsConfirmation({ ...base, amountCents: 10_000, confidence: 90 })).toBe(true);
    expect(needsConfirmation({ ...base, amountCents: 2_000, confidence: 69 })).toBe(true);
    expect(needsConfirmation({ ...base, amountCents: 2_000, confidence: 70 })).toBe(false);
    expect(needsConfirmation({ ...base, categoryKnown: false, amountCents: 100, confidence: 99 })).toBe(true);
    expect(needsConfirmation({ ...base, kind: "income", amountCents: 50_000, confidence: 10 })).toBe(false);
  });
});

describe("dinheiro", () => {
  test("lê real com vírgula ou ponto", () => {
    expect(parseBrlInput("100,00")).toBe(10_000);
    expect(parseBrlInput("R$ 1.234,56")).toBe(123_456);
    expect(parseBrlInput("-89.90")).toBe(-8990);
    expect(parseBrlInput("abc")).toBeNull();
  });
});

describe("comandos", () => {
  test("ignora o nome do bot", () => {
    expect(parseCommand("/hoje@AjudanteBot")).toBe("hoje");
    expect(parseCommand("gastei 10")).toBeNull();
  });
});

describe("intenção", () => {
  test("normaliza o JSON do modelo", () => {
    const intent = normalizeIntent({
      intent: "gasto",
      amount: "12,5",
      category: "mercado",
      confidence: 0.8,
      reply: "ok",
      new_context: "compra no sábado",
    });
    expect(intent?.intent).toBe("GASTO");
    expect(intent?.amountReais).toBe(12.5);
    expect(intent?.confidence).toBe(80);
    expect(intent?.memoryType).toBe("fact");
  });
});

describe("csv do nubank", () => {
  test("separa conta, gasto e pagamento de fatura", () => {
    const csv = [
      "Data,Valor,Identificador,Descrição",
      "05/10/2026,4500.00,abc,Transferência recebida",
      "07/10/2026,-89.90,def,Pagamento de boleto",
      "10/10/2026,-1230.45,ghi,Pagamento de fatura",
    ].join("\n");
    const rows = parseNubankCsv(csv, "nubank_account");
    expect(rows.map((row) => row.kind)).toEqual(["income", "expense", "transfer"]);
    expect(rows[0]?.externalId).toBe("abc");
    expect(rows[1]?.amountCents).toBe(8990);
  });

  test("lê a fatura do cartão e ignora o pagamento recebido no saldo", () => {
    const csv = [
      "date,title,amount",
      "2026-09-28,Mercado,312.40",
      "2026-10-10,Pagamento recebido,-1230.45",
      '2026-10-02,"Loja, parcela 3/10",120.00',
    ].join("\n");
    const rows = parseNubankCsv(csv, "nubank_card");
    expect(rows.map((row) => row.kind)).toEqual(["expense", "transfer", "expense"]);
    expect(rows[2]?.description).toBe("Loja, parcela 3/10");
    expect(rows[0]?.occurredOn).toBe("2026-09-28");
  });
});
