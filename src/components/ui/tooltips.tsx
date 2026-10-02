"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Burbujas de ayuda propias (nunca el `title` del navegador). Cualquier elemento con `data-tip="…"`
// muestra su burbuja de cristal al pasar el ratón; este componente va una sola vez en el layout.
export function Tooltips() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: Element | null = null;
    const hide = () => {
      clearTimeout(timer);
      current = null;
      setTip(null);
    };
    const over = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-tip]");
      if (el === current) return;
      hide();
      if (!el) return;
      current = el;
      timer = setTimeout(() => {
        const text = el.getAttribute("data-tip");
        if (!text) return;
        const r = el.getBoundingClientRect();
        const below = r.top < 48;
        setTip({ text, x: r.left + r.width / 2, y: below ? r.bottom + 6 : r.top - 6, below });
      }, 450);
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mousedown", hide, true);
    window.addEventListener("scroll", hide, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mousedown", hide, true);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);

  if (!tip) return null;
  return createPortal(
    <div role="tooltip" style={{ left: tip.x, top: tip.y }}
      className={`glass pointer-events-none fixed z-[60] max-w-xs -translate-x-1/2 rounded-md px-2 py-1 text-xs text-fg ${
        tip.below ? "" : "-translate-y-full"
      }`}>
      {tip.text}
    </div>,
    document.body,
  );
}
