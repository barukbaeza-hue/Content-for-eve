"use client";

import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/login/actions";
import { Logo } from "./logo";
import { Nav, sidebarItem, sidebarLabel } from "./nav";

export const SIDEBAR_COOKIE = "mova_barra";

// Barra lateral: en escritorio se puede contraer a una franja de iconos. Todo mantiene su sitio y su tamaño;
// solo cambia el ancho (animado) y los textos se desvanecen. Se recuerda en una cookie para que no parpadee al recargar.
export function Sidebar({ email, initialCollapsed }: { email: string; initialCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "contraida" : "abierta"}; path=/; max-age=31536000; samesite=lax`;
  }

  const tip = (text: string) => (collapsed ? text : undefined);
  const muted = "text-fg-3 hover:bg-surface-2 hover:text-fg";

  return (
    <aside className={`flex shrink-0 items-center justify-between gap-3 border-b border-line px-3 py-2 md:flex-col md:items-stretch md:gap-4 md:overflow-hidden md:border-b-0 md:py-3 md:transition-[width] md:duration-200 md:ease-out ${
      collapsed ? "md:w-14" : "md:w-60"
    }`}>
      <div className="flex h-7 items-center gap-2 px-1 whitespace-nowrap">
        <Logo className="shrink-0" />
        <span className={`text-sm font-medium ${sidebarLabel(collapsed)}`}>Mova</span>
      </div>

      <div className="hidden flex-1 md:block">
        <Nav collapsed={collapsed} />
      </div>

      <div className="flex items-center gap-0.5 md:flex-col md:items-stretch md:border-t md:border-line md:pt-3">
        <p className={`hidden truncate px-2 pb-1 text-xs whitespace-nowrap text-fg-3 md:block ${sidebarLabel(collapsed)}`}>{email}</p>
        <button type="button" onClick={toggle} aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          data-tip={tip("Expandir menú")} data-tip-side="right" className={`${sidebarItem} ${muted} hidden md:flex`}>
          {collapsed
            ? <PanelLeftOpen className="size-4 shrink-0" strokeWidth={1.75} />
            : <PanelLeftClose className="size-4 shrink-0" strokeWidth={1.75} />}
          <span className={sidebarLabel(collapsed)}>Contraer menú</span>
        </button>
        <form action={logout}>
          <button aria-label="Salir" data-tip={tip("Salir")} data-tip-side="right" className={`${sidebarItem} ${muted}`}>
            <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
            <span className={`hidden md:inline ${sidebarLabel(collapsed)}`}>Salir</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
