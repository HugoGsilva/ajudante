import { Card, CardContent, CardHeader, CardTitle } from "@ajudante/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Page } from "@/components/page";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/memoria")({
  component: MemoryPage,
});

const LABELS: Record<string, string> = {
  habit: "hábito",
  preference: "preferência",
  entity: "pessoa ou lugar",
  fact: "fato",
};

function MemoryPage() {
  const memory = useQuery(trpc.memory.get.queryOptions());

  return (
    <Page title="Memória">
      {memory.isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {memory.isError ? <p className="text-sm text-destructive">{memory.error.message}</p> : null}
      {memory.data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              {memory.data.profile.trim() ? (
                <p className="text-sm whitespace-pre-wrap">{memory.data.profile}</p>
              ) : (
                <Empty className="border-0 p-0 md:p-0">
                  <EmptyHeader>
                    <EmptyTitle>O perfil ainda está vazio</EmptyTitle>
                    <EmptyDescription>
                      Um hábito contado no Telegram entra nas anotações e o perfil é reescrito no domingo.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Anotações</CardTitle>
            </CardHeader>
            <CardContent>
              {memory.data.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {memory.data.notes.map((note) => (
                    <li key={note.id} className="flex flex-col gap-1">
                      <p className="text-sm">{note.content}</p>
                      <p className="text-sm text-muted-foreground">
                        {LABELS[note.memoryType] ?? note.memoryType}
                        {note.foldedAt ? " · já entrou no perfil" : " · ainda solta"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </Page>
  );
}
