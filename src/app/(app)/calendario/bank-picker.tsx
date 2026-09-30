"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { menuClasses, menuItemClasses, menuLabelClasses } from "@/components/ui/menu";

// Popover de cristal para elegir qué vídeo del banco va en un día, sin tener que arrastrar.
export function BankPicker({ anchor, day, videos, thumb, onPick, onClose }: {
  anchor: DOMRect;
  day: Date;
  videos: { id: string; title: string; url: string }[];
  thumb: (url: string) => React.ReactNode;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outside = (e: MouseEvent) => !box.current?.contains(e.target as Node) && onClose();
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const width = 256;
  const left = Math.min(Math.max(8, anchor.left), window.innerWidth - width - 8);
  const below = anchor.bottom + 6 + 300 < window.innerHeight;
  const style = below ? { top: anchor.bottom + 6, left } : { bottom: window.innerHeight - anchor.top + 6, left };

  return createPortal(
    <div ref={box} role="menu" style={{ ...style, width }} className={`${menuClasses} fixed z-40`}>
      <p className={menuLabelClasses}>
        {day.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
      </p>
      {videos.length === 0 ? (
        <p className="px-2.5 pb-2 text-sm text-fg-3">No quedan vídeos en el banco.</p>
      ) : (
        <ul className="no-scrollbar max-h-72 overflow-y-auto">
          {videos.map((video) => (
            <li key={video.id}>
              <button type="button" role="menuitem" onClick={() => onPick(video.id)}
                className={menuItemClasses}>
                <span className="aspect-[9/16] h-6 shrink-0 overflow-hidden rounded-sm bg-surface-3">{thumb(video.url)}</span>
                <span className="min-w-0 flex-1 truncate">{video.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}
