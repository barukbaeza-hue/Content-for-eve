"use client";

import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/login/actions";
import { Logo } from "./logo";
import { Nav } from "./nav";

export const SIDEBAR_COOKIE = "mova_barra";

// Barra lateral: en escritorio se puede contraer a una franja de iconos. Se recuerda en una cookie
// para que al recargar salga igual, sin parpadeo.
export function Sidebar({ email, initialCollapsed }: { email: string; initialCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "contraida" : "abierta"}; path=/; max-age=31536000; samesite=lax`;
  }

  const iconButton = "flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors duration-150 hover:bg-surface-2 hover:text-fg";

  return (
    <aside className={`flex shrink-0 items-center justify-between gap-3 border-b border-line px-3 py-2 md:flex-col md:border-b-0 md:py-3 md:transition-[width] md:duration-200 ${
      collapsed ? "md:w-14 md:items-center md:gap-5 md:px-2" : "md:w-60 md:items-stretch md:gap-4 md:px-3"
    }`}>
      <div className={`flex h-7 items-center gap-2 ${collapsed ? "md:justify-center" : "px-1"}`}>
        <Logo />
        <span className={`text-sm font-medium ${collapsed ? "md:hidden" : ""}`}>Mova</span>
      </div>

      <div className="hidden flex-1 md:block">
        <Nav collapsed={collapsed} />
      </div>

      <div className={`flex items-center gap-2 md:border-t md:border-line md:pt-3 ${collapsed ? "md:flex-col" : ""}`}>
        <button type="button" onClick={toggle} aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          data-tip={collapsed ? "Expandir menú" : "Contraer menú"} data-tip-side="right"
          className={`${iconButton} hidden md:flex`}>
          {collapsed ? <PanelLeftOpen className="size-4" strokeWidth={1.75} /> : <PanelLeftClose className="size-4" strokeWidth={1.75} />}
        </button>
        <span className={`hidden min-w-0 flex-1 truncate px-1 text-xs text-fg-3 ${collapsed ? "" : "md:block"}`}>{email}</span>
        <form action={logout}>
          <button aria-label="Salir" data-tip="Salir" data-tip-side="right" className={iconButton}>
            <LogOut className="size-4" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </aside>
  );
}
