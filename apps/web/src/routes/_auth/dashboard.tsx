import { Card, CardContent, CardHeader, CardTitle } from "@ajudante/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { formatBrl } from "@ajudante/api/brain/money";
import { currentMonth } from "@ajudante/api/brain/time";

import { Page } from "@/components/page";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const [month, setMonth] = useState(() => currentMonth());
  const summary = useQuery(trpc.dashboard.summary.queryOptions({ month }));

  return (
    <Page title="Painel">
      <label className="flex w-40 flex-col gap-1 text-xs text-muted-foreground">
        Mês
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="h-8 border border-input bg-transparent px-2 text-xs text-foreground"
        />
      </label>
      {summary.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {summary.isError ? <p className="text-sm text-destructive">{summary.error.message}</p> : null}
      {summary.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Entradas" value={formatBrl(summary.data.incomeCents)} />
            <Metric label="Gastos" value={formatBrl(summary.data.expenseCents)} />
            <Metric label="Saldo" value={formatBrl(summary.data.balanceCents)} />
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
                    <div key={item.categoryId} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
                      <span>{item.name}</span>
                      <span className="h-2 bg-muted">
                        <span
                          className="block h-2 bg-primary"
                          style={{ width: `${Math.max(4, (item.totalCents / max) * 100)}%` }}
                        />
                      </span>
                      <span className="text-muted-foreground">{formatBrl(item.totalCents)}</span>
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
              <p>{summary.data.pendingTasks} tarefas pendentes.</p>
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
        <p className="text-xl">{value}</p>
      </CardContent>
    </Card>
  );
}
