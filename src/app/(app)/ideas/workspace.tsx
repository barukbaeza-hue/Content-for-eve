"use client";

import { ArrowLeft, Eye } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";
import { Chat } from "./chat";
import { compact } from "./inspiracion/context";
import { Reel } from "./inspiracion/reel";
import type { Reference } from "./inspiracion/sample";
import type { ChatMessage } from "./types";

const desktopQuery = "(min-width: 768px)";
const subscribe = (change: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
};

// Ideas en el ordenador: Inspiración ocupa la página y el chat va abajo, en la misma página.
// Al abrir un vídeo se pasa al visor y el chat toma como contexto el vídeo que se está viendo.
// En el móvil solo se ve el chat; Inspiración tiene su propia pestaña.
export function Workspace({ items, initialMessages }: { items: Reference[]; initialMessages: ChatMessage[] }) {
  // Escritorio primero: en el servidor se pinta la versión de ordenador
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia(desktopQuery).matches, () => true);
  const [open, setOpen] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const context = desktop && open !== null ? items[current] : null;

  // La key reinicia el chat cuando se borra la conversación
  const chat = (
    <Chat key={initialMessages[0]?.id ?? "vacio"} initialMessages={initialMessages} docked={desktop}
      context={context} onClearContext={() => setOpen(null)} />
  );

  if (!desktop) return chat;

  return (
    <div className="relative flex-1">
      {open === null ? (
        <div className="no-scrollbar absolute inset-0 overflow-y-auto px-4 pt-4 pb-48">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Inspiración</h2>
            <p className="text-xs text-fg-3">Vídeos de tu nicho y tus referentes</p>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {items.map((item, i) => (
              <li key={item.id}>
                <Tile item={item} onOpen={() => {
                  setCurrent(i);
                  setOpen(i);
                }} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <Reel items={items} start={open} inset={152} onIndex={setCurrent} />
          <button type="button" onClick={() => setOpen(null)}
            className="absolute top-4 left-4 flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface-1 px-2.5 text-sm font-medium text-fg-2 transition-colors duration-150 hover:border-line-strong hover:text-fg">
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            Inspiración
          </button>
        </>
      )}
      {chat}
    </div>
  );
}

// Miniatura vertical: se reproduce en silencio al pasar el ratón
function Tile({ item, onOpen }: { item: Reference; onOpen: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  return (
    <button type="button" onClick={onOpen} aria-label={`Abrir el vídeo de @${item.handle}`}
      onMouseEnter={() => video.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const el = video.current;
        if (!el) return;
        el.pause();
        el.currentTime = 0.1;
      }}
      className="group block w-full text-left">
      <span className="relative block aspect-[9/16] overflow-hidden rounded-lg bg-surface-3">
        <video ref={video} src={`${item.url}#t=0.1`} muted loop playsInline preload="metadata"
          className="pointer-events-none size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-[rgb(0_0_0/0.65)] to-transparent px-2.5 pt-8 pb-2 text-xs font-medium text-white">
          <span className="flex min-w-0 items-center gap-1">
            {item.platform === "tiktok" ? <TikTokIcon className="size-3 shrink-0" /> : <InstagramIcon className="size-3 shrink-0" />}
            <span className="truncate">@{item.handle}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 tabular-nums">
            <Eye className="size-3.5" strokeWidth={1.75} />
            {compact.format(item.views)}
          </span>
        </span>
      </span>
      <span className="mt-1.5 line-clamp-2 text-sm text-fg-2 group-hover:text-fg">{item.caption}</span>
    </button>
  );
}
