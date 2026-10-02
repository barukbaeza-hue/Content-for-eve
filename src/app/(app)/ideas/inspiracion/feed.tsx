"use client";

import { ArrowUp, ChevronDown, ChevronUp, Eye, Heart, MessageCircle, Play, Share2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Logo } from "@/components/shell/logo";
import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";
import { Notice } from "@/components/ui/notice";
import { sendMessage } from "../actions";
import { IdeaCard } from "../idea-card";
import type { ChatMessage } from "../types";
import type { Reference } from "./sample";

const compact = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
const PLATFORM = { tiktok: "TikTok", instagram: "Instagram" } as const;

const SUGGESTIONS = ["¿Por qué funciona?", "Adáptalo a mi marca", "Dame el guion en mi voz"];

// Lo que se le manda al agente: la pregunta con el vídeo como contexto (texto, cuenta y cifras; no ve el vídeo)
function withContext(item: Reference, question: string) {
  return [
    `Vídeo de referencia de @${item.handle} en ${PLATFORM[item.platform]}`,
    `(${compact.format(item.views)} visualizaciones, ${compact.format(item.likes)} me gusta, ${compact.format(item.comments)} comentarios).`,
    `Texto: "${item.caption}"`,
    "",
    question,
  ].join("\n");
}

// Feed de Inspiración estilo TikTok: un vídeo por pantalla, se pasa con la rueda, las flechas o el teclado.
// Abajo, un chat con el agente que tiene el vídeo actual como contexto; las ideas que salen se guardan como cualquier otra.
export function Feed({ items }: { items: Reference[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const tempId = useRef(0);

  const current = items[index];
  const thread = threads[current.id] ?? [];

  // El vídeo que ocupa la pantalla es el activo
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setIndex(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: box, threshold: 0.6 },
    );
    box.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const go = (step: number) => {
    const next = Math.min(Math.max(index + step, 0), items.length - 1);
    scroller.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ behavior: "smooth" });
  };

  // Flechas del teclado para pasar de vídeo (salvo mientras se escribe)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("textarea, input")) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      go(e.key === "ArrowDown" ? 1 : -1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, pendingId]);

  const send = (value: string) => {
    const question = value.trim();
    if (!question || pendingId) return;
    const item = current;
    const temp: ChatMessage = { id: `temp-${++tempId.current}`, role: "user", content: question, ideas: [] };
    setThreads((t) => ({ ...t, [item.id]: [...(t[item.id] ?? []), temp] }));
    setText("");
    setError(null);
    setOpen(true);
    setPendingId(item.id);

    startTransition(async () => {
      const result = await sendMessage(withContext(item, question));
      setPendingId(null);
      if ("error" in result) {
        setThreads((t) => ({ ...t, [item.id]: (t[item.id] ?? []).filter((m) => m.id !== temp.id) }));
        setText(question);
        setError(result.error);
        return;
      }
      // Se muestra la pregunta tal cual la escribió (sin el contexto que se añade para el agente)
      const [, answer] = result.messages;
      setThreads((t) => ({ ...t, [item.id]: [...(t[item.id] ?? []), ...(answer ? [answer] : [])] }));
    });
  };

  return (
    <div className="relative flex-1">
      <div ref={scroller} className="no-scrollbar absolute inset-0 snap-y snap-mandatory overflow-y-auto">
        {items.map((item, i) => (
          <Slide key={item.id} item={item} index={i} active={i === index} muted={muted} onMute={() => setMuted((m) => !m)} />
        ))}
      </div>

      {/* Pasar de vídeo */}
      <div className="absolute top-1/2 right-6 hidden -translate-y-1/2 flex-col gap-2 md:flex">
        {([[-1, ChevronUp, "Vídeo anterior"], [1, ChevronDown, "Vídeo siguiente"]] as const).map(([step, Icon, label]) => (
          <button key={label} type="button" aria-label={label} data-tip={label} data-tip-side="left"
            onClick={() => go(step)} disabled={step < 0 ? index === 0 : index === items.length - 1}
            className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-fg-2 transition-colors duration-150 hover:bg-surface-3 hover:text-fg disabled:opacity-30">
            <Icon className="size-5" strokeWidth={1.75} />
          </button>
        ))}
      </div>

      {/* Chat sobre el vídeo actual */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl space-y-2">
          {thread.length > 0 && (
            <section className="glass overflow-hidden rounded-xl">
              <header className="flex h-10 items-center justify-between gap-2 pr-1.5 pl-3.5">
                <p className="truncate text-sm text-fg-2">Sobre el vídeo de <span className="font-medium text-fg">@{current.handle}</span></p>
                <button type="button" aria-label={open ? "Ocultar conversación" : "Mostrar conversación"} onClick={() => setOpen((o) => !o)}
                  className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-[rgb(128_128_128/0.14)] hover:text-fg">
                  {open ? <ChevronDown className="size-4" strokeWidth={1.75} /> : <ChevronUp className="size-4" strokeWidth={1.75} />}
                </button>
              </header>
              {open && (
                <div className="no-scrollbar max-h-[42vh] space-y-5 overflow-y-auto px-3.5 pb-4">
                  {thread.map((message) =>
                    message.role === "user" ? (
                      <div key={message.id} className="flex justify-end">
                        <p className="max-w-[85%] rounded-xl bg-surface-3 px-3 py-1.5 text-sm whitespace-pre-line">{message.content}</p>
                      </div>
                    ) : (
                      <div key={message.id} className="flex gap-2.5">
                        <Logo className="mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-2.5">
                          <p className="text-sm whitespace-pre-line">{message.content}</p>
                          {message.ideas.map((idea, i) => <IdeaCard key={i} idea={idea} messageId={message.id} index={i} />)}
                        </div>
                      </div>
                    ),
                  )}
                  {pendingId === current.id && (
                    <div className="flex gap-2.5">
                      <Logo className="mt-0.5 shrink-0" />
                      <p className="animate-pulse text-sm text-fg-3">Pensando…</p>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              )}
            </section>
          )}

          {error && <Notice tone="danger">{error}</Notice>}

          {thread.length === 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={Boolean(pendingId)}
                  className="glass rounded-full px-3 py-1 text-sm text-fg-2 transition-colors duration-150 hover:text-fg disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="glass flex items-end gap-2 rounded-xl p-2">
            <span className="mb-1.5 ml-1 flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-[rgb(128_128_128/0.14)] px-2 text-xs text-fg-2">
              {current.platform === "tiktok" ? <TikTokIcon className="size-3" /> : <InstagramIcon className="size-3" />}
              @{current.handle}
            </span>
            <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(text);
                }
              }}
              placeholder="Pregunta sobre este vídeo o pide ideas a partir de él…" aria-label="Mensaje sobre el vídeo"
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 text-base text-fg placeholder:text-fg-4 focus:outline-none" />
            <button type="submit" disabled={!text.trim() || Boolean(pendingId)} aria-label="Enviar"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-30">
              <ArrowUp className="size-4" strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Slide({ item, index, active, muted, onMute }: {
  item: Reference;
  index: number;
  active: boolean;
  muted: boolean;
  onMute: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  // Solo se reproduce el vídeo que está en pantalla; al salir vuelve al principio
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (active) {
      el.play().then(() => setPaused(false)).catch(() => setPaused(true));
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [active]);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) el.play().then(() => setPaused(false)).catch(() => {});
    else {
      el.pause();
      setPaused(true);
    }
  };

  const posted = new Date(item.postedAt).toLocaleDateString("es", { day: "numeric", month: "short" }).replace(".", "");
  const stats = [
    { icon: Heart, label: "Me gusta", value: item.likes },
    { icon: MessageCircle, label: "Comentarios", value: item.comments },
    { icon: Share2, label: "Compartidos", value: item.shares },
    { icon: Eye, label: "Visualizaciones", value: item.views },
  ];

  return (
    <div data-index={index} className="flex h-full snap-start snap-always items-end justify-center gap-4 px-4 pt-4 pb-[152px]">
      <div className="relative h-full aspect-[9/16] max-w-full overflow-hidden rounded-xl bg-black">
        <video ref={video} src={item.url} muted={muted} loop playsInline preload={active ? "auto" : "metadata"}
          onClick={toggle} className="size-full cursor-pointer object-cover" />

        {paused && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-[rgb(0_0_0/0.45)] text-white backdrop-blur-sm">
              <Play className="ml-0.5 size-6 fill-current" strokeWidth={1.5} />
            </span>
          </span>
        )}

        <button type="button" onClick={onMute} aria-label={muted ? "Activar sonido" : "Silenciar"}
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-[rgb(0_0_0/0.4)] text-white backdrop-blur-sm transition-colors duration-150 hover:bg-[rgb(0_0_0/0.6)]">
          {muted ? <VolumeX className="size-4" strokeWidth={1.75} /> : <Volume2 className="size-4" strokeWidth={1.75} />}
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgb(0_0_0/0.7)] to-transparent px-4 pt-16 pb-4 text-white">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {item.platform === "tiktok" ? <TikTokIcon className="size-3.5" /> : <InstagramIcon className="size-3.5" />}
            @{item.handle}
            <span className="font-normal text-[rgb(255_255_255/0.6)]">· {posted}</span>
          </p>
          <p className="mt-1 line-clamp-3 text-sm text-[rgb(255_255_255/0.9)]">{item.caption}</p>
        </div>
      </div>

      {/* Cifras públicas del vídeo */}
      <div className="hidden flex-col gap-4 pb-2 sm:flex">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} data-tip={label} data-tip-side="right" className="flex flex-col items-center gap-1">
            <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-fg-2">
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <span className="text-xs font-medium text-fg-2 tabular-nums">{compact.format(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
