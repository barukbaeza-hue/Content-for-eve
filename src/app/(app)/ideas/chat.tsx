"use client";

import { ArrowUp, ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Logo } from "@/components/shell/logo";
import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";
import { Notice } from "@/components/ui/notice";
import { sendMessage } from "./actions";
import { IdeaCard } from "./idea-card";
import { parseContext, VIDEO_SUGGESTIONS, withContext } from "./inspiracion/context";
import type { Reference } from "./inspiracion/sample";
import type { ChatMessage } from "./types";

const SUGGESTIONS = [
  "Dame 5 ideas para esta semana",
  "Ideas de Reels que sean tendencia",
  "Un carrusel educativo sobre mi nicho",
  "Ideas rápidas para grabar en 10 minutos",
];

const platformIcon = (platform: Reference["platform"]) =>
  platform === "tiktok" ? <TikTokIcon className="size-3" /> : <InstagramIcon className="size-3" />;

// Chat de ideas. Con `context` (un vídeo de Inspiración abierto), cada mensaje lleva ese vídeo como contexto.
// `docked`: en el ordenador va abajo, encima de Inspiración, con la conversación en un panel de cristal plegable.
export function Chat({ initialMessages, context = null, onClearContext, docked = false }: {
  initialMessages: ChatMessage[];
  context?: Reference | null;
  onClearContext?: () => void;
  docked?: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tempId = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending, open]);

  // El textarea crece con el texto hasta un máximo.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const send = (value: string) => {
    const question = value.trim();
    if (!question || pending) return;
    const content = context ? withContext(context, question) : question;
    const temp: ChatMessage = { id: `temp-${++tempId.current}`, role: "user", content, ideas: [] };
    setMessages((m) => [...m, temp]);
    setText("");
    setError(null);
    setOpen(true);

    startTransition(async () => {
      const result = await sendMessage(content);
      if ("error" in result) {
        setMessages((m) => m.filter((msg) => msg.id !== temp.id));
        setText(question);
        setError(result.error);
        return;
      }
      setMessages((m) => [...m.filter((msg) => msg.id !== temp.id), ...result.messages]);
    });
  };

  const size = docked ? "text-sm" : "text-base";

  const conversation = (
    <>
      {messages.map((message) => {
        if (message.role === "user") {
          // Las preguntas sobre un vídeo de Inspiración se muestran con una etiqueta del vídeo, sin el contexto
          const ref = parseContext(message.content);
          return (
            <div key={message.id} className="flex flex-col items-end gap-1.5">
              {ref && (
                <span className="flex h-6 items-center gap-1.5 rounded-md border border-line px-2 text-xs text-fg-3">
                  {platformIcon(ref.platform)}
                  Sobre el vídeo de @{ref.handle}
                </span>
              )}
              <p className={`max-w-[85%] rounded-xl bg-surface-3 px-3.5 py-2 whitespace-pre-line ${size}`}>
                {ref?.question ?? message.content}
              </p>
            </div>
          );
        }
        return (
          <div key={message.id} className="flex gap-3">
            <Logo className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-3">
              <p className={`whitespace-pre-line ${size}`}>{message.content}</p>
              {message.ideas.map((idea, i) => (
                <IdeaCard key={i} idea={idea} messageId={message.id} index={i} />
              ))}
            </div>
          </div>
        );
      })}

      {pending && (
        <div className="flex gap-3">
          <Logo className="mt-0.5 shrink-0" />
          <p className={`animate-pulse text-fg-3 ${size}`}>Pensando…</p>
        </div>
      )}
      <div ref={endRef} />
    </>
  );

  // Sugerencias: sobre el vídeo abierto, o generales si aún no hay conversación
  const chips = (
    <div className={`flex flex-wrap gap-1.5 ${docked ? "justify-center" : ""}`}>
      {(context ? VIDEO_SUGGESTIONS : SUGGESTIONS).map((s) => (
        <button key={s} type="button" onClick={() => send(s)} disabled={pending}
          className={`rounded-full px-3 py-1 text-sm text-fg-2 transition-colors duration-150 hover:text-fg disabled:opacity-50 ${
            docked ? "glass" : "border border-line bg-surface-1 hover:border-line-strong"
          }`}>
          {s}
        </button>
      ))}
    </div>
  );

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(text);
      }}
      className={`flex items-end gap-2 rounded-xl p-2 transition-colors duration-150 ${
        docked ? "glass" : "border border-line bg-surface-1 focus-within:border-line-strong"
      }`}>
      {context && (
        <span className="mb-1.5 ml-1 flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-[rgb(128_128_128/0.14)] pr-1 pl-2 text-xs text-fg-2">
          {platformIcon(context.platform)}
          @{context.handle}
          <button type="button" aria-label="Quitar el vídeo" data-tip="Quitar el vídeo" onClick={onClearContext}
            className="flex size-4 items-center justify-center rounded text-fg-3 hover:text-fg">
            <X className="size-3" strokeWidth={2} />
          </button>
        </span>
      )}
      <textarea
        ref={inputRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => docked && messages.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send(text);
          }
        }}
        placeholder={context ? "Pregunta sobre este vídeo…" : "Escribe a Mova…"}
        aria-label="Mensaje"
        className="max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-md text-fg placeholder:text-fg-4 focus:outline-none md:text-base"
      />
      <button type="submit" disabled={!text.trim() || pending} aria-label="Enviar"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-30">
        <ArrowUp className="size-4" strokeWidth={2} />
      </button>
    </form>
  );

  if (docked) {
    const hasConversation = messages.length > 0 || pending;
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl space-y-2">
          {hasConversation && (
            <section className="glass overflow-hidden rounded-xl">
              <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
                className="flex h-10 w-full items-center justify-between gap-2 pr-2.5 pl-3.5 text-sm text-fg-2 hover:text-fg">
                <span className="font-medium">Conversación</span>
                {open ? <ChevronDown className="size-4" strokeWidth={1.75} /> : <ChevronUp className="size-4" strokeWidth={1.75} />}
              </button>
              {open && <div className="no-scrollbar max-h-[50vh] space-y-6 overflow-y-auto px-3.5 pt-1 pb-4">{conversation}</div>}
            </section>
          )}
          {error && <Notice tone="danger">{error}</Notice>}
          {(context || !hasConversation) && chips}
          {composer}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        {messages.length === 0 && !pending && !context && (
          <div className="flex flex-col items-center pt-8 text-center">
            <Logo className="mb-4 size-9 text-base" />
            <h2 className="text-xl font-medium">¿Qué creamos hoy?</h2>
            <p className="mt-1 text-base text-fg-3">Pídeme ideas, cámbialas o pregúntame lo que quieras.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm text-fg-2 transition-colors duration-150 hover:border-line-strong hover:text-fg">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {conversation}
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-surface-1 from-70% to-transparent px-4 pt-6 pb-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-2">
          {error && <Notice tone="danger">{error}</Notice>}
          {context && chips}
          {composer}
        </div>
      </div>
    </div>
  );
}
