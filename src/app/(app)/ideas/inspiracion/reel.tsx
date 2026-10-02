"use client";

import { ChevronDown, ChevronUp, Eye, Heart, MessageCircle, Play, Share2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";
import { compact } from "./context";
import type { Reference } from "./sample";

// Visor estilo TikTok: un vídeo por pantalla, se pasa con la rueda, las flechas o el teclado.
// Solo se reproduce el que está en pantalla. `inset` deja sitio abajo (por ejemplo, para el chat del móvil).
export function Reel({ items, start = 0, inset = 24, onIndex }: {
  items: Reference[];
  start?: number;
  inset?: number;
  onIndex?: (index: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  const [muted, setMuted] = useState(true);

  // Empieza en el vídeo elegido
  useEffect(() => {
    scroller.current?.querySelector(`[data-index="${start}"]`)?.scrollIntoView({ behavior: "instant" });
  }, [start]);

  // El vídeo que ocupa la pantalla es el activo
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = Number((entry.target as HTMLElement).dataset.index);
          setIndex(i);
          onIndex?.(i);
        }
      },
      { root: box, threshold: 0.6 },
    );
    box.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onIndex]);

  const go = (step: number) => {
    const next = Math.min(Math.max(index + step, 0), items.length - 1);
    scroller.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ behavior: "smooth" });
  };

  // Flechas del teclado para pasar de vídeo (salvo mientras se escribe)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("textarea, input")) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      go(e.key === "ArrowDown" ? 1 : -1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <>
      <div ref={scroller} className="no-scrollbar absolute inset-0 snap-y snap-mandatory overflow-y-auto">
        {items.map((item, i) => (
          <Slide key={item.id} item={item} index={i} active={i === index} muted={muted} inset={inset} onMute={() => setMuted((m) => !m)} />
        ))}
      </div>
      <div className="absolute top-1/2 right-6 hidden -translate-y-1/2 flex-col gap-2 md:flex">
        {([[-1, ChevronUp, "Vídeo anterior"], [1, ChevronDown, "Vídeo siguiente"]] as const).map(([step, Icon, label]) => (
          <button key={label} type="button" aria-label={label} data-tip={label} data-tip-side="left"
            onClick={() => go(step)} disabled={step < 0 ? index === 0 : index === items.length - 1}
            className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-fg-2 transition-colors duration-150 hover:bg-surface-3 hover:text-fg disabled:opacity-30">
            <Icon className="size-5" strokeWidth={1.75} />
          </button>
        ))}
      </div>
    </>
  );
}

function Slide({ item, index, active, muted, inset, onMute }: {
  item: Reference;
  index: number;
  active: boolean;
  muted: boolean;
  inset: number;
  onMute: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  // Solo se reproduce el vídeo que está en pantalla; al salir vuelve al principio
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (active) {
      el.play().then(() => setPaused(false)).catch(() => setPaused(true));
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [active]);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) el.play().then(() => setPaused(false)).catch(() => {});
    else {
      el.pause();
      setPaused(true);
    }
  };

  const posted = new Date(item.postedAt).toLocaleDateString("es", { day: "numeric", month: "short" }).replace(".", "");
  const stats = [
    { icon: Heart, label: "Me gusta", value: item.likes },
    { icon: MessageCircle, label: "Comentarios", value: item.comments },
    { icon: Share2, label: "Compartidos", value: item.shares },
    { icon: Eye, label: "Visualizaciones", value: item.views },
  ];

  return (
    <div data-index={index} style={{ paddingBottom: inset }} className="flex h-full snap-start snap-always items-end justify-center gap-4 px-4 pt-4">
      <div className="relative h-full aspect-[9/16] max-w-full overflow-hidden rounded-xl bg-black">
        <video ref={video} src={item.url} muted={muted} loop playsInline preload={active ? "auto" : "metadata"}
          onClick={toggle} className="size-full cursor-pointer object-cover" />

        {paused && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-[rgb(0_0_0/0.45)] text-white backdrop-blur-sm">
              <Play className="ml-0.5 size-6 fill-current" strokeWidth={1.5} />
            </span>
          </span>
        )}

        <button type="button" onClick={onMute} aria-label={muted ? "Activar sonido" : "Silenciar"}
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-[rgb(0_0_0/0.4)] text-white backdrop-blur-sm transition-colors duration-150 hover:bg-[rgb(0_0_0/0.6)]">
          {muted ? <VolumeX className="size-4" strokeWidth={1.75} /> : <Volume2 className="size-4" strokeWidth={1.75} />}
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgb(0_0_0/0.7)] to-transparent px-4 pt-16 pb-4 text-white">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {item.platform === "tiktok" ? <TikTokIcon className="size-3.5" /> : <InstagramIcon className="size-3.5" />}
            @{item.handle}
            <span className="font-normal text-[rgb(255_255_255/0.6)]">· {posted}</span>
          </p>
          <p className="mt-1 line-clamp-3 text-sm text-[rgb(255_255_255/0.9)]">{item.caption}</p>
        </div>
      </div>

      {/* Cifras públicas del vídeo */}
      <div className="hidden flex-col gap-4 pb-2 sm:flex">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} data-tip={label} data-tip-side="right" className="flex flex-col items-center gap-1">
            <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-fg-2">
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <span className="text-xs font-medium text-fg-2 tabular-nums">{compact.format(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
