import { Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const links = [
  { to: "/dashboard", label: "Painel" },
  { to: "/financas", label: "Finanças" },
  { to: "/tarefas", label: "Tarefas" },
  { to: "/memoria", label: "Memória" },
] as const;

export default function Header() {
  const { data: session } = authClient.useSession();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 px-4">
          <Link to={session ? "/dashboard" : "/login"} className="font-serif text-lg tracking-tight">
            ajudante
          </Link>
          {session ? (
            <nav className="hidden items-center gap-6 md:flex">
              {links.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  inactiveProps={{ className: "text-sm text-muted-foreground" }}
                  activeProps={{ className: "text-sm font-medium text-foreground" }}
                >
                  {label}
                </Link>
              ))}
            </nav>
          ) : null}
          <div className="flex items-center gap-2">
            <ModeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      {session ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden">
          <div className="mx-auto grid h-14 max-w-3xl grid-cols-4">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                inactiveProps={{
                  className:
                    "flex items-center justify-center border-t-2 border-transparent text-sm text-muted-foreground",
                }}
                activeProps={{
                  className: "flex items-center justify-center border-t-2 border-primary text-sm font-medium text-foreground",
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </>
  );
}
