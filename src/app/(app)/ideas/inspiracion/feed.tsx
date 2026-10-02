"use client";

import { ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Logo } from "@/components/shell/logo";
import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";
import { Notice } from "@/components/ui/notice";
import { sendMessage } from "../actions";
import { IdeaCard } from "../idea-card";
import type { ChatMessage } from "../types";
import { VIDEO_SUGGESTIONS, withContext } from "./context";
import { Reel } from "./reel";
import type { Reference } from "./sample";

// Inspiración en el móvil: el visor a pantalla completa y, abajo, un chat con el agente que tiene el vídeo actual
// como contexto. En el ordenador, Inspiración y el chat están juntos en la página de Ideas (ver Workspace).
export function Feed({ items }: { items: Reference[] }) {
  const [index, setIndex] = useState(0);
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
      <Reel items={items} inset={152} onIndex={setIndex} />

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
              {VIDEO_SUGGESTIONS.map((s) => (
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
              placeholder="Pregunta sobre este vídeo…" aria-label="Mensaje sobre el vídeo"
              className="max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-base text-fg placeholder:text-fg-4 focus:outline-none" />
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
