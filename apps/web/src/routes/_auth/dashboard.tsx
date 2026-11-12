import { Card, CardContent, CardHeader, CardTitle } from "@ajudante/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { formatBrl } from "@ajudante/api/brain/money";
import { currentMonth } from "@ajudante/api/brain/time";

import { controlClass } from "@/components/control";
import { Page } from "@/components/page";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const [month, setMonth] = useState(() => currentMonth());
  const summary = useQuery(trpc.dashboard.summary.queryOptions({ month }));

  const balance = summary.data?.balanceCents ?? 0;

  return (
    <Page title={monthTitle(month)} eyebrow="Este mês">
      <label className="flex max-w-48 flex-col gap-2 text-sm text-muted-foreground">
        Mês
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className={controlClass}
        />
      </label>
      {summary.isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-20" />
        </div>
      ) : null}
      {summary.isError ? <p className="text-sm text-destructive">{summary.error.message}</p> : null}
      {summary.data ? (
        <>
          <div>
            <p className="text-sm text-muted-foreground">Saldo</p>
            <p
              className={`font-mono text-4xl tracking-tight ${balance < 0 ? "text-destructive" : "text-foreground"}`}
            >
              {formatBrl(balance)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Entradas" value={formatBrl(summary.data.incomeCents)} />
            <Metric label="Gastos" value={formatBrl(summary.data.expenseCents)} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Gastos por categoria</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {summary.data.byCategory.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Nenhum gasto neste mês</EmptyTitle>
                    <EmptyDescription>Manda um gasto no Telegram ou importa o CSV.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                summary.data.byCategory.map((item) => {
                  const max = summary.data.byCategory[0]?.totalCents || 1;
                  return (
                    <div key={item.categoryId} className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span>{item.name}</span>
                        <span className="font-mono text-muted-foreground">{formatBrl(item.totalCents)}</span>
                      </div>
                      <span className="h-2 bg-muted">
                        <span
                          className="block h-2 bg-primary"
                          style={{ width: `${Math.max(4, (item.totalCents / max) * 100)}%` }}
                        />
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Hoje e pendências</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>
                {summary.data.pendingTasks === 1
                  ? "1 tarefa pendente."
                  : `${summary.data.pendingTasks} tarefas pendentes.`}
              </p>
              {summary.data.tasksToday.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma tarefa com aviso hoje.</p>
              ) : (
                summary.data.tasksToday.map((task) => <p key={task.id}>{task.title}</p>)
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </Page>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function monthTitle(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, monthNumber - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}
