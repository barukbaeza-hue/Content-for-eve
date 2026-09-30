"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Player } from "./player";

// Vista ampliada: el vídeo en vertical, grande y centrado, con el resto de la página desenfocado.
export function Lightbox({ src, title, startAt, onClose }: {
  src: string;
  title: string;
  startAt: number;
  onClose: (time: number) => void;
}) {
  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  });

  function close() {
    const video = document.querySelector<HTMLVideoElement>("[data-lightbox] video");
    onClose(video?.currentTime ?? startAt);
  }

  return createPortal(
    <div data-lightbox role="dialog" aria-modal="true" aria-label={title}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[rgb(0_0_0/0.6)] p-6 backdrop-blur-xl"
      onClick={close}>
      <button type="button" aria-label="Cerrar" onClick={close}
        className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-[rgb(255_255_255/0.12)] text-[#fff] transition-colors hover:bg-[rgb(255_255_255/0.2)]">
        <X className="size-4" strokeWidth={2} />
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        <Player src={src} startAt={startAt} autoPlay onDoubleClick={close}
          className="aspect-[9/16] h-[min(86vh,calc((100vw-3rem)*16/9))] rounded-xl shadow-2xl" />
      </div>
      <p className="max-w-md truncate text-sm font-medium text-[#fff]" onClick={(e) => e.stopPropagation()}>{title}</p>
    </div>,
    document.body,
  );
}
