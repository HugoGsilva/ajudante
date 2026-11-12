import { formatDateTimePt } from "@ajudante/api/brain/time";
import { Button } from "@ajudante/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ajudante/ui/components/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@ajudante/ui/components/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ajudante/ui/components/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ajudante/ui/components/empty";
import { Field, FieldGroup, FieldLabel } from "@ajudante/ui/components/field";
import { Input } from "@ajudante/ui/components/input";
import { Skeleton } from "@ajudante/ui/components/skeleton";
import { Textarea } from "@ajudante/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { controlClass } from "@/components/control";
import { Page } from "@/components/page";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/tarefas")({
  component: TasksPage,
});

function TasksPage() {
  const tasks = useQuery(trpc.tasks.list.queryOptions());
  const ideas = useQuery(trpc.ideas.list.queryOptions());
  const [taskOpen, setTaskOpen] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
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
        setTaskOpen(false);
        toast.success("Tarefa adicionada.");
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
        setIdeaOpen(false);
        toast.success("Ideia guardada.");
        await invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const pending = tasks.data?.filter((task) => task.status === "pending") ?? [];
  const done = tasks.data?.filter((task) => task.status === "done") ?? [];

  return (
    <Page
      title="Tarefas"
      action={
        <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
          <DialogTrigger render={<Button />}>Nova</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova tarefa</DialogTitle>
              <DialogDescription>O aviso é opcional.</DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-4"
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
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="task-title">O que fazer</FieldLabel>
                  <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="task-when">Aviso</FieldLabel>
                  <input
                    id="task-when"
                    type="datetime-local"
                    value={notifyAt}
                    onChange={(event) => setNotifyAt(event.target.value)}
                    className={controlClass}
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
                <Button type="submit" disabled={createTask.isPending}>
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {tasks.isLoading ? <Skeleton className="h-32 w-full" /> : null}
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
        <Card className="gap-0 py-0">
          <ul className="flex flex-col">
            {pending.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{task.title}</p>
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
        </Card>
      ) : null}

      <Collapsible>
        <CollapsibleTrigger className="w-fit text-sm text-muted-foreground">
          Concluídas ({done.length})
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          {done.length === 0 ? <p className="text-sm text-muted-foreground">Nada concluído.</p> : null}
          {done.length > 0 ? (
            <Card className="gap-0 py-0">
              <ul className="flex flex-col">
                {done.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <p className="min-w-0 truncate text-sm">{task.title}</p>
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
            </Card>
          ) : null}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <div className="flex items-center justify-between gap-3">
          <CollapsibleTrigger className="w-fit text-sm text-muted-foreground">
            Ideias ({ideas.data?.length ?? 0})
          </CollapsibleTrigger>
          <Dialog open={ideaOpen} onOpenChange={setIdeaOpen}>
            <DialogTrigger render={<Button variant="outline" />}>Nova ideia</DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nova ideia</DialogTitle>
                <DialogDescription>Uma nota curta, no mesmo lugar das anotações.</DialogDescription>
              </DialogHeader>
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  createIdea.mutate({ title: ideaTitle, content: ideaContent });
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="idea-title">Título</FieldLabel>
                    <Input id="idea-title" value={ideaTitle} onChange={(event) => setIdeaTitle(event.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="idea-content">Conteúdo</FieldLabel>
                    <Textarea
                      id="idea-content"
                      value={ideaContent}
                      onChange={(event) => setIdeaContent(event.target.value)}
                    />
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
                  <Button type="submit" disabled={createIdea.isPending}>
                    Guardar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CollapsibleContent className="flex flex-col gap-3 pt-3">
          {ideas.isLoading ? <Skeleton className="h-16 w-full" /> : null}
          {ideas.isError ? <p className="text-sm text-destructive">{ideas.error.message}</p> : null}
          {ideas.data && ideas.data.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhuma ideia</EmptyTitle>
                <EmptyDescription>Uma nota no Telegram também aparece aqui.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {ideas.data?.map((idea) => (
            <Card key={idea.id} size="sm">
              <CardHeader>
                <CardTitle>{idea.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{idea.content}</p>
              </CardContent>
            </Card>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </Page>
  );
}
