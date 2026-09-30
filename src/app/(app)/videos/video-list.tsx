"use client";

import { CircleAlert, CircleCheck, Clock, LoaderCircle, RotateCcw, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteVideo, retryVideo } from "./actions";
import { VideoMenu } from "./video-menu";

export type VideoItem = {
  id: string;
  title: string;
  editStatus: "queued" | "processing" | "edited" | "failed" | null;
  job: "completa" | "subtitulos";
  error: string | null;
  duration: number | null;
  url: string | null;
  downloadUrl: string | null;
  canEditSubtitles: boolean;
  createdAt: string;
};

type Status = { label: string; icon: LucideIcon; spin?: boolean };

// La paleta es monocromática: el estado se distingue por el icono.
function status(video: VideoItem): Status {
  if (video.job === "subtitulos" && (video.editStatus === "queued" || video.editStatus === "processing")) {
    return { label: "Actualizando subtítulos…", icon: LoaderCircle, spin: true };
  }
  switch (video.editStatus) {
    case "processing":
      return { label: "Editando…", icon: LoaderCircle, spin: true };
    case "edited":
      return { label: "Listo", icon: CircleCheck };
    case "failed":
      return { label: "No se pudo editar", icon: CircleAlert };
    default:
      return { label: "En cola", icon: Clock };
  }
}

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
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {videos.map((video) => {
        const s = status(video);
        const Icon = s.icon;
        const busy = video.editStatus === "queued" || video.editStatus === "processing";
        return (
          <li key={video.id} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-line">
            <div className="group relative aspect-[9/16] bg-surface-2">
              {video.url ? (
                // Tocar el vídeo lo reproduce
                <video src={video.url} controls playsInline preload="metadata" className="size-full object-cover" />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 px-3 text-center text-fg-3">
                  <Icon className={`size-5 ${s.spin ? "animate-spin" : ""}`} strokeWidth={1.75} />
                  <span className="text-xs">{s.label}</span>
                </div>
              )}
              <VideoMenu
                id={video.id}
                title={video.title}
                url={video.url}
                downloadUrl={video.downloadUrl}
                canEditSubtitles={video.canEditSubtitles && !busy}
                onDelete={() => startTransition(() => deleteVideo(video.id))}
              />
            </div>
            <div className="space-y-2 p-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{video.title}</p>
                <p className="flex items-center gap-1 text-xs text-fg-3">
                  <Icon className={`size-3 ${s.spin ? "animate-spin" : ""}`} strokeWidth={1.75} />
                  {s.label}
                  {video.editStatus === "edited" && seconds(video.duration) && ` · ${seconds(video.duration)}`}
                </p>
                {video.error && (
                  <p className="mt-1 line-clamp-2 text-xs text-fg-3" title={video.error}>{video.error}</p>
                )}
              </div>
              {video.editStatus === "failed" && (
                <Button size="sm" variant="secondary" disabled={pending}
                  onClick={() => startTransition(() => retryVideo(video.id))}>
                  <RotateCcw className="size-3.5" strokeWidth={1.75} />
                  Reintentar
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
