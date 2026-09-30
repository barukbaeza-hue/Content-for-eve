"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

// Diálogo de confirmación de cristal: se abre encima de todo, con el fondo desenfocado.
export function ConfirmDialog({ open, title, description, confirmLabel, danger = false, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, onCancel]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(0_0_0/0.25)] p-4 backdrop-blur-sm sm:items-center"
      onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        className="glass w-full max-w-sm rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title" className="text-md font-medium">{title}</h2>
        {description && <p className="mt-1 text-sm text-fg-3">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} autoFocus>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
