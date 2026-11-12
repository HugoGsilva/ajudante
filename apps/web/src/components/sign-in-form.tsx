import { Button } from "@ajudante/ui/components/button";
import { Input } from "@ajudante/ui/components/input";
import { Label } from "@ajudante/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

const OWNER_EMAIL = "hugoartess@gmail.com";

export default function SignInForm() {
  const navigate = useNavigate();
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: OWNER_EMAIL,
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            navigate({ to: "/dashboard" });
            toast.success("Entrou.");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("E-mail inválido."),
        password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <main className="mx-auto flex min-h-[70svh] w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <p className="text-sm text-muted-foreground">ajudante</p>
        <h1 className="mt-1 text-3xl font-medium tracking-tight">Entrar</h1>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <form.Field name="email">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={field.name}>E-mail</Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                autoComplete="username"
                inputMode="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className="text-sm text-destructive">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={field.name}>Senha</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="current-password"
                enterKeyHint="go"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className="text-sm text-destructive">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
          {({ canSubmit, isSubmitting }) => (
            <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Entrando…" : "Entrar"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </main>
  );
}
