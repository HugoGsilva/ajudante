import type { ReactNode } from "react";

export function Page({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        {action}
      </header>
      {children}
    </main>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
