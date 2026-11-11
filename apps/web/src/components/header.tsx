import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "Início" },
    { to: "/dashboard", label: "Painel" },
    { to: "/financas", label: "Finanças" },
    { to: "/tarefas", label: "Tarefas" },
    { to: "/memoria", label: "Memória" },
  ] as const;

  return (
    <div>
      <div className="mx-auto flex w-full max-w-5xl flex-row items-center justify-between gap-4 px-4 py-3">
        <nav className="flex flex-wrap gap-4 text-sm">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} to={to} className="text-muted-foreground hover:text-foreground">
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
