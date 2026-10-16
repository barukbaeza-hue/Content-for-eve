"use client";

import { ArrowUp, ChevronLeft, Music2, Pause, Play, Sparkles, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Logo } from "@/components/shell/logo";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import type { Line } from "@/lib/subtitles";
import type { TikTokSettings } from "@/lib/tiktok";
import type { Platform } from "../actions";
import { PostDialog } from "../post-dialog";
import { saveStudio, studioChat } from "./actions";
import { Timeline, type Block } from "./timeline";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  // Lo que cambió este mensaje y cómo estaba antes, para poder deshacerlo
  summary?: string;
  undo?: { texts: string[]; title: string };
};

const SUGGESTIONS = [
  "Corrige las palabras mal escritas",
  "Quita las muletillas de los subtítulos",
  "Ponle un título que enganche",
];

// El título sale arriba durante los primeros segundos (igual que en el worker).
// Tamaños en cqw (ancho del vídeo): el vídeo es 9:16, así 6cqw ≈ 3,4 % del alto, como en worker/src/subtitles.mjs
const TITLE_SECONDS = 3;

// Studio: chat con el asistente de edición, vista previa en vivo, panel de edición y timeline.
// La vista previa usa la copia sin subtítulos y dibuja encima los subtítulos y el título tal como van a quedar,
// así cada cambio se ve al instante. «Guardar» los pone en el vídeo (lo hace el worker, sin volver a editarlo).
export function Studio({ video, url, lines, segments, duration, music, post }: {
  video: { id: string; title: string; titulo: string | null };
  url: string;
  lines: Line[];
  segments: Block[];
  duration: number;
  music: { titulo: string; artistas: string[] } | null;
  post: { caption: string; platforms: Platform[]; tiktok: TikTokSettings | null; duration: number | null };
}) {
  const router = useRouter();
  const player = useRef<HTMLVideoElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const [texts, setTexts] = useState(() => lines.map((l) => l.text));
  const [title, setTitle] = useState(video.titulo ?? "");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [thinking, startThinking] = useTransition();
  const [remember, setRemember] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const nextId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  const changedLines = texts.filter((t, i) => t.trim() !== lines[i].text).length;
  const titleChanged = title.trim() !== (video.titulo ?? "");
  const changes = changedLines + (titleChanged ? 1 : 0);
  const current = lines.findIndex((l) => time >= l.start && time < l.end + 0.15);

  // Tiempo fino mientras se reproduce (timeupdate solo avisa ~4 veces por segundo)
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      setTime(player.current?.currentTime ?? 0);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // Espacio: reproducir o pausar (salvo mientras se escribe)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code !== "Space" || (e.target as HTMLElement).closest("input, textarea, button")) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, thinking]);

  // La línea elegida en la timeline se ve en el panel
  useEffect(() => {
    if (selected >= 0) listRef.current?.children[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function toggle() {
    const el = player.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  function seek(t: number) {
    const el = player.current;
    if (el) el.currentTime = t;
    setTime(t);
  }

  function send(value: string) {
    const request = value.trim();
    if (!request || thinking) return;
    const history = messages.map((m) => ({ role: m.role, content: m.summary ? `${m.content}\n(${m.summary})` : m.content }));
    setMessages((m) => [...m, { id: ++nextId.current, role: "user", content: request }]);
    setInput("");
    setChatError(null);
    startThinking(async () => {
      const result = await studioChat(texts, title.trim() || null, history, request);
      if ("error" in result) {
        setChatError(result.error);
        setInput(request);
        setMessages((m) => m.slice(0, -1));
        return;
      }
      const before = { texts, title };
      const nextTexts = [...texts];
      for (const change of result.lines) nextTexts[change.index] = change.text;
      const changedCount = result.lines.filter((c) => c.text !== texts[c.index]).length;
      const titleTouched = result.title !== undefined && (result.title ?? "") !== title;
      setTexts(nextTexts);
      if (titleTouched) setTitle(result.title ?? "");
      const parts = [
        changedCount ? (changedCount === 1 ? "1 línea" : `${changedCount} líneas`) : "",
        titleTouched ? (result.title ? "título" : "sin título") : "",
      ].filter(Boolean);
      setMessages((m) => [
        ...m,
        {
          id: ++nextId.current,
          role: "assistant",
          content: result.reply,
          ...(parts.length ? { summary: `Cambiado: ${parts.join(" y ")}`, undo: before } : {}),
        },
      ]);
    });
  }

  function undo(message: Message) {
    if (!message.undo) return;
    setTexts(message.undo.texts);
    setTitle(message.undo.title);
    setMessages((m) => m.map((x) => (x.id === message.id ? { ...x, undo: undefined, summary: `${x.summary} · deshecho` } : x)));
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const result = await saveStudio(video.id, texts, title.trim() || null, remember);
    if (result.error) {
      setSaveError(result.error);
      setSaving(false);
      return;
    }
    router.push("/videos");
  }

  return (
    <div className="relative flex-1">
      <div className="absolute inset-0 grid grid-cols-[300px_minmax(0,1fr)_300px] grid-rows-[44px_minmax(0,1fr)_minmax(0,190px)]">
        {/* Barra superior */}
        <header className="col-span-3 flex items-center justify-between gap-3 border-b border-line px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/videos" className={buttonClasses("ghost", "sm")}>
              <ChevronLeft className="size-4" strokeWidth={1.75} />
              Vídeos
            </Link>
            <span className="truncate text-sm font-medium">{video.title}</span>
            <span className="rounded-sm border border-line px-1.5 text-2xs font-medium text-fg-3">Studio</span>
          </div>
          <div className="flex items-center gap-3">
            {saveError && <span className="text-xs text-danger">{saveError}</span>}
            <span className="text-xs text-fg-3">{changes === 0 ? "Sin cambios" : changes === 1 ? "1 cambio" : `${changes} cambios`}</span>
            <Button size="sm" variant="secondary" onClick={() => setPostOpen(true)}>Descripción y redes</Button>
            <Button size="sm" variant="primary" disabled={saving || changes === 0} onClick={save}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </header>

        {/* Chat con el asistente */}
        <aside className="row-span-2 flex min-h-0 flex-col border-r border-line">
          <div className="flex h-10 shrink-0 items-center gap-2 px-3 text-sm font-medium">
            <Sparkles className="size-4 text-fg-3" strokeWidth={1.75} />
            Asistente
          </div>
          <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3">
            {messages.length === 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-fg-3">Pídeme cambios y los verás al momento en la vista previa. Nada se guarda hasta que pulses «Guardar».</p>
                <div className="flex flex-col items-start gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} disabled={thinking}
                      className="rounded-lg border border-line px-2.5 py-1 text-left text-sm text-fg-2 transition-colors duration-150 hover:border-line-strong hover:text-fg">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[90%] rounded-xl bg-surface-3 px-3 py-1.5 text-sm whitespace-pre-line">{m.content}</p>
                </div>
              ) : (
                <div key={m.id} className="flex gap-2">
                  <Logo className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm whitespace-pre-line">{m.content}</p>
                    {m.summary && (
                      <div className="flex items-center gap-2 text-xs text-fg-3">
                        <span>{m.summary}</span>
                        {m.undo && (
                          <button type="button" onClick={() => undo(m)} className="inline-flex items-center gap-1 rounded px-1 hover:bg-surface-2 hover:text-fg">
                            <Undo2 className="size-3" strokeWidth={2} />
                            Deshacer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            {thinking && (
              <div className="flex gap-2">
                <Logo className="mt-0.5 shrink-0" />
                <p className="animate-pulse text-sm text-fg-3">Editando…</p>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="space-y-2 border-t border-line p-2">
            {chatError && <Notice tone="danger">{chatError}</Notice>}
            <form onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-end gap-2 rounded-xl border border-line bg-surface-1 p-1.5 focus-within:border-line-strong">
              <textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} aria-label="Mensaje al asistente"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Qué quieres cambiar…"
                className="max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1 text-sm text-fg placeholder:text-fg-4 focus:outline-none" />
              <button type="submit" aria-label="Enviar" disabled={!input.trim() || thinking}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent hover:bg-accent-hover disabled:opacity-30">
                <ArrowUp className="size-4" strokeWidth={2} />
              </button>
            </form>
          </div>
        </aside>

        {/* Vista previa */}
        <section className="flex min-h-0 flex-col items-center justify-center gap-3 bg-canvas p-4">
          <div className="@container relative aspect-[9/16] h-full max-h-full max-w-full overflow-hidden rounded-lg bg-black">
            <video ref={player} src={url} playsInline preload="auto"
              onClick={toggle}
              onPlay={() => setPlaying(true)}
              onPause={() => { setPlaying(false); setTime(player.current?.currentTime ?? 0); }}
              onSeeked={() => setTime(player.current?.currentTime ?? 0)}
              className="size-full cursor-pointer object-cover" />
            {title.trim() && time < TITLE_SECONDS && (
              <p className="pointer-events-none absolute inset-x-[8%] top-[10%] text-center text-[6.4cqw] leading-tight font-semibold text-white [text-shadow:0_0_2cqw_rgb(0_0_0/0.55)]">
                {title}
              </p>
            )}
            {current >= 0 && texts[current]?.trim() && (
              <p className="pointer-events-none absolute inset-x-[8%] bottom-[30%] text-center text-[6cqw] leading-tight font-semibold tracking-[-0.01em] text-white [text-shadow:0_0_2cqw_rgb(0_0_0/0.55)]">
                {texts[current]}
              </p>
            )}
            {!playing && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-[rgb(0_0_0/0.45)] text-white backdrop-blur-sm">
                  <Play className="ml-0.5 size-5 fill-current" strokeWidth={1.5} />
                </span>
              </span>
            )}
          </div>
          <button type="button" onClick={toggle} aria-label={playing ? "Pausar" : "Reproducir"} data-tip="Espacio"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-fg-2 hover:border-line-strong hover:text-fg">
            {playing ? <Pause className="size-4" strokeWidth={2} /> : <Play className="ml-0.5 size-4" strokeWidth={2} />}
          </button>
        </section>

        {/* Panel de edición */}
        <aside className="no-scrollbar min-h-0 space-y-5 overflow-y-auto border-l border-line p-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg-3">Título</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sin título" maxLength={80}
              onFocus={() => seek(0)}
              className="h-8 w-full rounded-md border border-line bg-transparent px-2 text-sm focus:border-line-strong focus:outline-none" />
            <p className="text-xs text-fg-4">Sale arriba los primeros {TITLE_SECONDS} segundos.</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg-3">Música</p>
            {music ? (
              <p className="flex items-center gap-2 text-sm">
                <Music2 className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} />
                <span className="min-w-0 truncate">{music.titulo}</span>
              </p>
            ) : (
              <p className="text-sm text-fg-3">Sin música.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg-3">Subtítulos</p>
            {lines.length === 0 ? (
              <p className="text-sm text-fg-3">Este vídeo no tiene subtítulos.</p>
            ) : (
              <ol ref={listRef} className="space-y-0.5">
                {lines.map((line, i) => {
                  const edited = texts[i].trim() !== line.text;
                  return (
                    <li key={i}>
                      <input value={texts[i]} aria-label={`Línea ${i + 1}`}
                        onFocus={() => { setSelected(i); seek(line.start); player.current?.pause(); }}
                        onChange={(e) => setTexts((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                        className={`h-7 w-full rounded-md border px-2 text-sm focus:outline-none ${
                          selected === i || current === i ? "bg-surface-2" : "bg-transparent"
                        } ${edited ? "border-fg-3 font-medium" : "border-transparent hover:border-line focus:border-line-strong"}`} />
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="pt-2">
              <Checkbox checked={remember} onChange={setRemember} label="Recordar las correcciones" hint="Para tus próximos vídeos." />
            </div>
          </div>
        </aside>

        {/* Timeline */}
        <section className="col-span-2 min-h-0 border-t border-line">
          <Timeline duration={duration} time={time} segments={segments} lines={lines} texts={texts} music={music}
            selected={selected} onSeek={seek} onSelect={setSelected} />
        </section>
      </div>

      {postOpen && (
        <PostDialog id={video.id} caption={post.caption} platforms={post.platforms} tiktok={post.tiktok}
          duration={post.duration} onClose={() => { setPostOpen(false); router.refresh(); }} />
      )}
    </div>
  );
}
