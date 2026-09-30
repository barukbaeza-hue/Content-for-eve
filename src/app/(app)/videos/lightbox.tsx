"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Player } from "./player";
import { VideoActions, type VideoActionsProps } from "./video-menu";

// Vista ampliada: el vídeo en vertical, grande y centrado, con sus opciones al lado y el resto de la página desenfocado.
export function Lightbox({ startAt, onClose, ...video }: VideoActionsProps & {
  url: string;
  startAt: number;
  onClose: (time: number) => void;
}) {
  useEffect(() => {
    // Escape cierra el lightbox, salvo que haya un diálogo abierto encima
    const escape = (e: KeyboardEvent) =>
      e.key === "Escape" && !document.querySelector('[aria-modal="true"]:not([data-lightbox])') && close();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  });

  function close() {
    const player = document.querySelector<HTMLVideoElement>("[data-lightbox] video");
    onClose(player?.currentTime ?? startAt);
  }

  return createPortal(
    <div data-lightbox role="dialog" aria-modal="true" aria-label={video.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(0_0_0/0.6)] p-6 backdrop-blur-xl"
      onClick={close}>
      <button type="button" aria-label="Cerrar" onClick={close}
        className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-[rgb(255_255_255/0.12)] text-[#fff] transition-colors hover:bg-[rgb(255_255_255/0.2)]">
        <X className="size-4" strokeWidth={2} />
      </button>
      <div className="flex items-start gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-3">
          <Player src={video.url} startAt={startAt} autoPlay onDoubleClick={close}
            className="aspect-[9/16] h-[min(86vh,calc((100vw-18rem)*16/9))] rounded-xl shadow-2xl" />
          <p className="max-w-full truncate text-sm font-medium text-[#fff]">{video.title}</p>
        </div>
        {/* Las mismas opciones del menú de tres puntos, pegadas al vídeo */}
        <VideoActions {...video} onDelete={() => {
          close();
          video.onDelete();
        }} render={(items) => (
          <div role="menu" className="glass w-52 rounded-xl p-1.5">{items}</div>
        )} />
      </div>
    </div>,
    document.body,
  );
}
