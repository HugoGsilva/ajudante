import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Assistente pessoal</p>
        <h1 className="text-3xl font-medium tracking-tight">Segundo cérebro</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          O Telegram anota gasto, tarefa e ideia. Este painel mostra o mês, corrige categoria e
          importa o CSV do Nubank.
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className={`size-2 ${healthCheck.data ? "bg-primary" : "bg-destructive"}`} />
        <span className="text-muted-foreground">
          {healthCheck.isLoading ? "Checando a API…" : healthCheck.data ? "API no ar" : "API fora"}
        </span>
      </div>
      <Link to="/dashboard" className="text-sm underline underline-offset-4">
        Abrir o painel
      </Link>
    </main>
  );
}
