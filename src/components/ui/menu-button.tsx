"use client";

import { ArrowUpDown, Check, ListFilter } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { menuClasses, menuItemClasses, menuLabelClasses } from "./menu";

// Los iconos se eligen por nombre: un componente no se puede pasar desde el servidor a este componente de cliente
const ICONS = { filtro: ListFilter, orden: ArrowUpDown };

// Botón con icono que abre un menú de cristal con opciones (filtros, orden…). Cada opción es un enlace.
export function MenuButton({ icon, label, title, options }: {
  icon: keyof typeof ICONS;
  label: string;
  title: string;
  options: { label: string; href: string; active: boolean }[];
}) {
  const Icon = ICONS[icon];
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.active);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={box} className="relative h-fit">
      <button type="button" aria-label={label} aria-expanded={open} title={label} onClick={() => setOpen((o) => !o)}
        className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors duration-150 ${
          open ? "border-line-strong bg-surface-2 text-fg" : "border-line text-fg-2 hover:border-line-strong hover:text-fg"
        }`}>
        <Icon className="size-4" strokeWidth={1.75} />
        {active?.label}
      </button>
      {open && (
        <div role="menu" className={`${menuClasses} absolute top-full right-0 z-30 mt-1.5 w-52`}>
          <p className={menuLabelClasses}>{title}</p>
          {options.map((o) => (
            <Link key={o.href} href={o.href} scroll={false} role="menuitemradio" aria-checked={o.active}
              onClick={() => setOpen(false)} className={menuItemClasses}>
              <span className="flex-1">{o.label}</span>
              {o.active && <Check className="size-4 text-fg-3" strokeWidth={2} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
