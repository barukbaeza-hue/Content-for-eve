import type { ReactNode } from "react";
import { Logo } from "./logo";

// Página legal pública (términos y privacidad), sin sesión.
export function Legal({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-canvas">
      <article className="mx-auto max-w-2xl space-y-5 px-6 py-16 text-base text-fg-2 [&_h2]:pt-4 [&_h2]:text-md [&_h2]:font-medium [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-sm font-medium text-fg">Mova</span>
        </div>
        <h1 className="text-xl font-medium text-fg">{title}</h1>
        <p className="text-sm text-fg-3">Última actualización: {updated}</p>
        {children}
      </article>
    </main>
  );
}
