import type { ReactNode } from "react";

export function Page({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        {eyebrow ? <p className="text-sm text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
      </header>
      {children}
    </main>
  );
}
