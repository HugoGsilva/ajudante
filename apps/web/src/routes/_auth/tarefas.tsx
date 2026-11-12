import { Button } from "@ajudante/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ajudante/ui/components/card";
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
        await invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const pending = tasks.data?.filter((task) => task.status === "pending") ?? [];
  const done = tasks.data?.filter((task) => task.status === "done") ?? [];

  return (
    <Page title="Tarefas e ideias">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
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
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nova tarefa" />
        <input
          type="datetime-local"
          value={notifyAt}
          onChange={(event) => setNotifyAt(event.target.value)}
          aria-label="Aviso"
          className={controlClass}
        />
        <Button type="submit" className="sm:w-auto" disabled={createTask.isPending}>
          Adicionar
        </Button>
      </form>
      {tasks.isLoading ? <Skeleton className="h-32" /> : null}
      {tasks.isError ? <p className="text-sm text-destructive">{tasks.error.message}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <TaskColumn
          title="A fazer"
          empty="Nada pendente."
          tasks={pending}
          actionLabel="Feito"
          onAction={(id) => setStatus.mutate({ id, status: "done" })}
        />
        <TaskColumn
          title="Feito"
          empty="Nada concluído."
          tasks={done}
          actionLabel="Reabrir"
          onAction={(id) => setStatus.mutate({ id, status: "pending" })}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ideias</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              createIdea.mutate({ title: ideaTitle, content: ideaContent });
            }}
          >
            <Input value={ideaTitle} onChange={(event) => setIdeaTitle(event.target.value)} placeholder="Título" />
            <Textarea
              value={ideaContent}
              onChange={(event) => setIdeaContent(event.target.value)}
              placeholder="Conteúdo"
            />
            <Button type="submit" disabled={createIdea.isPending} className="self-start">
              Guardar ideia
            </Button>
          </form>
          {ideas.isLoading ? <Skeleton className="h-16" /> : null}
          {ideas.data && ideas.data.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhuma ideia</EmptyTitle>
                <EmptyDescription>Uma nota no Telegram também aparece aqui.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {ideas.data?.map((idea) => (
            <div key={idea.id} className="border border-border p-3 text-sm">
              <p className="font-medium">{idea.title}</p>
              <p className="text-muted-foreground">{idea.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </Page>
  );
}

function TaskColumn({
  title,
  empty,
  tasks,
  actionLabel,
  onAction,
}: {
  title: string;
  empty: string;
  tasks: { id: string; title: string; notifyAt: string | null }[];
  actionLabel: string;
  onAction: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {tasks.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-3 text-sm">
            <div>
              <p>{task.title}</p>
              {task.notifyAt ? (
                <p className="text-xs text-muted-foreground">{formatDateTimePt(task.notifyAt)}</p>
              ) : null}
            </div>
            <Button type="button" variant="outline" onClick={() => onAction(task.id)}>
              {actionLabel}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
