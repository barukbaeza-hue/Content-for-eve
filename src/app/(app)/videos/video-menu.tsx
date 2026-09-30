"use client";

import { Captions, Download, MoreHorizontal, Share2, Trash2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Props = {
  id: string;
  title: string;
  url: string | null;
  downloadUrl: string | null;
  canEditSubtitles: boolean;
  onDelete: () => void;
};

const itemClasses =
  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-fg transition-colors duration-150 " +
  "hover:bg-[rgb(128_128_128/0.16)] disabled:opacity-50";

function Item({ icon: Icon, danger = false, children, ...props }: { icon: LucideIcon; danger?: boolean } & React.ComponentProps<"button">) {
  return (
    <button type="button" className={`${itemClasses} ${danger ? "text-danger" : ""}`} {...props}>
      <Icon className={`size-4 ${danger ? "text-danger" : "text-fg-3"}`} strokeWidth={1.75} />
      {children}
    </button>
  );
}

// Menú de tres puntos anclado a la esquina del vídeo.
export function VideoMenu({ id, title, url, downloadUrl, canEditSubtitles, onDelete }: Props) {
  const [sharing, setSharing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Posición del menú en pantalla: se dibuja sobre la página para que la tarjeta no lo recorte
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const open = position !== null;
  const close = () => setPosition(null);

  function toggle() {
    if (open || !button.current) return close();
    const rect = button.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  }

  // Se cierra al tocar fuera, con Escape, al hacer scroll o al cambiar el tamaño de la ventana
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) close();
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", outside);
    document.addEventListener("touchstart", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("touchstart", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
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
      close();
    }
  }

  return (
    <div className="absolute top-2 right-2 z-10">
      <button ref={button} type="button" aria-label="Opciones" aria-expanded={open} onClick={toggle}
        className="flex size-8 items-center justify-center rounded-full bg-[rgb(0_0_0/0.35)] text-[#fff] backdrop-blur-md transition-colors hover:bg-[rgb(0_0_0/0.5)]">
        <MoreHorizontal className="size-4" strokeWidth={2} />
      </button>
      {position && createPortal(
        <div ref={menu} role="menu" style={{ top: position.top, right: position.right }}
          className="glass fixed z-40 w-52 rounded-xl p-1.5">
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
            <a href={downloadUrl} className={itemClasses} role="menuitem" onClick={close}>
              <Download className="size-4 text-fg-3" strokeWidth={1.75} />
              Descargar
            </a>
          )}
          <div className="mx-1 my-1 h-px bg-[var(--glass-line)]" />
          <Item icon={Trash2} danger role="menuitem" onClick={() => {
            close();
            setConfirming(true);
          }}>
            Borrar vídeo
          </Item>
        </div>,
        document.body,
      )}
      <ConfirmDialog
        open={confirming}
        title="¿Borrar este vídeo?"
        description={`"${title}" se borrará de tu banco. No se puede deshacer.`}
        confirmLabel="Borrar"
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onDelete();
        }}
      />
    </div>
  );
}
