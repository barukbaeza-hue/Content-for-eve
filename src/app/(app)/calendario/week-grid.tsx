"use client";

import { Plus } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { CalendarVideo } from "./planner";

export const DRAG_TYPE = "application/x-mova-video";
const HOURS = Array.from({ length: 24 }, (_, h) => h);

// Semana como en Later, Buffer, Metricool o Postiz: una fila por hora y una columna por día.
// Cada fila crece con las tarjetas que tiene, así caben completas sin taparse; las horas vacías quedan bajas.
export function WeekGrid({ start, videos, now, dayHeader, card, onDrop, onAdd }: {
  start: Date; // lunes a las 00:00
  videos: CalendarVideo[];
  now: number;
  dayHeader: (date: Date, isToday: boolean) => ReactNode;
  card: (video: CalendarVideo) => ReactNode;
  onDrop: (id: string, hour: Date) => void;
  onAdd: (hour: Date, anchor: DOMRect) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const today = new Date(now);
  const isToday = (d: Date) => d.toDateString() === today.toDateString();

  // Vídeos de la semana agrupados por día y hora
  const cells = new Map<string, CalendarVideo[]>();
  for (const v of videos) {
    if (!v.at) continue;
    const at = new Date(v.at);
    const key = `${at.toDateString()}|${at.getHours()}`;
    cells.set(key, [...(cells.get(key) ?? []), v]);
  }
  for (const list of cells.values()) list.sort((a, b) => a.at!.localeCompare(b.at!));

  // Al cambiar de semana se baja a la hora que importa: la actual, el primer vídeo o las 8:00
  const startKey = start.getTime();
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const end = startKey + 7 * 86400 * 1000;
    const thisWeek = Date.now() >= startKey && Date.now() < end;
    const hours = videos.filter((v) => v.at && +new Date(v.at) >= startKey && +new Date(v.at) < end).map((v) => new Date(v.at!).getHours());
    const hour = thisWeek ? Math.max(new Date().getHours() - 1, 0) : hours.length ? Math.min(...hours) : 8;
    const row = box.querySelector<HTMLElement>(`[data-hour="${hour}"]`);
    const head = box.querySelector<HTMLElement>("[data-head]");
    box.scrollTop = row ? row.offsetTop - (head?.offsetHeight ?? 0) : 0;
    // Solo al cambiar de semana, no cada vez que se mueve un vídeo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey]);

  return (
    <div ref={scroller} className="no-scrollbar absolute inset-0 overflow-auto rounded-lg border border-line">
      <div className="grid min-w-[900px] grid-cols-[56px_repeat(7,minmax(0,1fr))]">
        <div data-head className="sticky top-0 z-20 bg-canvas" />
        {days.map((d) => (
          <div key={d.toDateString()} className="sticky top-0 z-20 border-l border-line bg-canvas p-1.5">
            {dayHeader(d, isToday(d))}
          </div>
        ))}

        {HOURS.map((h) => (
          <Fragment key={h}>
            <div data-hour={h} className="border-t border-line pt-1.5 pr-2 text-right text-xs text-fg-3 tabular-nums">
              {String(h).padStart(2, "0")}:00
            </div>
            {days.map((d) => {
              const hour = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h);
              const key = `${d.toDateString()}|${h}`;
              const list = cells.get(key) ?? [];
              const past = hour.getTime() + 3600 * 1000 <= now;
              const current = !past && hour.getTime() <= now;
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
                    if (id && !past) onDrop(id, hour);
                  }}
                  className={`group/cell relative flex min-h-12 flex-col gap-1 border-t border-l border-line p-1 transition-colors duration-100 ${
                    past ? "bg-[rgb(128_128_128/0.07)]" : over === key ? "bg-[rgb(128_128_128/0.16)]" : ""
                  }`}>
                  {list.map((v) => <Fragment key={v.id}>{card(v)}</Fragment>)}
                  {!past && (
                    <button type="button" aria-label="Añadir un vídeo a esta hora"
                      onClick={(e) => onAdd(hour, e.currentTarget.getBoundingClientRect())}
                      className="flex min-h-9 flex-1 items-center justify-center rounded-md text-fg-3 opacity-0 transition-opacity duration-100 group-hover/cell:opacity-100 hover:bg-[rgb(128_128_128/0.12)] hover:text-fg">
                      <Plus className="size-4" strokeWidth={1.75} />
                    </button>
                  )}
                  {current && isToday(d) && (
                    <span aria-hidden style={{ top: `${(today.getMinutes() / 60) * 100}%` }}
                      className="pointer-events-none absolute inset-x-0 z-10 h-px bg-danger before:absolute before:-top-[3px] before:-left-[3px] before:size-[7px] before:rounded-full before:bg-danger" />
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
