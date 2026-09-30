"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { updatePost, type Platform } from "./actions";

const NETWORKS: { id: Platform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
];

// Texto que acompaña al vídeo al publicarse y redes donde sale.
export function PostDialog({ id, caption, platforms, onClose }: {
  id: string;
  caption: string;
  platforms: Platform[];
  onClose: () => void;
}) {
  const [text, setText] = useState(caption);
  const [chosen, setChosen] = useState<Platform[]>(platforms);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updatePost(id, text, chosen);
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
      <form role="dialog" aria-modal="true" aria-labelledby="post-title" onSubmit={save}
        className="glass w-full max-w-lg rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
        <h2 id="post-title" className="text-md font-medium">Descripción y redes</h2>
        <p className="mt-1 text-sm text-fg-3">Es el texto que sale con el vídeo al publicarse.</p>
        <Textarea className="mt-3 resize-none" rows={7} value={text} maxLength={2200} autoFocus disabled={saving}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe el texto de la publicación, con sus hashtags…" />
        <p className="mt-1 text-right text-xs text-fg-4 tabular-nums">{text.length} / 2.200</p>
        <div className="mt-2 flex gap-4">
          {NETWORKS.map((n) => (
            <label key={n.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={chosen.includes(n.id)} disabled={saving}
                onChange={(e) => setChosen((prev) => (e.target.checked ? [...prev, n.id] : prev.filter((p) => p !== n.id)))} />
              {n.label}
            </label>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving || !chosen.length}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
