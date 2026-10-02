"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { menuClasses, menuItemClasses } from "./menu";

// Controles de formulario del sistema (al estilo Linear). No se usan los nativos del navegador.

type Base = { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean };

// Casilla: cuadrado de 16px que se rellena con el acento al marcarse
export function Checkbox({ checked, onChange, disabled, label, hint }: Base & { label: ReactNode; hint?: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className="group flex items-start gap-2.5 text-left text-sm text-fg disabled:cursor-not-allowed disabled:opacity-50">
      <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-150 ${
        checked ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface-1 group-hover:border-fg-4"
      }`}>
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span>
        {label}
        {hint && <span className="block text-xs text-fg-3">{hint}</span>}
      </span>
    </button>
  );
}

// Interruptor: para activar o desactivar una opción, con la etiqueta a la izquierda
export function Switch({ checked, onChange, disabled, label, hint }: Base & { label: ReactNode; hint?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-4 text-left disabled:cursor-not-allowed disabled:opacity-50">
      <span className="text-sm text-fg">
        {label}
        {hint && <span className="block text-xs text-fg-3">{hint}</span>}
      </span>
      <span className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors duration-150 ${
        checked ? "bg-accent" : "bg-surface-3 group-hover:bg-line-strong"
      }`}>
        <span className={`absolute top-[3px] size-3 rounded-full transition-[left,background-color] duration-150 ${
          checked ? "left-[17px] bg-on-accent" : "left-[3px] bg-fg-3"
        }`} />
      </span>
    </button>
  );
}

// Selector: un botón como los campos de texto que abre un menú de cristal con las opciones
export function Select<T extends string>({ value, onChange, options, placeholder = "Elige una opción", disabled, label }: {
  value: T | "";
  onChange: (value: T) => void;
  options: { value: T; label: string; disabled?: boolean; hint?: string }[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}) {
  // Posición del menú en pantalla: va en su propia capa para que su cristal desenfoque bien aunque esté dentro de un diálogo
  const [rect, setRect] = useState<DOMRect | null>(null);
  const open = rect !== null;
  const setOpen = (next: boolean | ((o: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(open) : next;
    setRect(value && box.current ? box.current.getBoundingClientRect() : null);
  };
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) =>
      !box.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node) && setRect(null);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), setRect(null));
    const scroll = (e: Event) => !list.current?.contains(e.target as Node) && setRect(null);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape, true);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-surface-1 px-3 text-left text-sm transition-colors duration-150 disabled:opacity-50 ${
          open ? "border-line-strong" : "border-line hover:border-line-strong"
        } ${current ? "text-fg" : "text-fg-4"}`}>
        {current?.label ?? placeholder}
        <ChevronDown className={`size-4 text-fg-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
      </button>
      {rect && createPortal(
        <div ref={list} role="listbox" style={{ top: rect.bottom + 6, left: rect.left, width: rect.width }}
          className={`${menuClasses} no-scrollbar fixed z-[70] max-h-64 overflow-y-auto`}
          // Dentro de un diálogo, los clics en el menú no deben llegar al diálogo
          onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          {options.map((o) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value} disabled={o.disabled}
              onClick={() => {
                onChange(o.value);
                setRect(null);
              }}
              className={o.hint ? `${menuItemClasses.replace("h-9 ", "")} py-1.5` : menuItemClasses}>
              <span className="flex-1">
                {o.label}
                {o.hint && <span className="block text-xs text-fg-3">{o.hint}</span>}
              </span>
              {o.value === value && <Check className="size-4 text-fg-3" strokeWidth={2} />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

// Píldora que se marca y desmarca (por ejemplo, las redes donde se publica)
export function Pill({ checked, onChange, disabled, children }: Base & { children: ReactNode }) {
  return (
    <button type="button" aria-pressed={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors duration-150 disabled:opacity-50 ${
        checked ? "border-line-strong bg-surface-3 text-fg" : "border-line text-fg-3 hover:border-line-strong hover:text-fg"
      }`}>
      {checked && <Check className="size-3.5" strokeWidth={2.25} />}
      {children}
    </button>
  );
}
