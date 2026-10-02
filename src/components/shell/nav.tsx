"use client";

import { BarChart3, CalendarDays, Clapperboard, Lightbulb, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/videos", label: "Vídeos", icon: Clapperboard },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/marca", label: "Mi marca", icon: Sparkles },
];

// Fila de la barra lateral: igual abierta y contraída; al contraerse solo se oculta el texto (con un fundido)
export const sidebarItem = "flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-sm font-medium whitespace-nowrap transition-colors duration-150";
export const sidebarLabel = (collapsed: boolean) =>
  `transition-opacity duration-200 ${collapsed ? "opacity-0" : "opacity-100"}`;

// Navegación de la barra lateral en escritorio. Contraída, el nombre sale en una burbuja al pasar el ratón.
export function Nav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={label}
            data-tip={collapsed ? label : undefined} data-tip-side="right"
            className={`${sidebarItem} ${active ? "bg-surface-3 text-fg" : "text-fg-3 hover:bg-surface-2 hover:text-fg"}`}>
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            <span className={sidebarLabel(collapsed)}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Barra de pestañas inferior en móvil.
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid h-14 grid-cols-5 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] md:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors duration-150 ${
              active ? "text-fg" : "text-fg-3"
            }`}>
            <Icon className="size-5" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
