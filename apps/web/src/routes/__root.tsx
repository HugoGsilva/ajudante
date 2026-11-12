import { Toaster } from "@ajudante/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";
import type { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "ajudante",
      },
      {
        name: "description",
        content: "Gastos, tarefas e memória.",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function Frame() {
  const { data: session } = authClient.useSession();

  return (
    <div className="grid h-svh grid-rows-[auto_1fr]">
      <Header />
      <div className={session ? "overflow-y-auto pb-16 md:pb-0" : "overflow-y-auto"}>
        <Outlet />
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange storageKey="vite-ui-theme">
        <Frame />
        <Toaster richColors />
      </ThemeProvider>
      {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-left" /> : null}
      {import.meta.env.DEV ? <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" /> : null}
    </>
  );
}
