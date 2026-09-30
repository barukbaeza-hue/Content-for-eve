"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

// Reproductor propio: clic para reproducir o pausar y una barra de progreso que se puede arrastrar.
// `overlay` recibe si está sonando, para ocultar el nombre mientras se ve el vídeo.
export function Player({ src, player, startAt = 0, autoPlay = false, className = "", onDoubleClick, overlay }: {
  src: string;
  player?: RefObject<HTMLVideoElement | null>;
  startAt?: number;
  autoPlay?: boolean;
  className?: string;
  onDoubleClick?: () => void;
  overlay?: (state: { playing: boolean; started: boolean }) => ReactNode;
}) {
  const own = useRef<HTMLVideoElement>(null);
  const video = player ?? own;
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const started = playing || progress > 0;

  // Mientras suena, la barra avanza con cada fotograma para que se mueva suave
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const v = video.current;
      if (v?.duration) setProgress(v.currentTime / v.duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, video]);

  function toggle() {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  // Salta al punto de la barra donde está el puntero
  function seek(e: React.PointerEvent<HTMLDivElement>) {
    const v = video.current;
    if (!v?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setProgress(ratio);
  }

  return (
    <div className={`group/player relative overflow-hidden ${className}`}>
      <video ref={video} src={src} playsInline preload="metadata" autoPlay={autoPlay}
        className="size-full cursor-pointer object-cover"
        onClick={(e) => e.detail === 1 && toggle()}
        onDoubleClick={onDoubleClick}
        onLoadedMetadata={(e) => {
          if (startAt) e.currentTarget.currentTime = startAt;
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => e.currentTarget.duration && setProgress(e.currentTarget.currentTime / e.currentTarget.duration)}
        onEnded={() => setProgress(0)} />

      {!playing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-[rgb(0_0_0/0.35)] text-[#fff] opacity-0 backdrop-blur-md transition-opacity duration-150 group-hover/player:opacity-100">
            <Play className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
          </span>
        </div>
      )}

      {overlay?.({ playing, started })}

      {/* Barra de progreso: se ve mientras suena y, en pausa, al pasar el ratón */}
      <div role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
        className={`group/bar absolute inset-x-0 bottom-0 flex h-5 cursor-pointer items-end px-3 pb-2.5 transition-opacity duration-150 ${
          playing ? "opacity-100" : started ? "opacity-0 group-hover/player:opacity-100" : "pointer-events-none opacity-0"
        }`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seek(e);
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && seek(e)}>
        <div className="relative h-1 w-full rounded-full bg-[rgb(255_255_255/0.3)] transition-[height] group-hover/bar:h-1.5">
          <div className="h-full rounded-full bg-[#fff]" style={{ width: `${progress * 100}%` }} />
          <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff] opacity-0 shadow transition-opacity group-hover/bar:opacity-100"
            style={{ left: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
