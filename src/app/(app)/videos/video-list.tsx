"use client";

import { CircleAlert, CircleCheck, Clock, LoaderCircle, RotateCcw, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteVideo, retryVideo } from "./actions";
import { Lightbox } from "./lightbox";
import { Player } from "./player";
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
  const working = videos.some((v) => v.editStatus === "queued" || v.editStatus === "processing");

  // Mientras hay vídeos en edición, la lista se actualiza sola.
  useEffect(() => {
    if (!working) return;
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [working, router]);

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {videos.map((video) => <VideoCard key={video.id} video={video} />)}
    </ul>
  );
}

// Tarjeta a sangre: el nombre y el estado van sobre un degradado oscuro en la parte de abajo del vídeo.
function VideoCard({ video }: { video: VideoItem }) {
  const [pending, startTransition] = useTransition();
  const player = useRef<HTMLVideoElement>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const s = status(video);
  const Icon = s.icon;
  const busy = video.editStatus === "queued" || video.editStatus === "processing";

  const actions = {
    id: video.id,
    title: video.title,
    url: video.url,
    downloadUrl: video.downloadUrl,
    canEditSubtitles: video.canEditSubtitles && !busy,
    onDelete: () => startTransition(() => deleteVideo(video.id)),
  };

  // Doble clic amplía el vídeo en un lightbox y sigue desde el mismo punto
  function expand() {
    const v = player.current;
    if (!v) return;
    v.pause();
    setExpanded(v.currentTime);
  }

  const info = (hidden: boolean, padded: boolean) => (
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-[rgb(0_0_0/0.8)] via-[rgb(0_0_0/0.35)] to-transparent px-3 pt-16 text-[#fff] transition-opacity duration-200 ${
      padded ? "pb-7" : "pb-3"
    } ${hidden ? "opacity-0" : ""}`}>
      <p className="truncate text-sm font-medium">{video.title}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-[rgb(255_255_255/0.75)]">
        <Icon className={`size-3 ${s.spin ? "animate-spin" : ""}`} strokeWidth={1.75} />
        {s.label}
        {video.editStatus === "edited" && seconds(video.duration) && ` · ${seconds(video.duration)}`}
      </p>
      {video.error && (
        <p className="mt-1 line-clamp-2 text-xs text-[rgb(255_255_255/0.6)]" title={video.error}>{video.error}</p>
      )}
      {video.editStatus === "failed" && (
        <Button size="sm" variant="secondary" disabled={pending} className="pointer-events-auto mt-2"
          onClick={() => startTransition(() => retryVideo(video.id))}>
          <RotateCcw className="size-3.5" strokeWidth={1.75} />
          Reintentar
        </Button>
      )}
    </div>
  );

  return (
    <li className="group relative aspect-[9/16] min-w-0 overflow-hidden rounded-lg bg-surface-2">
      {video.url ? (
        <Player src={video.url} player={player} className="size-full" onDoubleClick={expand}
          overlay={({ playing, started }) => info(playing, started)} />
      ) : (
        <>
          <div className="flex size-full items-center justify-center pb-16 text-fg-3">
            <Icon className={`size-6 ${s.spin ? "animate-spin" : ""}`} strokeWidth={1.5} />
          </div>
          {info(false, false)}
        </>
      )}

      {video.url && expanded !== null && (
        <Lightbox {...actions} url={video.url} startAt={expanded} onClose={(time) => {
          if (player.current) player.current.currentTime = time;
          setExpanded(null);
        }} />
      )}

      <VideoMenu {...actions} />
    </li>
  );
}
