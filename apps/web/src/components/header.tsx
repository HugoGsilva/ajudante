import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const links = [
  { to: "/dashboard", label: "Painel" },
  { to: "/financas", label: "Finanças" },
  { to: "/tarefas", label: "Tarefas" },
  { to: "/memoria", label: "Memória" },
] as const;

export default function Header() {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/dashboard" className="text-sm font-medium tracking-tight">
            ajudante
          </Link>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                inactiveProps={{ className: "text-sm text-muted-foreground" }}
                activeProps={{ className: "text-sm text-foreground" }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              inactiveProps={{ className: "px-2 py-3 text-center text-xs text-muted-foreground" }}
              activeProps={{ className: "px-2 py-3 text-center text-xs text-foreground" }}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
