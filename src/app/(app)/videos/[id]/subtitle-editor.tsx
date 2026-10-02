"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import type { Line } from "@/lib/subtitles";
import { saveSubtitles } from "../actions";

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function SubtitleEditor({ id, url, lines }: { id: string; url: string; lines: Line[] }) {
  const router = useRouter();
  const player = useRef<HTMLVideoElement>(null);
  const [texts, setTexts] = useState(() => lines.map((l) => l.text));
  const [current, setCurrent] = useState(-1);
  const [remember, setRemember] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = texts.filter((t, i) => t.trim() !== lines[i].text).length;

  // Resalta la línea que está sonando
  useEffect(() => {
    const video = player.current;
    if (!video) return;
    const update = () => setCurrent(lines.findIndex((l) => video.currentTime >= l.start && video.currentTime < l.end + 0.2));
    video.addEventListener("timeupdate", update);
    return () => video.removeEventListener("timeupdate", update);
  }, [lines]);

  // Tocar el tiempo reproduce desde esa línea; al escribir en una línea solo se salta a ella, sin reproducir
  function seek(i: number, play: boolean) {
    const video = player.current;
    if (!video) return;
    video.currentTime = Math.max(0, lines[i].start - 0.1);
    if (play) video.play().catch(() => {});
    else video.pause();
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await saveSubtitles(id, texts, remember);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push("/videos");
  }

  return (
    <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
      <div className="md:sticky md:top-6 md:self-start">
        <video ref={player} src={url} controls playsInline preload="metadata"
          className="aspect-[9/16] w-full max-w-[280px] rounded-lg bg-surface-2 object-cover mx-auto" />
      </div>

      <div className="min-w-0 space-y-4">
        <div>
          <h2 className="text-md font-medium">Subtítulos</h2>
          <p className="text-sm text-fg-3">Toca una línea para ir a ese momento. Corrige el texto y guarda.</p>
        </div>

        {lines.length === 0 ? (
          <p className="text-sm text-fg-3">Este vídeo no tiene subtítulos.</p>
        ) : (
          <ol className="divide-y divide-line rounded-lg border border-line">
            {lines.map((line, i) => {
              const edited = texts[i].trim() !== line.text;
              return (
                <li key={i} className={`flex items-center gap-3 px-3 py-1.5 ${current === i ? "bg-surface-2" : ""}`}>
                  <button type="button" onClick={() => seek(i, true)}
                    className="w-10 shrink-0 text-left font-mono text-xs text-fg-3 tabular-nums hover:text-fg">
                    {clock(line.start)}
                  </button>
                  <input value={texts[i]} aria-label={`Línea ${i + 1}`}
                    onFocus={() => seek(i, false)}
                    onChange={(e) => setTexts((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                    className={`h-8 min-w-0 flex-1 rounded-md border bg-transparent px-2 text-md md:text-sm focus:outline-none ${
                      edited ? "border-fg-3 font-medium" : "border-transparent hover:border-line focus:border-line-strong"
                    }`} />
                </li>
              );
            })}
          </ol>
        )}

        <Checkbox checked={remember} onChange={setRemember}
          label="Recordar las correcciones para mis próximos vídeos"
          hint={<>Por ejemplo, &quot;Moba&quot; → &quot;Mova&quot;.</>} />

        {error && <Notice tone="danger">{error}</Notice>}

        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-fg-3">
            {changed === 0 ? "Sin cambios" : changed === 1 ? "1 línea corregida" : `${changed} líneas corregidas`}
          </span>
          <Button variant="primary" disabled={saving || changed === 0} onClick={save}>
            {saving ? "Guardando…" : "Guardar y actualizar vídeo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
