"use client";

import { CircleAlert, CircleCheck, Clock, Download, LoaderCircle, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { deleteVideo, retryVideo } from "./actions";

export type VideoItem = {
  id: string;
  title: string;
  editStatus: "queued" | "processing" | "edited" | "failed" | null;
  error: string | null;
  duration: number | null;
  url: string | null;
  createdAt: string;
};

// La paleta es monocromática: el estado se distingue por el icono.
const STATUS: Record<NonNullable<VideoItem["editStatus"]>, { label: string; icon: LucideIcon; spin?: boolean }> = {
  queued: { label: "En cola", icon: Clock },
  processing: { label: "Editando…", icon: LoaderCircle, spin: true },
  edited: { label: "Listo", icon: CircleCheck },
  failed: { label: "No se pudo editar", icon: CircleAlert },
};

const REFRESH_MS = 8000;

function seconds(n: number | null) {
  if (!n) return null;
  const s = Math.round(n);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} s`;
}

export function VideoList({ videos }: { videos: VideoItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const working = videos.some((v) => v.editStatus === "queued" || v.editStatus === "processing");

  // Mientras hay vídeos en edición, la lista se actualiza sola.
  useEffect(() => {
    if (!working) return;
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [working, router]);

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {videos.map((video) => {
        const status = STATUS[video.editStatus ?? "queued"];
        const Icon = status.icon;
        return (
          <li key={video.id} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-line">
            <div className="relative aspect-[9/16] bg-surface-2">
              {video.url ? (
                <video src={video.url} controls playsInline preload="metadata" className="size-full object-cover" />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 px-3 text-center text-fg-3">
                  <Icon className={`size-5 ${status.spin ? "animate-spin" : ""}`} strokeWidth={1.75} />
                  <span className="text-xs">{status.label}</span>
                </div>
              )}
            </div>
            <div className="space-y-2 p-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{video.title}</p>
                <p className="flex items-center gap-1 text-xs text-fg-3">
                  <Icon className={`size-3 ${status.spin ? "animate-spin" : ""}`} strokeWidth={1.75} />
                  {status.label}
                  {video.editStatus === "edited" && seconds(video.duration) && ` · ${seconds(video.duration)}`}
                </p>
                {video.editStatus === "failed" && video.error && (
                  <p className="mt-1 line-clamp-2 text-xs text-fg-3" title={video.error}>{video.error}</p>
                )}
              </div>
              <div className="flex gap-1">
                {video.editStatus === "failed" && (
                  <Button size="sm" variant="secondary" disabled={pending}
                    onClick={() => startTransition(() => retryVideo(video.id))}>
                    <RotateCcw className="size-3.5" strokeWidth={1.75} />
                    Reintentar
                  </Button>
                )}
                {video.url && (
                  <a href={video.url} download className={buttonClasses("ghost", "sm")} aria-label="Descargar">
                    <Download className="size-3.5" strokeWidth={1.75} />
                  </a>
                )}
                <Button size="sm" variant="ghost" aria-label="Borrar" disabled={pending} className="ml-auto"
                  onClick={() => {
                    if (confirm(`¿Borrar "${video.title}"?`)) startTransition(() => deleteVideo(video.id));
                  }}>
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
