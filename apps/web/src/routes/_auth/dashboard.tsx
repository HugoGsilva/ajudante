import { formatBrl } from "@ajudante/api/brain/money";
import { currentMonth, formatDateTimePt } from "@ajudante/api/brain/time";
import { Button } from "@ajudante/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ajudante/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Progress } from "@ajudante/ui/components/progress";
import { Separator } from "@ajudante/ui/components/separator";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { MonthSwitch } from "@/components/month-switch";
import { Page } from "@/components/page";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const [month, setMonth] = useState(() => currentMonth());
  const summary = useQuery(trpc.dashboard.summary.queryOptions({ month }));
  const balance = summary.data?.balanceCents ?? 0;
  const top = summary.data?.byCategory.slice(0, 3) ?? [];
  const max = top[0]?.totalCents || 1;

  return (
    <Page title="Painel" action={<MonthSwitch month={month} onChange={setMonth} />}>
      {summary.isLoading ? <Skeleton className="h-44 w-full" /> : null}
      {summary.isError ? <p className="text-sm text-destructive">{summary.error.message}</p> : null}
      {summary.data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Saldo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p
                className={`font-mono text-4xl tracking-tight tabular-nums ${balance < 0 ? "text-destructive" : "text-foreground"}`}
              >
                {formatBrl(balance)}
              </p>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">Entrou</p>
                  <p className="font-mono text-base tabular-nums">{formatBrl(summary.data.incomeCents)}</p>
                </div>
                <div className="flex flex-col gap-1 border-l border-border pl-4">
                  <p className="text-sm text-muted-foreground">Saiu</p>
                  <p className="font-mono text-base tabular-nums">{formatBrl(summary.data.expenseCents)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hoje</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {summary.data.tasksToday.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada com aviso hoje.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {summary.data.tasksToday.map((task) => (
                    <li key={task.id} className="flex items-baseline justify-between gap-4">
                      <p className="min-w-0 truncate text-sm">{task.title}</p>
                      {task.notifyAt ? (
                        <p className="shrink-0 text-sm text-muted-foreground">{formatDateTimePt(task.notifyAt)}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {summary.data.pendingTasks === 1
                    ? "1 tarefa pendente"
                    : `${summary.data.pendingTasks} tarefas pendentes`}
                </p>
                <Button variant="link" nativeButton={false} render={<Link to="/tarefas" />}>
                  Ver tarefas
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Onde saiu</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {top.length === 0 ? (
                <Empty className="border-0 p-0 md:p-0">
                  <EmptyHeader>
                    <EmptyTitle>Nenhum gasto neste mês</EmptyTitle>
                    <EmptyDescription>Os lançamentos ficam em Finanças.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                top.map((item) => (
                  <Progress key={item.categoryId} value={(item.totalCents / max) * 100} className="w-full">
                    <div className="flex w-full items-baseline justify-between gap-3">
                      <span className="text-sm">{item.name}</span>
                      <span className="font-mono text-sm text-muted-foreground tabular-nums">
                        {formatBrl(item.totalCents)}
                      </span>
                    </div>
                  </Progress>
                ))
              )}
              <div className="flex justify-end">
                <Button variant="link" nativeButton={false} render={<Link to="/financas" />}>
                  Ver lançamentos
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </Page>
  );
}
