"use client";

import { Captions, Download, MoreHorizontal, Pencil, Send, Share2, Trash2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { menuClasses, menuItemClasses, menuSeparatorClasses } from "@/components/ui/menu";
import type { TikTokSettings } from "@/lib/tiktok";
import type { Platform } from "./actions";
import { PostDialog } from "./post-dialog";
import { RenameDialog } from "./rename-dialog";


function Item({ icon: Icon, danger = false, children, ...props }: { icon: LucideIcon; danger?: boolean } & React.ComponentProps<"button">) {
  return (
    <button type="button" className={`${menuItemClasses} ${danger ? "text-danger" : ""}`} {...props}>
      <Icon className={`size-4 ${danger ? "text-danger" : "text-fg-3"}`} strokeWidth={1.75} />
      {children}
    </button>
  );
}

export type VideoActionsProps = {
  id: string;
  title: string;
  url: string | null;
  downloadUrl: string | null;
  canEditSubtitles: boolean;
  caption: string;
  platforms: Platform[];
  tiktok: TikTokSettings | null;
  duration: number | null;
  onDelete: () => void;
};

// En el móvil comparte el archivo de vídeo (WhatsApp, etc.); si no se puede, comparte o copia el enlace
async function shareVideo(url: string, title: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], `${title}.mp4`, { type: "video/mp4" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
    } else if (navigator.share) {
      await navigator.share({ url, title });
    } else {
      await navigator.clipboard.writeText(url);
      toast("Enlace copiado. Caduca en unas horas.");
    }
  } catch (e) {
    // Cancelar el menú de compartir no es un error
    if (!(e instanceof DOMException && e.name === "AbortError")) toast("No se pudo compartir el vídeo.");
  }
}

// Acciones de un vídeo con sus diálogos. Se usan en el menú de tres puntos y en el panel del lightbox.
// `render` recibe la lista de opciones; `onPick` se llama al elegir una (para cerrar el menú).
export function VideoActions({ id, title, url, downloadUrl, canEditSubtitles, caption, platforms, tiktok, duration, onDelete, onPick, render }: VideoActionsProps & {
  onPick?: () => void;
  render: (items: React.ReactNode, active: boolean) => React.ReactNode;
}) {
  const [sharing, setSharing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [posting, setPosting] = useState(false);

  const items = (
    <>
      <Item icon={Pencil} role="menuitem" onClick={() => {
        onPick?.();
        setRenaming(true);
      }}>
        Cambiar nombre
      </Item>
      <Item icon={Send} role="menuitem" onClick={() => {
        onPick?.();
        setPosting(true);
      }}>
        Descripción y redes
      </Item>
      {canEditSubtitles && (
        <Link href={`/videos/${id}`} className={menuItemClasses} role="menuitem">
          <Captions className="size-4 text-fg-3" strokeWidth={1.75} />
          Editar subtítulos
        </Link>
      )}
      {url && (
        <Item icon={Share2} disabled={sharing} role="menuitem" onClick={async () => {
          setSharing(true);
          await shareVideo(url, title);
          setSharing(false);
          onPick?.();
        }}>
          {sharing ? "Preparando…" : "Compartir"}
        </Item>
      )}
      {downloadUrl && (
        <a href={downloadUrl} className={menuItemClasses} role="menuitem" onClick={onPick}>
          <Download className="size-4 text-fg-3" strokeWidth={1.75} />
          Descargar
        </a>
      )}
      <div className={menuSeparatorClasses} />
      <Item icon={Trash2} danger role="menuitem" onClick={() => {
        onPick?.();
        setConfirming(true);
      }}>
        Borrar vídeo
      </Item>
    </>
  );

  return (
    <>
      {render(items, confirming || renaming || posting)}
      {posting && <PostDialog id={id} caption={caption} platforms={platforms} tiktok={tiktok} duration={duration}
        onClose={() => setPosting(false)} />}
      {renaming && <RenameDialog id={id} title={title} onClose={() => setRenaming(false)} />}
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
    </>
  );
}

// Menú de tres puntos anclado a la esquina del vídeo.
export function VideoMenu(props: VideoActionsProps) {
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

  return (
    <VideoActions {...props} onPick={close} render={(items, active) => (
      // Con ratón, los tres puntos aparecen al pasar por encima del vídeo; en pantallas táctiles siempre se ven
      <div className={`absolute top-2 right-2 z-10 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 ${
        open || active ? "opacity-100" : "[@media(hover:hover)]:opacity-0"
      }`}>
        <button ref={button} type="button" aria-label="Opciones" aria-expanded={open} onClick={toggle}
          className="flex size-8 items-center justify-center rounded-full bg-[rgb(0_0_0/0.35)] text-[#fff] backdrop-blur-md transition-colors hover:bg-[rgb(0_0_0/0.5)]">
          <MoreHorizontal className="size-4" strokeWidth={2} />
        </button>
        {position && createPortal(
          <div ref={menu} role="menu" style={{ top: position.top, right: position.right }}
            className={`${menuClasses} fixed z-40 w-52`}>
            {items}
          </div>,
          document.body,
        )}
      </div>
    )} />
  );
}
