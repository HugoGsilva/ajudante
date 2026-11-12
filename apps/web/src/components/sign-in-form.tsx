import { Button } from "@ajudante/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ajudante/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@ajudante/ui/components/field";
import { Input } from "@ajudante/ui/components/input";
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
    <main className="mx-auto flex min-h-[70svh] w-full max-w-sm flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-3xl">Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.Field name="email">
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                    <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      autoComplete="username"
                      inputMode="email"
                      aria-invalid={field.state.meta.errors.length > 0}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
              <form.Field name="password">
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                    <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      autoComplete="current-password"
                      enterKeyHint="go"
                      aria-invalid={field.state.meta.errors.length > 0}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
              <form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
                {({ canSubmit, isSubmitting }) => (
                  <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? "Entrando…" : "Entrar"}
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
