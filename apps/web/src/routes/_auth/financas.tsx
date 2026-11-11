import { formatBrl } from "@ajudante/api/brain/money";
import { currentMonth, zonedNow } from "@ajudante/api/brain/time";
import { Button } from "@ajudante/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ajudante/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Input } from "@ajudante/ui/components/input";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/financas")({
  component: FinancePage,
});

function FinancePage() {
  const [month, setMonth] = useState(() => currentMonth());
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("outros");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => zonedNow().date);
  const [source, setSource] = useState<"nubank_account" | "nubank_card">("nubank_card");

  const categories = useQuery(trpc.finance.categories.queryOptions());
  const list = useQuery(trpc.finance.list.queryOptions({ month }));
  const options = kind === "expense" ? categories.data?.expense : categories.data?.income;

  const invalidate = async () => {
    await queryClient.invalidateQueries();
  };
  const create = useMutation(
    trpc.finance.create.mutationOptions({
      onSuccess: async () => {
        setAmount("");
        setDescription("");
        toast.success("Lançamento anotado.");
        await invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const update = useMutation(
    trpc.finance.update.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
  const importCsv = useMutation(
    trpc.finance.importNubank.mutationOptions({
      onSuccess: async (result) => {
        toast.success(
          `${result.inserted} novos, ${result.skipped} repetidos, ${result.transfers} transferências fora do saldo.`,
        );
        await invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Page title="Finanças">
      <div className="flex flex-wrap gap-4">
        <label className="flex w-40 flex-col gap-1 text-xs text-muted-foreground">
          Mês
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-8 border border-input bg-transparent px-2 text-xs text-foreground"
          />
        </label>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lançamento manual</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate({ kind, amount, categoryId, description, occurredOn });
            }}
          >
            <select
              value={kind}
              onChange={(event) => {
                const next = event.target.value === "income" ? "income" : "expense";
                setKind(next);
                setCategoryId(next === "income" ? "entrada" : "outros");
              }}
              className="h-8 border border-input bg-transparent px-2 text-xs"
            >
              <option value="expense">Gasto</option>
              <option value="income">Receita</option>
            </select>
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="12,50" />
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="h-8 border border-input bg-transparent px-2 text-xs"
            >
              {(options ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição"
            />
            <input
              type="date"
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
              className="h-8 border border-input bg-transparent px-2 text-xs"
            />
            <Button type="submit" disabled={create.isPending}>
              Anotar
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>CSV do Nubank</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            Fatura do cartão e extrato da conta são arquivos diferentes. O pagamento da fatura entra como
            transferência e não soma no gasto.
          </p>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value === "nubank_account" ? "nubank_account" : "nubank_card")}
            className="h-8 max-w-xs border border-input bg-transparent px-2 text-xs"
          >
            <option value="nubank_card">Fatura do cartão</option>
            <option value="nubank_account">Extrato da conta</option>
          </select>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={importCsv.isPending}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              importCsv.mutate({ csv: await file.text(), source });
            }}
            className="text-xs"
          />
        </CardContent>
      </Card>
      {list.isLoading ? <Skeleton className="h-40" /> : null}
      {list.isError ? <p className="text-sm text-destructive">{list.error.message}</p> : null}
      {list.data && list.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nada neste mês</EmptyTitle>
            <EmptyDescription>Os lançamentos confirmados aparecem aqui.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {list.data && list.data.length > 0 ? (
        <div className="flex flex-col divide-y divide-border border border-border">
          {list.data.map((row) => (
            <div key={row.id} className="grid gap-2 px-3 py-3 text-sm md:grid-cols-[7rem_1fr_10rem_8rem] md:items-center">
              <span className="text-muted-foreground">{row.occurredOn.split("-").reverse().join("/")}</span>
              <span>
                {row.description}
                <span className="ml-2 text-xs text-muted-foreground">{row.kind === "transfer" ? "transferência" : row.source}</span>
              </span>
              {row.kind === "transfer" ? (
                <span className="text-muted-foreground">Transferência</span>
              ) : (
                <select
                  value={row.categoryId ?? ""}
                  onChange={(event) =>
                    update.mutate({
                      id: row.id,
                      categoryId: event.target.value,
                      kind: row.kind === "income" ? "income" : "expense",
                    })
                  }
                  className="h-8 border border-input bg-transparent px-2 text-xs"
                >
                  {(row.kind === "income" ? categories.data?.income : categories.data?.expense)?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="md:text-right">
                {formatBrl(row.kind === "expense" ? -row.amountCents : row.amountCents)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Page>
  );
}
