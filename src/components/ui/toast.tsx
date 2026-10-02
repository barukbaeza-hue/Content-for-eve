"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Avisos breves propios (nunca `alert` del navegador): toast("Texto") desde cualquier componente de cliente.
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("mova-toast", { detail: message }));
}

// Va una sola vez en el layout: muestra el aviso abajo, en cristal, durante unos segundos
export function Toaster() {
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => {
    const show = (e: Event) => setMessage({ text: (e as CustomEvent<string>).detail, id: Date.now() });
    window.addEventListener("mova-toast", show);
    return () => window.removeEventListener("mova-toast", show);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;
  return createPortal(
    <div role="status" key={message.id}
      className="glass fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm text-fg">
      {message.text}
    </div>,
    document.body,
  );
}
