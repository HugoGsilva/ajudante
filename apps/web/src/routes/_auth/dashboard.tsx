import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { formatBrl } from "@ajudante/api/brain/money";
import { currentMonth } from "@ajudante/api/brain/time";

import { controlClass } from "@/components/control";
import { Page, Section } from "@/components/page";
import { monthTitle } from "@/lib/month";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const [month, setMonth] = useState(() => currentMonth());
  const summary = useQuery(trpc.dashboard.summary.queryOptions({ month }));
  const balance = summary.data?.balanceCents ?? 0;

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
      {summary.isLoading ? <Skeleton className="h-28" /> : null}
      {summary.isError ? <p className="text-sm text-destructive">{summary.error.message}</p> : null}
      {summary.data ? (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Saldo</p>
            <p className={`font-mono text-4xl tracking-tight ${balance < 0 ? "text-destructive" : "text-foreground"}`}>
              {formatBrl(balance)}
            </p>
            <p className="text-sm text-muted-foreground">
              Entrou {formatBrl(summary.data.incomeCents)} · Saiu {formatBrl(summary.data.expenseCents)}
            </p>
          </div>

          <Section
            title="Hoje"
            action={
              <Link to="/tarefas" className="text-sm text-primary">
                Tarefas
              </Link>
            }
          >
            {summary.data.tasksToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada com aviso hoje.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {summary.data.tasksToday.map((task) => (
                  <li key={task.id}>{task.title}</li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">
              {summary.data.pendingTasks === 1
                ? "1 tarefa pendente."
                : `${summary.data.pendingTasks} tarefas pendentes.`}
            </p>
          </Section>

          <Section
            title="Onde saiu o dinheiro"
            action={
              <Link to="/financas" className="text-sm text-primary">
                Lançamentos
              </Link>
            }
          >
            {summary.data.byCategory.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nenhum gasto neste mês</EmptyTitle>
                  <EmptyDescription>Os lançamentos aparecem em Finanças.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-3">
                {summary.data.byCategory.slice(0, 3).map((item) => {
                  const max = summary.data.byCategory[0]?.totalCents || 1;
                  return (
                    <li key={item.categoryId} className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span>{item.name}</span>
                        <span className="font-mono text-muted-foreground">{formatBrl(item.totalCents)}</span>
                      </div>
                      <span className="h-1.5 bg-muted">
                        <span
                          className="block h-1.5 bg-primary"
                          style={{ width: `${Math.max(4, (item.totalCents / max) * 100)}%` }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </>
      ) : null}
    </Page>
  );
}
