import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

// Números a mostrar: la primera, la última y las vecinas de la actual; "…" en los saltos
function pages(current: number, last: number) {
  const list: (number | "…")[] = [];
  for (let p = 1; p <= last; p++) {
    if (p === 1 || p === last || Math.abs(p - current) <= 1) list.push(p);
    else if (list[list.length - 1] !== "…") list.push("…");
  }
  return list;
}

const base = "flex size-8 items-center justify-center rounded-md text-sm font-medium tabular-nums transition-colors duration-150";

// Paginación con flechas y números. `last` es la última página conocida.
export function Pagination({ current, last, href }: { current: number; last: number; href: (page: number) => string }) {
  if (last <= 1) return null;
  const arrow = (page: number, label: string, Icon: typeof ChevronLeft) =>
    page < 1 || page > last ? (
      <span aria-disabled className={`${base} text-fg-4`}><Icon className="size-4" strokeWidth={1.75} /></span>
    ) : (
      <Link href={href(page)} aria-label={label} scroll={false} className={`${base} text-fg-3 hover:bg-surface-2 hover:text-fg`}>
        <Icon className="size-4" strokeWidth={1.75} />
      </Link>
    );

  return (
    <nav aria-label="Páginas" className="flex items-center justify-center gap-1">
      {arrow(current - 1, "Página anterior", ChevronLeft)}
      {pages(current, last).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className={`${base} text-fg-4`}>…</span>
        ) : (
          <Link key={p} href={href(p)} scroll={false} aria-current={p === current ? "page" : undefined}
            className={`${base} ${p === current ? "bg-surface-3 text-fg" : "text-fg-3 hover:bg-surface-2 hover:text-fg"}`}>
            {p}
          </Link>
        ),
      )}
      {arrow(current + 1, "Página siguiente", ChevronRight)}
    </nav>
  );
}
