import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Page, Section } from "@/components/page";
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
      {memory.isLoading ? <Skeleton className="h-40" /> : null}
      {memory.isError ? <p className="text-sm text-destructive">{memory.error.message}</p> : null}
      {memory.data ? (
        <>
          <Section title="Perfil">
            {memory.data.profile.trim() ? (
              <p className="whitespace-pre-wrap text-sm">{memory.data.profile}</p>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>O perfil ainda está vazio</EmptyTitle>
                  <EmptyDescription>
                    Um hábito contado no Telegram entra nas anotações e o perfil é reescrito no domingo.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </Section>
          <Section title="Anotações">
            {memory.data.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {memory.data.notes.map((note) => (
                  <li key={note.id} className="text-sm">
                    <p>{note.content}</p>
                    <p className="text-muted-foreground">
                      {LABELS[note.memoryType] ?? note.memoryType}
                      {note.foldedAt ? " · já entrou no perfil" : " · ainda solta"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      ) : null}
    </Page>
  );
}
