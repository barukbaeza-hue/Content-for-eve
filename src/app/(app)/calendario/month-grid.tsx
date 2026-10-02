"use client";

import { Plus } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import type { CalendarVideo } from "./planner";
import { DRAG_TYPE } from "./week-grid";

const MAX = 4;

// Mes como en Later, Buffer o Postiz: una celda por día con sus vídeos en filas compactas.
// Mismo arrastrar y soltar que la semana; al pasar por un día libre aparece un + y lo pasado sale en gris.
export function MonthGrid({ month, videos, now, card, onDrop, onAdd }: {
  month: Date; // cualquier día del mes
  videos: CalendarVideo[];
  now: number;
  card: (video: CalendarVideo) => ReactNode;
  onDrop: (id: string, day: Date) => void;
  onAdd: (day: Date, anchor: DOMRect) => void;
}) {
  const [over, setOver] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  // Semanas completas (de lunes a domingo) que tocan el mes
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - ((first.getDay() + 6) % 7));
  const count = Math.ceil(((last.getTime() - start.getTime()) / 86400000 + 1) / 7) * 7;
  const days = Array.from({ length: count }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const weekdays = days.slice(0, 7).map((d) => d.toLocaleDateString("es", { weekday: "short" }).replace(".", ""));
  const today = new Date(now).toDateString();
  const startOfToday = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();

  const byDay = new Map<string, CalendarVideo[]>();
  for (const v of videos) {
    if (!v.at) continue;
    const key = new Date(v.at).toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), v]);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.at!.localeCompare(b.at!));

  return (
    <div className="no-scrollbar absolute inset-0 flex flex-col overflow-auto rounded-lg border border-line">
      <div className="grid shrink-0 grid-cols-7 bg-surface-2">
        {weekdays.map((w, i) => (
          <div key={w} className={`py-2 text-center text-xs font-medium capitalize text-fg-3 ${i ? "border-l border-line" : ""}`}>{w}</div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-[minmax(120px,auto)] grid-cols-7">
        {days.map((d, i) => {
          const key = d.toDateString();
          const list = byDay.get(key) ?? [];
          const past = d.getTime() < startOfToday;
          const outside = d.getMonth() !== month.getMonth();
          const shown = open === key ? list : list.slice(0, MAX);
          return (
            <div key={key}
              onDragOver={(e) => {
                if (past || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (over !== key) setOver(key);
              }}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData(DRAG_TYPE);
                if (id && !past) onDrop(id, d);
              }}
              className={`group/cell flex min-w-0 flex-col gap-0.5 border-t border-line p-1 transition-colors duration-100 ${i % 7 ? "border-l" : ""} ${
                past ? "bg-[rgb(128_128_128/0.07)]" : over === key ? "bg-[rgb(128_128_128/0.16)]" : ""
              }`}>
              <div className="flex justify-end">
                <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm font-medium tabular-nums ${
                  key === today ? "bg-fg text-canvas" : past || outside ? "text-fg-4" : "text-fg"
                }`}>
                  {d.getDate()}
                </span>
              </div>
              {shown.map((v) => <Fragment key={v.id}>{card(v)}</Fragment>)}
              {list.length > MAX && (
                <button type="button" onClick={() => setOpen(open === key ? null : key)}
                  className="rounded px-1 py-0.5 text-left text-xs text-fg-3 hover:bg-[rgb(128_128_128/0.12)] hover:text-fg">
                  {open === key ? "Ver menos" : `${list.length - MAX} más`}
                </button>
              )}
              {!past && (
                <button type="button" aria-label="Añadir un vídeo a este día"
                  onClick={(e) => onAdd(d, e.currentTarget.getBoundingClientRect())}
                  className="flex min-h-7 flex-1 items-center justify-center rounded-md text-fg-3 opacity-0 transition-opacity duration-100 group-hover/cell:opacity-100 hover:bg-[rgb(128_128_128/0.12)] hover:text-fg">
                  <Plus className="size-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
