"use client";

import { Minus, Music2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type Block = { start: number; end: number };

function stamp(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Separación entre marcas de la regla: la más corta que deje al menos ~56 px entre etiquetas
const STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60];
const LABEL = 72; // ancho de la columna con el nombre de cada pista

// Timeline del Studio: regla de tiempo, pistas de vídeo (tramos que quedaron), subtítulos y música, y el cabezal.
// Clic o arrastre para moverse por el vídeo; clic en una línea de subtítulos para editarla.
export function Timeline({ duration, time, segments, lines, texts, music, selected, onSeek, onSelect }: {
  duration: number;
  time: number;
  segments: Block[];
  lines: Block[];
  texts: string[];
  music: { titulo: string; artistas: string[] } | null;
  selected: number;
  onSeek: (time: number) => void;
  onSelect: (index: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  const dragging = useRef(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Con zoom 1 el vídeo entero cabe a lo ancho
  const pps = (Math.max(200, width - LABEL - 24) / Math.max(1, duration)) * zoom;
  const step = STEPS.find((s) => s * pps >= 56) ?? 60;
  const ticks = Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step);
  const x = (t: number) => LABEL + t * pps;

  // Al reproducir con zoom, el cabezal no se sale de la vista
  useEffect(() => {
    const el = scroller.current;
    if (!el || dragging.current) return;
    const px = x(time);
    if (px < el.scrollLeft + LABEL || px > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = px - LABEL - 40;
  });

  const timeAt = (clientX: number) => {
    const el = scroller.current!;
    const rect = el.getBoundingClientRect();
    return Math.min(duration, Math.max(0, (clientX - rect.left + el.scrollLeft - LABEL) / pps));
  };

  const track = (label: string, content: React.ReactNode) => (
    <div className="relative h-10 border-t border-line">
      <span className="sticky left-0 z-10 flex h-full w-[72px] items-center bg-surface-1 pl-3 text-xs text-fg-3">{label}</span>
      {content}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="text-xs font-medium tabular-nums text-fg-2">{stamp(time)} / {stamp(duration)}</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Alejar" data-tip="Alejar" onClick={() => setZoom((z) => Math.max(1, z / 1.5))} disabled={zoom <= 1}
            className="flex size-6 items-center justify-center rounded text-fg-3 hover:bg-surface-2 hover:text-fg disabled:opacity-30">
            <Minus className="size-3.5" strokeWidth={2} />
          </button>
          <button type="button" aria-label="Acercar" data-tip="Acercar" onClick={() => setZoom((z) => Math.min(12, z * 1.5))} disabled={zoom >= 12}
            className="flex size-6 items-center justify-center rounded text-fg-3 hover:bg-surface-2 hover:text-fg disabled:opacity-30">
            <Plus className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div ref={scroller} className="no-scrollbar relative min-h-0 flex-1 cursor-text overflow-x-auto overflow-y-hidden select-none"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-line]")) return;
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          onSeek(timeAt(e.clientX));
        }}
        onPointerMove={(e) => dragging.current && onSeek(timeAt(e.clientX))}
        onPointerUp={() => (dragging.current = false)}>
        <div className="relative" style={{ width: x(duration) + 24 }}>
          {/* Regla */}
          <div className="relative h-6">
            <span className="sticky left-0 z-10 block h-full w-[72px] bg-surface-1" />
            {ticks.map((t) => (
              <span key={t} style={{ left: x(t) }} className="absolute top-0 flex h-full items-end pb-1">
                <span className="absolute bottom-0 h-1.5 w-px bg-line-strong" />
                <span className="ml-1 text-2xs tabular-nums text-fg-4">{stamp(t)}</span>
              </span>
            ))}
          </div>

          {track("Vídeo", segments.map((s, i) => (
            <span key={i} style={{ left: x(s.start) + 1, width: Math.max(2, (s.end - s.start) * pps - 2) }}
              className="absolute top-1.5 bottom-1.5 rounded-md bg-surface-3" />
          )))}

          {track("Subtítulos", lines.map((l, i) => (
            <button key={i} type="button" data-line onClick={() => { onSelect(i); onSeek(l.start); }}
              style={{ left: x(l.start) + 1, width: Math.max(6, (l.end - l.start) * pps - 2) }}
              className={`absolute top-1.5 bottom-1.5 truncate rounded-md px-1.5 text-left text-2xs transition-colors duration-100 ${
                selected === i ? "bg-fg text-canvas" : "bg-surface-2 text-fg-2 hover:bg-surface-3"
              }`}>
              {texts[i]}
            </button>
          )))}

          {track("Música", music ? (
            <span style={{ left: x(0) + 1, width: duration * pps - 2 }}
              className="absolute top-1.5 bottom-1.5 flex items-center gap-1.5 truncate rounded-md border border-dashed border-line-strong px-2 text-2xs text-fg-3">
              <Music2 className="size-3 shrink-0" strokeWidth={2} />
              {music.titulo}{music.artistas.length ? ` · ${music.artistas.join(", ")}` : ""}
            </span>
          ) : (
            <span style={{ left: x(0) + 8 }} className="absolute top-0 flex h-full items-center text-2xs text-fg-4">Sin música</span>
          ))}

          {/* Cabezal */}
          <span aria-hidden style={{ left: x(time) }} className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-fg">
            <span className="absolute -top-0.5 -left-[4px] size-[9px] rounded-full bg-fg" />
          </span>
        </div>
      </div>
    </div>
  );
}
