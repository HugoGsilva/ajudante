import { Button } from "@ajudante/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Input } from "@ajudante/ui/components/input";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { Textarea } from "@ajudante/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { formatDateTimePt } from "@ajudante/api/brain/time";

import { controlClass } from "@/components/control";
import { Page } from "@/components/page";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/tarefas")({
  component: TasksPage,
});

function TasksPage() {
  const tasks = useQuery(trpc.tasks.list.queryOptions());
  const ideas = useQuery(trpc.ideas.list.queryOptions());
  const [addingTask, setAddingTask] = useState(false);
  const [addingIdea, setAddingIdea] = useState(false);
  const [title, setTitle] = useState("");
  const [notifyAt, setNotifyAt] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaContent, setIdeaContent] = useState("");
  const invalidate = async () => {
    await queryClient.invalidateQueries();
  };
  const setStatus = useMutation(
    trpc.tasks.setStatus.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
  const createTask = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: async () => {
        setTitle("");
        setNotifyAt("");
        setAddingTask(false);
        await invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const createIdea = useMutation(
    trpc.ideas.create.mutationOptions({
      onSuccess: async () => {
        setIdeaTitle("");
        setIdeaContent("");
        setAddingIdea(false);
        await invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const pending = tasks.data?.filter((task) => task.status === "pending") ?? [];
  const done = tasks.data?.filter((task) => task.status === "done") ?? [];

  return (
    <Page
      title="A fazer"
      action={
        addingTask ? null : (
          <Button type="button" onClick={() => setAddingTask(true)}>
            Nova
          </Button>
        )
      }
    >
      {addingTask ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const when = notifyAt ? new Date(notifyAt) : null;
            if (notifyAt && (!when || Number.isNaN(when.getTime()))) {
              toast.error("Data do aviso inválida.");
              return;
            }
            createTask.mutate({ title, notifyAt: when ? when.toISOString() : undefined });
          }}
        >
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="O que fazer"
            aria-label="Tarefa"
          />
          <input
            type="datetime-local"
            value={notifyAt}
            onChange={(event) => setNotifyAt(event.target.value)}
            aria-label="Aviso"
            className={controlClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => setAddingTask(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              Adicionar
            </Button>
          </div>
        </form>
      ) : null}

      {tasks.isLoading ? <Skeleton className="h-32" /> : null}
      {tasks.isError ? <p className="text-sm text-destructive">{tasks.error.message}</p> : null}
      {tasks.data && pending.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nada pendente</EmptyTitle>
            <EmptyDescription>Uma tarefa nova entra nesta lista.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {pending.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {pending.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm">{task.title}</p>
                {task.notifyAt ? (
                  <p className="text-sm text-muted-foreground">{formatDateTimePt(task.notifyAt)}</p>
                ) : null}
              </div>
              <Button type="button" variant="outline" onClick={() => setStatus.mutate({ id: task.id, status: "done" })}>
                Feito
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Concluídas ({done.length})</summary>
        {done.length === 0 ? <p className="mt-3 text-muted-foreground">Nada concluído.</p> : null}
        {done.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-3">
            {done.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3">
                <p>{task.title}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStatus.mutate({ id: task.id, status: "pending" })}
                >
                  Reabrir
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </details>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Ideias ({ideas.data?.length ?? 0})</summary>
        <div className="mt-3 flex flex-col gap-3">
          {ideas.isLoading ? <Skeleton className="h-16" /> : null}
          {ideas.isError ? <p className="text-destructive">{ideas.error.message}</p> : null}
          {addingIdea ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                createIdea.mutate({ title: ideaTitle, content: ideaContent });
              }}
            >
              <Input
                value={ideaTitle}
                onChange={(event) => setIdeaTitle(event.target.value)}
                placeholder="Título"
                aria-label="Título da ideia"
              />
              <Textarea
                value={ideaContent}
                onChange={(event) => setIdeaContent(event.target.value)}
                placeholder="Conteúdo"
                aria-label="Conteúdo da ideia"
              />
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" onClick={() => setAddingIdea(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createIdea.isPending}>
                  Guardar
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" variant="outline" onClick={() => setAddingIdea(true)}>
              Nova ideia
            </Button>
          )}
          {ideas.data && ideas.data.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhuma ideia</EmptyTitle>
                <EmptyDescription>Uma nota no Telegram também aparece aqui.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {ideas.data?.map((idea) => (
            <div key={idea.id}>
              <p className="font-medium">{idea.title}</p>
              <p className="text-muted-foreground">{idea.content}</p>
            </div>
          ))}
        </div>
      </details>
    </Page>
  );
}
