"use client";

import { Captions, Download, MoreHorizontal, Share2, Trash2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
  id: string;
  title: string;
  url: string | null;
  downloadUrl: string | null;
  canEditSubtitles: boolean;
  onDelete: () => void;
};

const itemClasses =
  "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-fg transition-colors duration-150 hover:bg-surface-2 disabled:opacity-50";

function Item({ icon: Icon, children, ...props }: { icon: LucideIcon } & React.ComponentProps<"button">) {
  return (
    <button type="button" className={itemClasses} {...props}>
      <Icon className="size-4 text-fg-3" strokeWidth={1.75} />
      {children}
    </button>
  );
}

// Menú de tres puntos anclado a la esquina del vídeo.
export function VideoMenu({ id, title, url, downloadUrl, canEditSubtitles, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Se cierra al tocar fuera o con Escape
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  // En el móvil comparte el archivo de vídeo (WhatsApp, etc.); si no se puede, comparte o copia el enlace
  async function share() {
    if (!url) return;
    setSharing(true);
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `${title}.mp4`, { type: "video/mp4" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else if (navigator.share) {
        await navigator.share({ url, title });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Enlace copiado. Caduca en unas horas.");
      }
    } catch (e) {
      // Cancelar el menú de compartir no es un error
      if (!(e instanceof DOMException && e.name === "AbortError")) alert("No se pudo compartir el vídeo.");
    } finally {
      setSharing(false);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="absolute top-2 right-2 z-10">
      <button type="button" aria-label="Opciones" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex size-8 items-center justify-center rounded-md bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60">
        <MoreHorizontal className="size-4" strokeWidth={2} />
      </button>
      {open && (
        <div role="menu" className="absolute top-9 right-0 w-48 rounded-lg bg-surface-1 p-1 shadow-popover">
          {canEditSubtitles && (
            <Link href={`/videos/${id}`} className={itemClasses} role="menuitem">
              <Captions className="size-4 text-fg-3" strokeWidth={1.75} />
              Editar subtítulos
            </Link>
          )}
          {url && (
            <Item icon={Share2} onClick={share} disabled={sharing} role="menuitem">
              {sharing ? "Preparando…" : "Compartir"}
            </Item>
          )}
          {downloadUrl && (
            <a href={downloadUrl} className={itemClasses} role="menuitem" onClick={() => setOpen(false)}>
              <Download className="size-4 text-fg-3" strokeWidth={1.75} />
              Descargar
            </a>
          )}
          <Item icon={Trash2} role="menuitem" onClick={() => {
            setOpen(false);
            if (confirm(`¿Borrar "${title}"?`)) onDelete();
          }}>
            Borrar vídeo
          </Item>
        </div>
      )}
    </div>
  );
}
