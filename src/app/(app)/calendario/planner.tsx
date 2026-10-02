"use client";

import type { DatesSetArg, EventContentArg, EventDropArg } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { Draggable, type DateClickArg, type DropArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Settings2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Notice } from "@/components/ui/notice";
import { menuClasses, menuItemClasses, menuSeparatorClasses } from "@/components/ui/menu";
import { scheduleVideos } from "./actions";
import { BankPicker } from "./bank-picker";
import { SettingsPopover } from "./settings-popover";
import { TimePicker } from "./time-picker";

export type CalendarVideo = {
  id: string;
  title: string;
  status: "ready" | "scheduled" | "published";
  url: string;
  duration: number | null;
  platforms: ("instagram" | "tiktok")[];
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
  const router = useRouter();
  const calendar = useRef<FullCalendar>(null);
  const bankRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "dayGridMonth" ? "dayGridMonth" : "timeGridWeek";
    } catch {
      return "timeGridWeek";
    }
  });
  const [title, setTitle] = useState("");
  // Días visibles: para marcar en ellos tus horas de publicación
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null);
  const [settingsAt, setSettingsAt] = useState<DOMRect | null>(null);
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

  // "Ahora" se actualiza cada minuto para que lo pasado se vaya marcando solo
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Tus horas de publicación de los días visibles, marcadas como huecos sugeridos (solo las que no han pasado)
  const suggested = useMemo(() => {
    if (!range || view !== "timeGridWeek") return [];
    const out: { id: string; start: string; end: string; display: "background"; classNames: string[] }[] = [];
    for (let d = new Date(range.start); d < range.end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      for (const t of slots) {
        const start = atTime(d, t);
        if (start.getTime() <= now) continue;
        out.push({
          id: `hueco-${start.toISOString()}`,
          start: start.toISOString(),
          end: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
          display: "background",
          classNames: ["mova-slot"],
        });
      }
    }
    return out;
  }, [range, view, slots, now]);

  const events = useMemo(() => [
    // Todo lo que ya pasó sale en un gris más claro y no admite vídeos
    { id: "pasado", start: "2000-01-01", end: new Date(now).toISOString(), display: "background", classNames: ["mova-past"] },
    ...suggested,
    ...list.filter((v) => v.at).map((v) => ({
      id: v.id,
      title: v.title,
      start: v.at!,
      editable: v.status === "scheduled" && new Date(v.at!).getTime() > now,
      extendedProps: { video: v },
    })),
  ], [list, now, suggested]);

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
      // Trae del servidor el calendario ya guardado, sin tener que recargar la página
      if (!result.error) router.refresh();
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

  // Hora del vídeo: clic para cambiarla (si aún no se ha publicado)
  const timeLabel = (video: CalendarVideo, movable: boolean, start: Date, className = "") =>
    movable ? (
      <button type="button" data-tip="Cambiar la hora"
        onClick={(e) => {
          e.stopPropagation();
          setPicking({ id: video.id, anchor: e.currentTarget.getBoundingClientRect() });
        }}
        className={`rounded tabular-nums hover:underline ${className}`}>
        {clock(start)}
      </button>
    ) : (
      <span className={`tabular-nums ${className}`}>{video.status === "published" ? "Publicado" : clock(start)}</span>
    );

  const badges = (video: CalendarVideo) => (
    <span className="flex flex-wrap gap-1">
      {video.platforms.map((p) => (
        <span key={p} className="rounded-full border border-line-strong px-1.5 text-2xs text-fg-3">{p === "instagram" ? "Instagram" : "TikTok"}</span>
      ))}
    </span>
  );

  // Cada vídeo es una tarjeta: miniatura, nombre, hora (clic para cambiarla), redes y × para devolverlo al banco
  function renderEvent({ event, view: current }: EventContentArg) {
    const video = event.extendedProps.video as CalendarVideo | undefined;
    if (!video) return null; // fondos: lo pasado y las horas sugeridas
    const movable = event.startEditable;
    const published = video.status === "published";
    const remove = movable && (
      <button type="button" aria-label="Devolver al banco" data-tip="Devolver al banco"
        onClick={(e) => {
          e.stopPropagation();
          apply([{ id: video.id, at: null }]);
        }}
        className="hidden size-5 shrink-0 items-center justify-center rounded text-fg-3 group-hover:flex hover:bg-surface-1 hover:text-fg">
        <X className="size-3.5" strokeWidth={2} />
      </button>
    );

    if (current.type === "dayGridMonth") {
      return (
        <div className={`mova-card group flex w-full min-w-0 items-center gap-1.5 rounded-md p-1 ${published ? "opacity-60" : ""}`}>
          <span className="aspect-[9/16] h-6 shrink-0 overflow-hidden rounded-sm bg-surface-3"><Thumb url={video.url} /></span>
          {timeLabel(video, movable, event.start!, "shrink-0 text-xs font-medium")}
          <span className="min-w-0 flex-1 truncate text-xs text-fg-2">{video.title}</span>
          {remove}
        </div>
      );
    }

    return (
      <div className={`mova-card group flex h-full w-full min-w-0 flex-col gap-1.5 overflow-hidden rounded-lg p-2 ${published ? "opacity-60" : ""}`}>
        <div className="flex min-w-0 items-start gap-2">
          <span className="aspect-[9/16] w-7 shrink-0 overflow-hidden rounded bg-surface-3"><Thumb url={video.url} /></span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-xs font-medium text-fg">{video.title}</p>
            {timeLabel(video, movable, event.start!, "text-2xs text-fg-3")}
          </div>
          {remove}
        </div>
        {badges(video)}
      </div>
    );
  }

  // Encabezado de cada día: píldora con el día y la fecha; hoy, invertida
  function renderDayHeader({ date, isToday, view: current }: { date: Date; isToday: boolean; view: { type: string } }) {
    const weekday = date.toLocaleDateString("es", { weekday: "short" }).replace(".", "");
    if (current.type === "dayGridMonth") return <span className="text-xs font-medium capitalize text-fg-3">{weekday}</span>;
    return (
      <span className={`flex w-full flex-col items-center rounded-lg py-1.5 ${isToday ? "bg-fg text-canvas" : "bg-surface-2 text-fg"}`}>
        <span className={`text-2xs font-medium uppercase ${isToday ? "" : "text-fg-3"}`}>{weekday}</span>
        <span className="text-sm font-medium tabular-nums">{date.getDate()}</span>
      </span>
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
        <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-line p-0.5">
          {([["timeGridWeek", "Semana"], ["dayGridMonth", "Mes"]] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => changeView(v)}
              className={`flex h-7 items-center rounded-md px-2.5 text-sm font-medium transition-colors duration-150 ${
                view === v ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg"
              }`}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" aria-label="Ajustes del calendario" data-tip="Horas de publicación y vídeos al día"
          onClick={(e) => setSettingsAt(settingsAt ? null : e.currentTarget.getBoundingClientRect())}
          className={`flex size-8 items-center justify-center rounded-lg border transition-colors duration-150 ${
            settingsAt ? "border-line-strong bg-surface-2 text-fg" : "border-line text-fg-3 hover:border-line-strong hover:text-fg"
          }`}>
          <Settings2 className="size-4" strokeWidth={1.75} />
        </button>
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
          defaultTimedEventDuration="01:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          slotEventOverlap={false}
          eventMinHeight={56}
          dayHeaderContent={renderDayHeader}
          nowIndicatorContent={(arg) => (arg.isAxis ? <span className="mova-now">{clock(arg.date)}</span> : null)}
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          events={events}
          eventContent={renderEvent}
          eventDisplay="block"
          editable
          eventDurationEditable={false}
          droppable
          datesSet={(arg: DatesSetArg) => {
            setTitle(arg.view.title);
            setRange({ start: arg.start, end: arg.end });
          }}
          // No se programa en el pasado
          // En el mes vale cualquier día que no haya terminado; en la semana, solo horas futuras
          eventAllow={(span) => (span.allDay ? span.end : span.start) > new Date()}
          dropAccept="[data-video]"
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
            if (!info.allDay && info.date <= today) return;
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
                  <li key={video.id} data-video={video.id} data-title={video.title} data-tip="Arrastra a un día"
                    className={`${menuItemClasses} group cursor-grab active:cursor-grabbing`}>
                    <span className="aspect-[9/16] h-6 shrink-0 overflow-hidden rounded-sm bg-surface-3">
                      <Thumb url={video.url} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{video.title}</span>
                    <span className="text-xs text-fg-3 tabular-nums group-hover:hidden">{seconds(video.duration)}</span>
                    <button type="button" aria-label="Programar en el próximo hueco" data-tip="Programar en el próximo hueco"
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

      {settingsAt && (
        <SettingsPopover anchor={settingsAt} perDay={perDay} times={slots} onClose={() => setSettingsAt(null)} />
      )}
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
