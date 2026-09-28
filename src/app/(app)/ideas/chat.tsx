"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Logo } from "@/components/shell/logo";
import { Notice } from "@/components/ui/notice";
import { sendMessage } from "./actions";
import { IdeaCard } from "./idea-card";
import type { ChatMessage } from "./types";

const SUGGESTIONS = [
  "Dame 5 ideas para esta semana",
  "Ideas de Reels que sean tendencia",
  "Un carrusel educativo sobre mi nicho",
  "Ideas rápidas para grabar en 10 minutos",
];

export function Chat({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tempId = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  // El textarea crece con el texto hasta un máximo.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const send = (value: string) => {
    const content = value.trim();
    if (!content || pending) return;
    const temp: ChatMessage = { id: `temp-${++tempId.current}`, role: "user", content, ideas: [] };
    setMessages((m) => [...m, temp]);
    setText("");
    setError(null);

    startTransition(async () => {
      const result = await sendMessage(content);
      if ("error" in result) {
        setMessages((m) => m.filter((msg) => msg.id !== temp.id));
        setText(content);
        setError(result.error);
        return;
      }
      setMessages((m) => [...m.filter((msg) => msg.id !== temp.id), ...result.messages]);
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        {messages.length === 0 && !pending && (
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

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-xl bg-surface-3 px-3.5 py-2 text-base whitespace-pre-line">
                {message.content}
              </p>
            </div>
          ) : (
            <div key={message.id} className="flex gap-3">
              <Logo className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-base whitespace-pre-line">{message.content}</p>
                {message.ideas.map((idea, i) => (
                  <IdeaCard key={i} idea={idea} messageId={message.id} index={i} />
                ))}
              </div>
            </div>
          ),
        )}

        {pending && (
          <div className="flex gap-3">
            <Logo className="mt-0.5 shrink-0" />
            <p className="animate-pulse text-base text-fg-3">Pensando…</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-surface-1 from-70% to-transparent px-4 pt-6 pb-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-2">
          {error && <Notice tone="danger">{error}</Notice>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="flex items-end gap-2 rounded-xl border border-line bg-surface-1 p-2 transition-colors duration-150 focus-within:border-line-strong">
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(text);
                }
              }}
              placeholder="Escribe a Mova…"
              aria-label="Mensaje"
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-md text-fg placeholder:text-fg-4 focus:outline-none md:text-base"
            />
            <button type="submit" disabled={!text.trim() || pending} aria-label="Enviar"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-30">
              <ArrowUp className="size-4" strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
