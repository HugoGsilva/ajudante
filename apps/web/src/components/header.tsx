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
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link to={session ? "/dashboard" : "/login"} className="text-sm font-medium tracking-tight">
            ajudante
          </Link>
          {session ? (
            <nav className="hidden items-center gap-5 md:flex">
              {links.map(({ to, label }) => (
                <NavLink key={to} to={to} label={label} />
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
          <div className="mx-auto grid max-w-3xl grid-cols-4">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                inactiveProps={{ className: "px-2 py-3 text-center text-sm text-muted-foreground" }}
                activeProps={{ className: "px-2 py-3 text-center text-sm text-foreground" }}
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

function NavLink({ to, label }: { to: (typeof links)[number]["to"]; label: string }) {
  return (
    <Link
      to={to}
      inactiveProps={{ className: "text-sm text-muted-foreground" }}
      activeProps={{ className: "text-sm text-foreground" }}
    >
      {label}
    </Link>
  );
}
