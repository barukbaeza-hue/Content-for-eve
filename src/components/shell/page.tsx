import type { ReactNode } from "react";

// Cabecera fija de 44px con el título, y el contenido debajo.
export function Page({ title, actions, children }: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h1 className="text-sm font-medium">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
