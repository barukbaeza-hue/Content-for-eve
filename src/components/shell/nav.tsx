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

// Barra lateral en escritorio.
export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex h-7 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors duration-150 ${
              active ? "bg-surface-3 text-fg" : "text-fg-3 hover:bg-surface-2 hover:text-fg"
            }`}>
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
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
