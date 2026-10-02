"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/controls";
import { menuClasses, menuLabelClasses, menuSeparatorClasses } from "@/components/ui/menu";
import { saveCalendarSettings } from "./actions";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: pad(h), label: pad(h) }));
const MINUTES = Array.from({ length: 12 }, (_, i) => ({ value: pad(i * 5), label: pad(i * 5) }));

// Ajustes del calendario: cuántos vídeos al día y a qué horas se suele publicar.
// Esas horas se marcan en el calendario y son las que se usan al soltar un vídeo en un día.
export function SettingsPopover({ anchor, perDay, times, onClose }: {
  anchor: DOMRect;
  perDay: number;
  times: string[];
  onClose: () => void;
}) {
  const [count, setCount] = useState(perDay);
  const [list, setList] = useState(times);
  const [hour, setHour] = useState("18");
  const [minute, setMinute] = useState("00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outside = (e: MouseEvent) => !box.current?.contains(e.target as Node) && onClose();
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);

  function add() {
    const t = `${hour}:${minute}`;
    setList((prev) => [...new Set([...prev, t])].sort());
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await saveCalendarSettings(count, list);
    setSaving(false);
    if (result.error) return setError(result.error);
    onClose();
  }

  const width = 288;
  const left = Math.min(Math.max(8, anchor.right - width), window.innerWidth - width - 8);

  return createPortal(
    <div ref={box} style={{ top: anchor.bottom + 6, left, width }} className={`${menuClasses} fixed z-40 space-y-1`}>
      <p className={menuLabelClasses}>Vídeos al día</p>
      <div className="grid grid-cols-3 gap-1 px-1">
        {[1, 2, 3].map((n) => (
          <button key={n} type="button" onClick={() => setCount(n)}
            className={`h-8 rounded-md text-sm font-medium tabular-nums transition-colors duration-150 ${
              count === n ? "bg-fg text-canvas" : "bg-[rgb(128_128_128/0.12)] text-fg-2 hover:bg-[rgb(128_128_128/0.22)]"
            }`}>
            {n}
          </button>
        ))}
      </div>

      <div className={menuSeparatorClasses} />
      <p className={menuLabelClasses}>Horas de publicación</p>
      <div className="flex flex-wrap gap-1.5 px-1">
        {list.map((t) => (
          <span key={t} className="inline-flex h-7 items-center gap-1 rounded-full bg-[rgb(128_128_128/0.14)] pr-1 pl-2.5 text-sm tabular-nums">
            {t}
            <button type="button" aria-label={`Quitar ${t}`} onClick={() => setList((prev) => prev.filter((x) => x !== t))}
              className="flex size-5 items-center justify-center rounded-full text-fg-3 hover:bg-[rgb(128_128_128/0.2)] hover:text-fg">
              <X className="size-3" strokeWidth={2} />
            </button>
          </span>
        ))}
        {!list.length && <p className="text-xs text-fg-3">Sin horas. Añade al menos una.</p>}
      </div>
      <div className="flex items-center gap-1.5 px-1 pt-1">
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          <Select label="Hora" value={hour} options={HOURS} onChange={setHour} />
          <Select label="Minutos" value={minute} options={MINUTES} onChange={setMinute} />
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={add} disabled={list.length >= 8} className="h-9">
          <Plus className="size-4" strokeWidth={1.75} />
          Añadir
        </Button>
      </div>
      <p className="px-2.5 pt-1 text-xs text-fg-3">Se marcan en el calendario y se usan al soltar un vídeo en un día.</p>

      {error && <p className="px-2.5 text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-1.5 px-1 pt-2 pb-1">
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="button" size="sm" variant="primary" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
