"use client";

import { ChevronLeft, ChevronRight, Plus, Sparkles, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { scheduleVideos } from "./actions";

export type CalendarVideo = {
  id: string;
  title: string;
  status: "ready" | "scheduled" | "published";
  url: string;
  duration: number | null;
  // Fecha programada o de publicación; null si está en el banco
  at: string | null;
};

type Change = { id: string; at: string | null };

const DRAG_TYPE = "application/x-mova-video";

// Todas las fechas en la hora local del navegador
function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function atTime(day: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

function clock(date: Date) {
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function seconds(n: number | null) {
  if (!n) return "";
  const s = Math.round(n);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} s`;
}

function weekLabel(start: Date) {
  const end = addDays(start, 6);
  const month = (d: Date) => d.toLocaleDateString("es", { month: "short" }).replace(".", "");
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()} – ${end.getDate()} ${month(end)} ${end.getFullYear()}`
    : `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)} ${end.getFullYear()}`;
}

// Primera hora libre del día según tus horas de publicación; si están todas ocupadas, una hora después del último.
// Nunca devuelve una hora que ya pasó.
function freeTime(day: Date, times: string[], list: CalendarVideo[], now: Date) {
  const taken = new Set(list.filter((v) => v.at && sameDay(new Date(v.at), day)).map((v) => clock(new Date(v.at!))));
  const soon = now.getTime() + 10 * 60 * 1000;
  for (const time of times) {
    const at = atTime(day, time);
    if (!taken.has(time) && at.getTime() > soon) return at;
  }
  const last = list
    .filter((v) => v.at && sameDay(new Date(v.at), day))
    .reduce((max, v) => Math.max(max, new Date(v.at!).getTime()), 0);
  const after = new Date(Math.max(last + 3600 * 1000, soon));
  after.setMinutes(Math.ceil(after.getMinutes() / 15) * 15, 0, 0);
  return sameDay(after, day) ? after : null;
}

function Thumb({ url }: { url: string }) {
  return (
    <video src={`${url}#t=0.1`} preload="metadata" muted playsInline
      className="pointer-events-none size-full object-cover" />
  );
}

export function Planner({ videos, perDay, times }: { videos: CalendarVideo[]; perDay: number; times: string[] }) {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const slots = useMemo(() => [...times].sort(), [times]);

  // Los cambios se ven al instante; el servidor los guarda por detrás
  const list = useMemo(() => videos.map((v) => {
    if (!(v.id in overrides)) return v;
    const at = overrides[v.id];
    return { ...v, at, status: at ? "scheduled" as const : "ready" as const };
  }), [videos, overrides]);

  const bank = list.filter((v) => v.status === "ready");
  const upcoming = list.filter((v) => v.status === "scheduled" && v.at && new Date(v.at) > new Date()).length;
  const daysLeft = Math.floor((bank.length + upcoming) / perDay);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const onDay = (day: Date) =>
    list.filter((v) => v.at && sameDay(new Date(v.at), day)).sort((a, b) => a.at!.localeCompare(b.at!));
  const isPast = (day: Date) => day < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  function apply(changes: Change[]) {
    if (!changes.length) return;
    setError(null);
    setOverrides((prev) => ({ ...prev, ...Object.fromEntries(changes.map((c) => [c.id, c.at])) }));
    startTransition(async () => {
      const result = await scheduleVideos(changes, Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (result.error) {
        setError(result.error);
        setOverrides((prev) => {
          const next = { ...prev };
          for (const c of changes) delete next[c.id];
          return next;
        });
      }
    });
  }

  function place(id: string, day: Date) {
    const others = list.filter((v) => v.id !== id);
    const at = freeTime(day, slots, others, new Date());
    if (!at) return setError("Ese día ya no tiene horas libres.");
    apply([{ id, at: at.toISOString() }]);
  }

  // Al primer día con hueco desde hoy (para el botón + del banco)
  function placeNext(id: string) {
    const now = new Date();
    for (let i = 0; i < 120; i++) {
      const day = addDays(now, i);
      const count = list.filter((v) => v.at && sameDay(new Date(v.at), day)).length;
      if (count >= perDay) continue;
      const at = freeTime(day, slots, list, now);
      if (at) return apply([{ id, at: at.toISOString() }]);
    }
  }

  // Llena los huecos de la semana visible con los vídeos del banco, en orden
  function fillWeek() {
    const now = new Date();
    const queue = [...bank];
    const plan = [...list];
    const changes: Change[] = [];
    for (const day of days) {
      if (isPast(day)) continue;
      while (queue.length && plan.filter((v) => v.at && sameDay(new Date(v.at), day)).length < perDay) {
        const at = freeTime(day, slots, plan, now);
        if (!at) break;
        const video = queue.shift()!;
        plan.push({ ...video, at: at.toISOString(), status: "scheduled" });
        changes.push({ id: video.id, at: at.toISOString() });
      }
    }
    if (!changes.length) return setError(bank.length ? "Esta semana ya no tiene huecos libres." : "No quedan vídeos en el banco.");
    apply(changes);
  }

  const dragProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_TYPE, id);
      e.dataTransfer.effectAllowed = "move";
      setDragging(id);
    },
    onDragEnd: () => {
      setDragging(null);
      setOver(null);
    },
  });

  const dropProps = (key: string, onDrop: (id: string) => void) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
      e.preventDefault();
      setOver(key);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === key ? null : o));
    },
    onDrop: (e: React.DragEvent) => {
      const id = e.dataTransfer.getData(DRAG_TYPE);
      setOver(null);
      if (id) onDrop(id);
    },
  });

  return (
    <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-line p-0.5">
              <button type="button" aria-label="Semana anterior" onClick={() => setWeek((w) => addDays(w, -7))}
                className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-surface-2 hover:text-fg">
                <ChevronLeft className="size-4" strokeWidth={1.75} />
              </button>
              <button type="button" onClick={() => setWeek(startOfWeek(new Date()))}
                className="h-7 rounded-md px-2.5 text-sm font-medium text-fg-2 hover:bg-surface-2 hover:text-fg">
                Hoy
              </button>
              <button type="button" aria-label="Semana siguiente" onClick={() => setWeek((w) => addDays(w, 7))}
                className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-surface-2 hover:text-fg">
                <ChevronRight className="size-4" strokeWidth={1.75} />
              </button>
            </div>
            <h2 className="text-md font-medium">{weekLabel(week)}</h2>
          </div>
          <Button variant="primary" onClick={fillWeek} disabled={bank.length === 0}>
            <Sparkles className="size-4" strokeWidth={1.75} />
            Llenar la semana
          </Button>
        </div>

        {error && <Notice tone="danger">{error}</Notice>}

        <div className="overflow-x-auto">
          <div className="grid min-w-[840px] grid-cols-7 gap-2">
            {days.map((day) => {
              const key = day.toDateString();
              const past = isPast(day);
              const isToday = sameDay(day, today);
              const items = onDay(day);
              const empty = past ? 0 : Math.max(0, perDay - items.length);
              return (
                <div key={key} {...(past ? {} : dropProps(key, (id) => place(id, day)))}
                  className={`flex min-h-[420px] flex-col gap-2 rounded-lg border p-2 transition-colors duration-150 ${
                    over === key ? "border-fg-3 bg-surface-2" : "border-line"
                  } ${past ? "bg-surface-2/40" : ""}`}>
                  <div className="flex items-baseline justify-between px-0.5">
                    <span className={`text-xs font-medium capitalize ${past ? "text-fg-4" : "text-fg-3"}`}>
                      {day.toLocaleDateString("es", { weekday: "short" }).replace(".", "")}
                    </span>
                    <span className={`flex size-6 items-center justify-center rounded-full text-sm font-medium tabular-nums ${
                      isToday ? "bg-fg text-canvas" : past ? "text-fg-4" : "text-fg"
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>

                  {items.map((video) => {
                    const published = video.status === "published";
                    const movable = !published && !past;
                    return (
                      <div key={video.id} {...(movable ? dragProps(video.id) : {})}
                        className={`group relative aspect-[9/16] overflow-hidden rounded-md bg-surface-3 ${
                          movable ? "cursor-grab active:cursor-grabbing" : ""
                        } ${dragging === video.id ? "opacity-40" : ""} ${published ? "opacity-70" : ""}`}>
                        <Thumb url={video.url} />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-[rgb(0_0_0/0.8)] to-transparent px-2 pt-8 pb-2 text-[#fff]">
                          <p className="text-xs font-medium tabular-nums">
                            {published ? "Publicado" : clock(new Date(video.at!))}
                          </p>
                          <p className="truncate text-2xs text-[rgb(255_255_255/0.8)]">{video.title}</p>
                        </div>
                        {movable && (
                          <button type="button" aria-label="Devolver al banco" title="Devolver al banco"
                            onClick={() => apply([{ id: video.id, at: null }])}
                            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-[rgb(0_0_0/0.4)] text-[#fff] opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 hover:bg-[rgb(0_0_0/0.6)]">
                            <X className="size-3.5" strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {Array.from({ length: empty }, (_, i) => (
                    <div key={i} className="flex h-20 flex-col items-center justify-center rounded-md border border-dashed border-line text-center">
                      <span className="text-2xs text-fg-4">Arrastra un vídeo</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <aside {...dropProps("bank", (id) => apply([{ id, at: null }]))}
        className={`flex flex-col gap-3 self-start rounded-lg border p-3 transition-colors duration-150 lg:sticky lg:top-6 lg:max-h-[calc(100vh-6rem)] ${
          over === "bank" ? "border-fg-3 bg-surface-2" : "border-line"
        }`}>
        <div>
          <h2 className="text-sm font-medium">Banco</h2>
          <p className="text-xs text-fg-3">
            {bank.length === 1 ? "1 vídeo listo" : `${bank.length} vídeos listos`} · {daysLeft === 1 ? "1 día" : `${daysLeft} días`} de contenido
          </p>
        </div>

        {bank.length === 0 ? (
          <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-xs text-fg-3">
            Sube vídeos en Vídeos. Cuando estén editados aparecen aquí para programarlos.
          </p>
        ) : (
          <ul className="-mx-1 min-h-0 space-y-1 overflow-y-auto px-1">
            {bank.map((video) => (
              <li key={video.id} {...dragProps(video.id)}
                className={`group flex cursor-grab items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-surface-2 active:cursor-grabbing ${
                  dragging === video.id ? "opacity-40" : ""
                }`}>
                <div className="aspect-[9/16] w-9 shrink-0 overflow-hidden rounded bg-surface-3">
                  <Thumb url={video.url} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{video.title}</p>
                  <p className="text-xs text-fg-3">{seconds(video.duration)}</p>
                </div>
                <button type="button" aria-label="Programar en el próximo hueco" title="Programar en el próximo hueco"
                  onClick={() => placeNext(video.id)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-fg-3 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-3 hover:text-fg">
                  <Plus className="size-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-2xs text-fg-4">Arrastra un vídeo a un día para programarlo, o de vuelta aquí para quitarlo.</p>
      </aside>
    </div>
  );
}
