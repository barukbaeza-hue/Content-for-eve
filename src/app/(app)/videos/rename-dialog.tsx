"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renameVideo } from "./actions";

// Diálogo de cristal para ponerle al vídeo un nombre que lo identifique.
export function RenameDialog({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim() === title) return onClose();
    setSaving(true);
    const result = await renameVideo(id, value);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(0_0_0/0.25)] p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="rename-title" onSubmit={save}
        className="glass w-full max-w-sm rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
        <h2 id="rename-title" className="text-md font-medium">Cambiar nombre</h2>
        <Input className="mt-3" value={value} maxLength={120} autoFocus disabled={saving}
          onFocus={(e) => e.target.select()} onChange={(e) => setValue(e.target.value)}
          placeholder="Por ejemplo: Hablado a cámara sobre Mova" />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving || !value.trim()}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
