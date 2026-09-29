"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { prepareUploads, queueVideos, type UploadSlot } from "./actions";

type Item = { file: File; progress: number };

const CONCURRENCY = 2;

// Sube el archivo directamente a R2 con el enlace firmado, informando del progreso.
function put(url: string, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`R2 respondió ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Sin conexión con el almacenamiento"));
    xhr.send(file);
  });
}

function title(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function size(bytes: number) {
  return bytes > 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

export function Uploader() {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  function pick(files: FileList | null) {
    if (!files?.length) return;
    setDone(null);
    setError(null);
    setItems((prev) => [...prev, ...Array.from(files).map((file) => ({ file, progress: 0 }))]);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareUploads(items.map(({ file }) => ({ name: file.name, type: file.type, size: file.size })));
      if ("error" in prepared) throw new Error(prepared.error);

      // Varios a la vez, sin saturar la conexión del móvil
      const queue = prepared.slots.map((slot, index) => ({ slot, index }));
      const uploaded: (UploadSlot & { title: string })[] = [];
      await Promise.all(
        Array.from({ length: CONCURRENCY }, async () => {
          for (let next = queue.shift(); next; next = queue.shift()) {
            const { slot, index } = next;
            const { file } = items[index];
            await put(slot.url, file, (p) =>
              setItems((prev) => prev.map((it, i) => (i === index ? { ...it, progress: p } : it))),
            );
            uploaded.push({ ...slot, title: title(file.name) });
          }
        }),
      );

      const result = await queueVideos(uploaded, instructions);
      if (result.error) throw new Error(result.error);
      setDone(uploaded.length);
      setItems([]);
      setInstructions("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron subir los vídeos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-line p-4">
      <input ref={input} type="file" accept="video/*" multiple hidden onChange={(e) => {
        pick(e.target.files);
        e.target.value = "";
      }} />

      {items.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Sube tus vídeos grabados</p>
            <p className="text-sm text-fg-3">Mova los edita en cola: audio limpio, sin silencios y con subtítulos.</p>
          </div>
          <Button variant="primary" onClick={() => input.current?.click()}>
            <Upload className="size-4" strokeWidth={1.75} />
            Subir vídeos
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line rounded-md border border-line">
            {items.map(({ file, progress }, i) => (
              <li key={`${file.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{title(file.name)}</p>
                  {busy ? (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                  ) : (
                    <p className="text-xs text-fg-3">{size(file.size)}</p>
                  )}
                </div>
                {!busy && (
                  <button type="button" aria-label="Quitar" className="text-fg-3 hover:text-fg"
                    onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="size-4" strokeWidth={1.75} />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="space-y-1.5">
            <Label htmlFor="instructions">Indicaciones de edición (opcional)</Label>
            <Textarea id="instructions" rows={2} value={instructions} disabled={busy}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Por ejemplo: que las palabras aparezcan una a una" />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => input.current?.click()}>Añadir más</Button>
            <Button variant="primary" disabled={busy} onClick={submit}>
              {busy ? "Subiendo…" : `Subir y editar ${items.length === 1 ? "1 vídeo" : `${items.length} vídeos`}`}
            </Button>
          </div>
        </>
      )}

      {error && <Notice tone="danger">{error}</Notice>}
      {done !== null && (
        <Notice tone="success">
          {done === 1 ? "Vídeo en cola." : `${done} vídeos en cola.`} Aparecerán listos en tu banco cuando termine la edición.
        </Notice>
      )}
    </div>
  );
}
