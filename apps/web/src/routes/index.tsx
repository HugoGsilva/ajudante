import { Button } from "@ajudante/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: HomeComponent,
});

function HomeComponent() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());

  return (
    <main className="mx-auto flex min-h-[70svh] w-full max-w-3xl flex-col justify-center gap-8 px-4 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">ajudante</p>
        <h1 className="max-w-sm text-4xl font-medium tracking-tight">O mês, numa tela.</h1>
        <p className="max-w-sm text-base text-muted-foreground">
          O Telegram anota o gasto e o lembrete. Aqui você confere o saldo, corrige a categoria e importa o CSV.
        </p>
      </div>
      <div className="flex flex-col items-start gap-3">
        <Link to="/login">
          <Button>Entrar</Button>
        </Link>
        <p className="text-sm text-muted-foreground">
          {healthCheck.isLoading ? "Checando a API…" : healthCheck.data ? "API no ar" : "API fora"}
        </p>
      </div>
    </main>
  );
}
