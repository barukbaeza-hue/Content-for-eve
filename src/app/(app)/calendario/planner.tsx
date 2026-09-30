"use client";

import type { DatesSetArg, EventContentArg, EventDropArg } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { Draggable, type DateClickArg, type DropArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Notice } from "@/components/ui/notice";
import { menuClasses, menuItemClasses, menuSeparatorClasses } from "@/components/ui/menu";
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
type View = "dayGridMonth" | "timeGridWeek";

const noop = () => () => {};
const VIEW_KEY = "mova.calendario.vista";

// Todas las fechas en la hora local del navegador
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

// Calendario sobre FullCalendar (vista de mes y de semana, arrastrar y soltar) con el banco de vídeos flotando encima.
export function Planner({ videos, perDay, times }: { videos: CalendarVideo[]; perDay: number; times: string[] }) {
  // El calendario depende de la hora y la zona horaria del navegador: se dibuja solo en el cliente
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const calendar = useRef<FullCalendar>(null);
  const bankRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "timeGridWeek" ? "timeGridWeek" : "dayGridMonth";
    } catch {
      return "dayGridMonth";
    }
  });
  const [title, setTitle] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [bankOpen, setBankOpen] = useState(true);
  const [picking, setPicking] = useState<{ id: string; anchor: DOMRect } | null>(null);
  const [adding, setAdding] = useState<{ day: Date; time: Date | null; anchor: DOMRect } | null>(null);
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

  const events = useMemo(() => {
    const now = new Date();
    return list.filter((v) => v.at).map((v) => ({
      id: v.id,
      title: v.title,
      start: v.at!,
      editable: v.status === "scheduled" && new Date(v.at!) > now,
      extendedProps: { video: v },
    }));
  }, [list]);

  // Los vídeos del banco se pueden arrastrar al calendario
  useEffect(() => {
    if (!mounted || !bankRef.current) return;
    const draggable = new Draggable(bankRef.current, {
      itemSelector: "[data-video]",
      eventData: (el) => ({ id: el.dataset.video, title: el.dataset.title, create: false }),
    });
    return () => draggable.destroy();
  }, [mounted, bankOpen]);

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

  // En el mes se elige la primera hora libre del día; en la semana, la hora donde se suelta
  function place(id: string, date: Date, allDay: boolean) {
    const now = new Date();
    if (!allDay) {
      if (date <= now) return setError("Esa hora ya pasó.");
      return apply([{ id, at: date.toISOString() }]);
    }
    const at = freeTime(date, slots, list.filter((v) => v.id !== id), now);
    if (!at) return setError("Ese día ya no tiene horas libres.");
    apply([{ id, at: at.toISOString() }]);
  }

  // Al primer día con hueco desde hoy (para el botón + del banco)
  function placeNext(id: string) {
    const now = new Date();
    for (let i = 0; i < 120; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const count = list.filter((v) => v.at && sameDay(new Date(v.at), day)).length;
      if (count >= perDay) continue;
      const at = freeTime(day, slots, list, now);
      if (at) return apply([{ id, at: at.toISOString() }]);
    }
  }

  function changeView(next: View) {
    setView(next);
    calendar.current?.getApi().changeView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {}
  }

  const insideBank = (x: number, y: number) => {
    const r = bankRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  // Cada vídeo en el calendario: miniatura, hora (clic para cambiarla), nombre y × para devolverlo al banco
  function renderEvent({ event }: EventContentArg) {
    const video = event.extendedProps.video as CalendarVideo;
    const movable = event.startEditable;
    const time = video.status === "published" ? "Publicado" : clock(event.start!);
    return (
      <div className={`group flex w-full min-w-0 items-center gap-1.5 overflow-hidden p-1 ${video.status === "published" ? "opacity-60" : ""}`}>
        <span className="aspect-[9/16] h-6 shrink-0 overflow-hidden rounded-sm bg-surface-3">
          <Thumb url={video.url} />
        </span>
        {movable ? (
          <button type="button" title="Cambiar la hora"
            onClick={(e) => {
              e.stopPropagation();
              setPicking({ id: video.id, anchor: e.currentTarget.getBoundingClientRect() });
            }}
            className="shrink-0 rounded px-0.5 text-xs font-medium tabular-nums hover:underline">
            {time}
          </button>
        ) : (
          <span className="shrink-0 text-xs font-medium tabular-nums">{time}</span>
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-fg-2">{video.title}</span>
        {movable && (
          <button type="button" aria-label="Devolver al banco" title="Devolver al banco"
            onClick={(e) => {
              e.stopPropagation();
              apply([{ id: video.id, at: null }]);
            }}
            className="hidden shrink-0 text-fg-3 group-hover:block hover:text-fg">
            <X className="size-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
    );
  }

  const picked = picking && list.find((v) => v.id === picking.id && v.at);

  if (!mounted) return <div className="flex-1" />;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-line p-0.5">
            <button type="button" aria-label="Anterior" onClick={() => calendar.current?.getApi().prev()}
              className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-surface-2 hover:text-fg">
              <ChevronLeft className="size-4" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={() => calendar.current?.getApi().today()}
              className="h-7 rounded-md px-2.5 text-sm font-medium text-fg-2 hover:bg-surface-2 hover:text-fg">
              Hoy
            </button>
            <button type="button" aria-label="Siguiente" onClick={() => calendar.current?.getApi().next()}
              className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-surface-2 hover:text-fg">
              <ChevronRight className="size-4" strokeWidth={1.75} />
            </button>
          </div>
          <h2 className="text-md font-medium first-letter:uppercase">{title}</h2>
        </div>
        <div className="flex gap-1 rounded-lg border border-line p-0.5">
          {([["dayGridMonth", "Mes"], ["timeGridWeek", "Semana"]] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => changeView(v)}
              className={`flex h-7 items-center rounded-md px-2.5 text-sm font-medium transition-colors duration-150 ${
                view === v ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      <div className="mova-calendar min-h-[560px] flex-1">
        <FullCalendar
          ref={calendar}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          locale={esLocale}
          firstDay={1}
          headerToolbar={false}
          height="100%"
          nowIndicator
          dayMaxEvents={4}
          fixedWeekCount={false}
          allDaySlot={false}
          slotMinTime="06:00:00"
          scrollTime="09:00:00"
          defaultTimedEventDuration="00:45"
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          events={events}
          eventContent={renderEvent}
          eventDisplay="block"
          editable
          eventDurationEditable={false}
          droppable
          datesSet={(arg: DatesSetArg) => setTitle(arg.view.title)}
          // No se programa en el pasado
          eventAllow={(span) => span.end > new Date()}
          eventDrop={(info: EventDropArg) => {
            if (info.event.start! <= new Date()) return info.revert();
            // En el mes, al cambiar de día se mantiene la hora
            apply([{ id: info.event.id, at: info.event.start!.toISOString() }]);
          }}
          eventDragStop={(info) => {
            // Soltar un vídeo programado sobre el banco lo devuelve al banco
            if (insideBank(info.jsEvent.clientX, info.jsEvent.clientY)) apply([{ id: info.event.id, at: null }]);
          }}
          drop={(info: DropArg) => {
            const id = info.draggedEl.dataset.video;
            if (id) place(id, info.date, info.allDay);
          }}
          dateClick={(info: DateClickArg) => {
            const day = new Date(info.date.getFullYear(), info.date.getMonth(), info.date.getDate());
            const today = new Date();
            if (day < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return;
            setAdding({
              day,
              time: info.allDay ? null : info.date,
              anchor: new DOMRect(info.jsEvent.clientX, info.jsEvent.clientY, 0, 0),
            });
          }}
        />
      </div>

      {/* Banco flotante: mismo menú de cristal que los tres puntos de los vídeos (clases compartidas) */}
      <aside ref={bankRef} className={`${menuClasses} fixed right-6 bottom-6 z-30 w-64`}>
        <button type="button" onClick={() => setBankOpen((o) => !o)} aria-expanded={bankOpen}
          className={`${menuItemClasses.replace("h-9 ", "")} py-1.5`}>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Banco</span>
            <span className="block text-xs text-fg-3">
              {bank.length === 1 ? "1 vídeo" : `${bank.length} vídeos`} · {daysLeft === 1 ? "1 día" : `${daysLeft} días`} de contenido
            </span>
          </span>
          <ChevronDown className={`size-4 text-fg-3 transition-transform duration-150 ${bankOpen ? "" : "rotate-180"}`} strokeWidth={1.75} />
        </button>

        {bankOpen && (
          <>
            <div className={menuSeparatorClasses} />
            {bank.length === 0 ? (
              <p className="px-2.5 py-2 text-sm text-fg-3">Sube vídeos en Vídeos y aparecerán aquí al terminar de editarse.</p>
            ) : (
              <ul className="no-scrollbar max-h-[50vh] overflow-y-auto">
                {bank.map((video) => (
                  <li key={video.id} data-video={video.id} data-title={video.title} title="Arrastra a un día"
                    className={`${menuItemClasses} group cursor-grab active:cursor-grabbing`}>
                    <span className="aspect-[9/16] h-6 shrink-0 overflow-hidden rounded-sm bg-surface-3">
                      <Thumb url={video.url} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{video.title}</span>
                    <span className="text-xs text-fg-3 tabular-nums group-hover:hidden">{seconds(video.duration)}</span>
                    <button type="button" aria-label="Programar en el próximo hueco" title="Programar en el próximo hueco"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => placeNext(video.id)}
                      className="hidden text-fg-3 group-hover:block hover:text-fg">
                      <Plus className="size-4" strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </aside>

      {adding && (
        <BankPicker anchor={adding.anchor} day={adding.day} videos={bank} thumb={(url) => <Thumb url={url} />}
          onClose={() => setAdding(null)}
          onPick={(id) => {
            setAdding(null);
            place(id, adding.time ?? adding.day, !adding.time);
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
