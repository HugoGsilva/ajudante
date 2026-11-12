import { formatBrl } from "@ajudante/api/brain/money";
import { currentMonth, zonedNow } from "@ajudante/api/brain/time";
import { Button } from "@ajudante/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Input } from "@ajudante/ui/components/input";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { controlClass } from "@/components/control";
import { Page } from "@/components/page";
import { monthTitle } from "@/lib/month";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/financas")({
  component: FinancePage,
});

function FinancePage() {
  const [month, setMonth] = useState(() => currentMonth());
  const [adding, setAdding] = useState(false);
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
        setAdding(false);
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
    <Page
      title={monthTitle(month)}
      action={
        <input
          type="month"
          aria-label="Mês"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className={`${controlClass} w-40`}
        />
      }
    >
      {adding ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate({ kind, amount, categoryId, description, occurredOn });
          }}
        >
          <select
            value={kind}
            aria-label="Tipo"
            onChange={(event) => {
              const next = event.target.value === "income" ? "income" : "expense";
              setKind(next);
              setCategoryId(next === "income" ? "entrada" : "outros");
            }}
            className={controlClass}
          >
            <option value="expense">Gasto</option>
            <option value="income">Receita</option>
          </select>
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="12,50"
            inputMode="decimal"
            aria-label="Valor"
          />
          <select
            value={categoryId}
            aria-label="Categoria"
            onChange={(event) => setCategoryId(event.target.value)}
            className={controlClass}
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
            aria-label="Descrição"
          />
          <input
            type="date"
            aria-label="Data"
            value={occurredOn}
            onChange={(event) => setOccurredOn(event.target.value)}
            className={controlClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Anotar
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" className="w-full" onClick={() => setAdding(true)}>
          Anotar lançamento
        </Button>
      )}

      {list.isLoading ? <Skeleton className="h-40" /> : null}
      {list.isError ? <p className="text-sm text-destructive">{list.error.message}</p> : null}
      {list.data && list.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nada neste mês</EmptyTitle>
            <EmptyDescription>Um lançamento anotado aparece aqui.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {list.data && list.data.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {list.data.map((row) => (
            <li key={row.id} className="flex flex-col gap-2 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm">{row.description}</p>
                <p className="font-mono text-sm">
                  {formatBrl(row.kind === "expense" ? -row.amountCents : row.amountCents)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {row.occurredOn.split("-").reverse().join("/")}
                {" · "}
                {row.kind === "transfer" ? "transferência" : row.source}
              </p>
              {row.kind === "transfer" ? null : (
                <select
                  aria-label={`Categoria de ${row.description}`}
                  value={row.categoryId ?? ""}
                  onChange={(event) =>
                    update.mutate({
                      id: row.id,
                      categoryId: event.target.value,
                      kind: row.kind === "income" ? "income" : "expense",
                    })
                  }
                  className={controlClass}
                >
                  {(row.kind === "income" ? categories.data?.income : categories.data?.expense)?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Importar CSV do Nubank</summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-muted-foreground">
            Fatura do cartão e extrato da conta são arquivos diferentes. O pagamento da fatura entra como
            transferência e não soma no gasto.
          </p>
          <select
            aria-label="Tipo de CSV"
            value={source}
            onChange={(event) => setSource(event.target.value === "nubank_account" ? "nubank_account" : "nubank_card")}
            className={controlClass}
          >
            <option value="nubank_card">Fatura do cartão</option>
            <option value="nubank_account">Extrato da conta</option>
          </select>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Arquivo CSV"
            disabled={importCsv.isPending}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              importCsv.mutate({ csv: await file.text(), source });
            }}
            className="text-base"
          />
        </div>
      </details>
    </Page>
  );
}
