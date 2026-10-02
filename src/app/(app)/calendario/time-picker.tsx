"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/controls";
import { menuClasses, menuLabelClasses } from "@/components/ui/menu";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: pad(h), label: pad(h) }));
// Minutos de 5 en 5 (y el actual, si no es múltiplo de 5)
function minutes(current: string) {
  const list = Array.from({ length: 12 }, (_, i) => pad(i * 5));
  if (current && !list.includes(current)) list.push(current);
  return list.sort().map((m) => ({ value: m, label: m }));
}

// Popover de cristal para cambiar la hora de un vídeo programado: tus horas habituales o una a mano.
export function TimePicker({ anchor, day, value, presets, onSave, onClose }: {
  anchor: DOMRect;
  day: Date;
  value: string;
  presets: string[];
  onSave: (at: Date) => void;
  onClose: () => void;
}) {
  const [time, setTime] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const box = useRef<HTMLFormElement>(null);

  // Se cierra al hacer clic fuera, con Escape o al hacer scroll
  useEffect(() => {
    const outside = (e: MouseEvent) => !box.current?.contains(e.target as Node) && onClose();
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    // Se cierra si se desplaza la página, no si se desplaza una lista dentro del propio popover
    const scroll = (e: Event) => !box.current?.contains(e.target as Node) && onClose();
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [onClose]);

  const at = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
  };
  const past = (t: string) => at(t).getTime() <= now;

  function save(t: string) {
    if (!/^\d{2}:\d{2}$/.test(t)) return setError("Elige una hora.");
    if (past(t)) return setError("Esa hora ya pasó.");
    onSave(at(t));
  }

  // Debajo de la hora; si no cabe, encima
  const width = 224;
  const left = Math.min(Math.max(8, anchor.left), window.innerWidth - width - 8);
  const below = anchor.bottom + 6 + 190 < window.innerHeight;
  const style = below ? { top: anchor.bottom + 6, left } : { bottom: window.innerHeight - anchor.top + 6, left };

  return createPortal(
    <form ref={box} style={{ ...style, width }} className={`${menuClasses} fixed z-40 space-y-2`}
      onSubmit={(e) => {
        e.preventDefault();
        save(time);
      }}>
      <p className={menuLabelClasses}>
        {day.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <div className="grid grid-cols-3 gap-1.5 px-1">
        {presets.map((t) => (
          <button key={t} type="button" disabled={past(t)} onClick={() => save(t)}
            className={`h-8 rounded-md text-sm tabular-nums transition-colors disabled:opacity-35 ${
              t === value ? "bg-fg text-canvas" : "bg-[rgb(128_128_128/0.12)] hover:bg-[rgb(128_128_128/0.22)]"
            }`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 px-1 pb-1">
        {/* Otra hora: hora y minutos con selectores propios */}
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          <Select label="Hora" value={time.slice(0, 2)} options={HOURS}
            onChange={(h) => {
              setTime(`${h}:${time.slice(3, 5) || "00"}`);
              setError(null);
            }} />
          <Select label="Minutos" value={time.slice(3, 5)} options={minutes(time.slice(3, 5))}
            onChange={(m) => {
              setTime(`${time.slice(0, 2) || "12"}:${m}`);
              setError(null);
            }} />
        </div>
        <Button type="submit" size="sm" variant="primary">Guardar</Button>
      </div>
      {error && <p className="px-2.5 pb-1 text-xs text-danger">{error}</p>}
    </form>,
    document.body,
  );
}
