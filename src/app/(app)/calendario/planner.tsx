"use client";

import { ChevronLeft, ChevronRight, Plus, Sparkles, X } from "lucide-react";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { scheduleVideos } from "./actions";
import { BankPicker } from "./bank-picker";
import { TimePicker } from "./time-picker";

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
type View = "mes" | "semana";

const noop = () => () => {};

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
  // Vista por mes o por semana; se recuerda en este navegador
  // El calendario depende de la hora y la zona horaria del navegador: se dibuja solo en el cliente
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem("mova.calendario.vista") === "semana" ? "semana" : "mes";
    } catch {
      return "mes";
    }
  });
  const [cursor, setCursor] = useState(() => new Date());
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<{ id: string; anchor: DOMRect } | null>(null);
  const [adding, setAdding] = useState<{ day: Date; anchor: DOMRect } | null>(null);
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
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const first = view === "mes" ? startOfWeek(monthStart) : startOfWeek(cursor);
  const weeks = view === "mes"
    ? Math.ceil(((monthStart.getDay() + 6) % 7 + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7)
    : 1;
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i));
  const inView = (day: Date) => view === "semana" || day.getMonth() === cursor.getMonth();

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem("mova.calendario.vista", next);
    } catch {}
  }

  function move(step: number) {
    setCursor((c) => (view === "mes" ? new Date(c.getFullYear(), c.getMonth() + step, 1) : addDays(c, step * 7)));
  }
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

  // Llena los huecos del mes o la semana visible con los vídeos del banco, en orden
  function fill() {
    const now = new Date();
    const queue = [...bank];
    const plan = [...list];
    const changes: Change[] = [];
    for (const day of days) {
      if (isPast(day) || !inView(day)) continue;
      while (queue.length && plan.filter((v) => v.at && sameDay(new Date(v.at), day)).length < perDay) {
        const at = freeTime(day, slots, plan, now);
        if (!at) break;
        const video = queue.shift()!;
        plan.push({ ...video, at: at.toISOString(), status: "scheduled" });
        changes.push({ id: video.id, at: at.toISOString() });
      }
    }
    if (!changes.length) return setError(bank.length ? `${view === "mes" ? "Este mes" : "Esta semana"} ya no tiene huecos libres.` : "No quedan vídeos en el banco.");
    apply(changes);
  }

  const dragProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_TYPE, id);
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
      setDragging(id);
    },
    onDragEnd: () => {
      setDragging(null);
      setOver(null);
    },
  });

  const dropProps = (key: string, onDrop: (id: string) => void) => ({
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
      e.preventDefault();
      setOver(key);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (over !== key) setOver(key);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === key ? null : o));
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData(DRAG_TYPE) || dragging;
      setOver(null);
      if (id) onDrop(id);
    },
  });

  const picked = picking && list.find((v) => v.id === picking.id && v.at);

  // La hora de un vídeo programado; clic para cambiarla
  const timeLabel = (video: CalendarVideo, movable: boolean, hover: string) =>
    movable ? (
      <button type="button" title="Cambiar la hora" draggable={false}
        onClick={(e) => setPicking({ id: video.id, anchor: e.currentTarget.getBoundingClientRect() })}
        className={`pointer-events-auto -mx-1 shrink-0 rounded px-1 text-xs font-medium tabular-nums underline-offset-2 hover:underline ${hover}`}>
        {clock(new Date(video.at!))}
      </button>
    ) : (
      <span className="shrink-0 text-xs font-medium tabular-nums">
        {video.status === "published" ? "Publicado" : clock(new Date(video.at!))}
      </span>
    );

  const dayNumber = (day: Date, past: boolean, muted = false) => (
    <span className={`flex size-6 items-center justify-center rounded-full text-sm font-medium tabular-nums ${
      sameDay(day, today) ? "bg-fg text-canvas" : past || muted ? "text-fg-4" : "text-fg"
    }`}>
      {day.getDate()}
    </span>
  );

  // Vista de mes: cada día es una celda con sus vídeos en filas compactas
  const monthGrid = (
    <div className="overflow-x-auto">
      <div className="min-w-[840px] overflow-hidden rounded-lg border border-line">
        <div className="grid grid-cols-7 border-b border-line bg-surface-2">
          {days.slice(0, 7).map((d) => (
            <span key={d.getDay()} className="px-2 py-1.5 text-xs font-medium capitalize text-fg-3">
              {d.toLocaleDateString("es", { weekday: "short" }).replace(".", "")}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const key = day.toDateString();
            const past = isPast(day);
            const muted = !inView(day);
            const items = onDay(day);
            return (
              <div key={key} {...(past ? {} : dropProps(key, (id) => place(id, day)))}
                // Clic en un hueco vacío del día: elegir un vídeo del banco
                onClick={(e) => {
                  if (!past && e.target === e.currentTarget) setAdding({ day, anchor: new DOMRect(e.clientX, e.clientY, 0, 0) });
                }}
                className={`group/day ${past ? "" : "cursor-pointer"} flex min-h-[132px] flex-col gap-1 p-1.5 transition-colors duration-150 ${
                  i % 7 ? "border-l border-line" : ""
                } ${i >= 7 ? "border-t border-line" : ""} ${
                  over === key ? "bg-surface-3" : past || muted ? "bg-surface-2/40" : ""
                }`}>
                <div className="flex items-center justify-between">
                  {!past ? (
                    <button type="button" aria-label="Añadir un vídeo a este día" title="Añadir un vídeo"
                      onClick={(e) => setAdding({ day, anchor: e.currentTarget.getBoundingClientRect() })}
                      className="flex size-6 items-center justify-center rounded-md text-fg-3 opacity-0 transition-opacity group-hover/day:opacity-100 hover:bg-surface-3 hover:text-fg focus-visible:opacity-100">
                      <Plus className="size-4" strokeWidth={1.75} />
                    </button>
                  ) : <span />}
                  {dayNumber(day, past, muted)}
                </div>
                {items.map((video) => {
                  const published = video.status === "published";
                  const movable = !published && !past;
                  return (
                    <div key={video.id} {...(movable ? dragProps(video.id) : {})}
                      className={`group flex items-center gap-1.5 rounded-md bg-surface-2 p-1 pr-1.5 transition-colors hover:bg-surface-3 ${
                        movable ? "cursor-grab active:cursor-grabbing" : ""
                      } ${dragging === video.id ? "opacity-40" : ""} ${published ? "opacity-60" : ""}`}>
                      <div className="aspect-[9/16] w-5 shrink-0 overflow-hidden rounded-sm bg-surface-3">
                        <Thumb url={video.url} />
                      </div>
                      {timeLabel(video, movable, "hover:bg-surface-1")}
                      <span className="min-w-0 flex-1 truncate text-xs text-fg-2">{video.title}</span>
                      {movable && (
                        <button type="button" aria-label="Devolver al banco" title="Devolver al banco"
                          onClick={() => apply([{ id: video.id, at: null }])}
                          className="hidden shrink-0 text-fg-3 group-hover:block hover:text-fg">
                          <X className="size-3.5" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (!mounted) return <div className="flex-1" />;

  return (
    <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-line p-0.5">
              <button type="button" aria-label="Anterior" onClick={() => move(-1)}
                className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-surface-2 hover:text-fg">
                <ChevronLeft className="size-4" strokeWidth={1.75} />
              </button>
              <button type="button" onClick={() => setCursor(new Date())}
                className="h-7 rounded-md px-2.5 text-sm font-medium text-fg-2 hover:bg-surface-2 hover:text-fg">
                Hoy
              </button>
              <button type="button" aria-label="Siguiente" onClick={() => move(1)}
                className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-surface-2 hover:text-fg">
                <ChevronRight className="size-4" strokeWidth={1.75} />
              </button>
            </div>
            <h2 className="text-md font-medium first-letter:uppercase">
              {view === "mes" ? cursor.toLocaleDateString("es", { month: "long", year: "numeric" }) : weekLabel(startOfWeek(cursor))}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-line p-0.5">
              {(["mes", "semana"] as const).map((v) => (
                <button key={v} type="button" onClick={() => changeView(v)}
                  className={`flex h-7 items-center rounded-md px-2.5 text-sm font-medium capitalize transition-colors duration-150 ${
                    view === v ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg"
                  }`}>
                  {v}
                </button>
              ))}
            </div>
            <Button variant="primary" onClick={fill} disabled={bank.length === 0}>
              <Sparkles className="size-4" strokeWidth={1.75} />
              {view === "mes" ? "Llenar el mes" : "Llenar la semana"}
            </Button>
          </div>
        </div>

        {error && <Notice tone="danger">{error}</Notice>}

        {view === "mes" ? monthGrid : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[840px] grid-cols-7 gap-2">
            {days.map((day) => {
              const key = day.toDateString();
              const past = isPast(day);
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
                    {dayNumber(day, past)}
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
                          {timeLabel(video, movable, "hover:bg-[rgb(255_255_255/0.18)]")}
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
                    <button key={i} type="button" onClick={(e) => setAdding({ day, anchor: e.currentTarget.getBoundingClientRect() })}
                      className="flex h-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line text-center text-fg-4 transition-colors hover:border-line-strong hover:text-fg-2">
                      <Plus className="size-4" strokeWidth={1.75} />
                      <span className="text-2xs">Arrastra o elige</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        )}
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
      {adding && (
        <BankPicker anchor={adding.anchor} day={adding.day} videos={bank} thumb={(url) => <Thumb url={url} />}
          onClose={() => setAdding(null)}
          onPick={(id) => {
            setAdding(null);
            place(id, adding.day);
          }} />
      )}
      {picked && picking && (
        <TimePicker anchor={picking.anchor} day={new Date(picked.at!)} value={clock(new Date(picked.at!))}
          presets={slots} onClose={() => setPicking(null)}
          onSave={(at) => {
            setPicking(null);
            apply([{ id: picked.id, at: at.toISOString() }]);
          }} />
      )}
    </div>
  );
}
