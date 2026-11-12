import { formatBrl } from "@ajudante/api/brain/money";
import { currentMonth, zonedNow } from "@ajudante/api/brain/time";
import { Button } from "@ajudante/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader } from "@ajudante/ui/components/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@ajudante/ui/components/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ajudante/ui/components/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Field, FieldGroup, FieldLabel } from "@ajudante/ui/components/field";
import { Input } from "@ajudante/ui/components/input";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Choice } from "@/components/choice";
import { controlClass } from "@/components/control";
import { MonthSwitch } from "@/components/month-switch";
import { Page } from "@/components/page";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/financas")({
  component: FinancePage,
});

const SOURCES: Record<string, string> = {
  web: "manual",
  nubank_card: "cartão",
  nubank_account: "conta",
};

function formatDay(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function FinancePage() {
  const [month, setMonth] = useState(() => currentMonth());
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("outros");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => zonedNow().date);
  const [source, setSource] = useState<"nubank_account" | "nubank_card">("nubank_card");

  const categories = useQuery(trpc.finance.categories.queryOptions());
  const list = useQuery(trpc.finance.list.queryOptions({ month }));
  const options = (kind === "expense" ? categories.data?.expense : categories.data?.income) ?? [];

  const invalidate = async () => {
    await queryClient.invalidateQueries();
  };
  const create = useMutation(
    trpc.finance.create.mutationOptions({
      onSuccess: async () => {
        setAmount("");
        setDescription("");
        setOpen(false);
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
    <Page title="Finanças" action={<MonthSwitch month={month} onChange={setMonth} />}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button className="w-full sm:w-auto" />}>Anotar lançamento</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anotar lançamento</DialogTitle>
            <DialogDescription>Entra na lista deste mês.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate({ kind, amount, categoryId, description, occurredOn });
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Choice
                  label="Tipo"
                  value={kind}
                  onChange={(next) => {
                    const value = next === "income" ? "income" : "expense";
                    setKind(value);
                    setCategoryId(value === "income" ? "entrada" : "outros");
                  }}
                  options={[
                    { value: "expense", label: "Gasto" },
                    { value: "income", label: "Receita" },
                  ]}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="amount">Valor</FieldLabel>
                <Input
                  id="amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="12,50"
                  inputMode="decimal"
                />
              </Field>
              <Field>
                <FieldLabel>Categoria</FieldLabel>
                <Choice
                  label="Categoria"
                  value={categoryId}
                  onChange={setCategoryId}
                  options={options.map((item) => ({ value: item.id, label: item.name }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Descrição</FieldLabel>
                <Input
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Padaria"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="occurred-on">Data</FieldLabel>
                <input
                  id="occurred-on"
                  type="date"
                  value={occurredOn}
                  onChange={(event) => setOccurredOn(event.target.value)}
                  className={controlClass}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
              <Button type="submit" disabled={create.isPending}>
                Anotar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {list.isLoading ? <Skeleton className="h-40 w-full" /> : null}
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
        <Card className="gap-0 py-0">
          <ul className="flex flex-col">
            {list.data.map((row) => {
              const categoryOptions =
                (row.kind === "income" ? categories.data?.income : categories.data?.expense) ?? [];
              return (
                <li key={row.id} className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="min-w-0 truncate text-sm">{row.description}</p>
                    <p
                      className={`shrink-0 font-mono text-sm tabular-nums ${row.kind === "expense" ? "text-destructive" : "text-foreground"}`}
                    >
                      {formatBrl(row.kind === "expense" ? -row.amountCents : row.amountCents)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {formatDay(row.occurredOn)}
                      {" · "}
                      {row.kind === "transfer" ? "transferência" : (SOURCES[row.source] ?? row.source)}
                    </p>
                    {row.kind === "transfer" ? null : (
                      <Choice
                        label={`Categoria de ${row.description}`}
                        value={row.categoryId ?? ""}
                        onChange={(next) =>
                          update.mutate({
                            id: row.id,
                            categoryId: next,
                            kind: row.kind === "income" ? "income" : "expense",
                          })
                        }
                        options={categoryOptions.map((item) => ({ value: item.id, label: item.name }))}
                        className="w-full sm:w-48"
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card>
        <Collapsible>
          <CardHeader>
            <CollapsibleTrigger className="w-fit text-left text-sm font-medium">
              Importar CSV do Nubank
            </CollapsibleTrigger>
            <CardDescription>
              Fatura do cartão e extrato da conta são arquivos diferentes. O pagamento da fatura entra como
              transferência e não soma no gasto.
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="flex flex-col gap-3">
              <Choice
                label="Tipo de CSV"
                value={source}
                onChange={(next) => setSource(next === "nubank_account" ? "nubank_account" : "nubank_card")}
                options={[
                  { value: "nubank_card", label: "Fatura do cartão" },
                  { value: "nubank_account", label: "Extrato da conta" },
                ]}
              />
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
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </Page>
  );
}
