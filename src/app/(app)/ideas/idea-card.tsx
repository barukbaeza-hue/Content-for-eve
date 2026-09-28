"use client";

import { Bookmark, BookmarkCheck, ChevronRight } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FORMATS } from "@/lib/content";
import { saveIdea } from "./actions";
import type { ChatIdea } from "./types";

export function IdeaCard({ idea, messageId, index }: { idea: ChatIdea; messageId: string; index: number }) {
  const [savedId, setSavedId] = useState(idea.saved_id);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const id = await saveIdea(messageId, index);
      if (id) setSavedId(id);
    });

  return (
    <div className="rounded-lg border border-line bg-surface-1">
      <div className="flex items-start gap-3 p-3.5">
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-sm border border-line px-1.5 text-2xs font-medium text-fg-3">
            {FORMATS[idea.format]}
          </span>
          <p className="mt-1.5 text-base font-medium">{idea.title}</p>
          <p className="mt-1 text-sm text-fg-2">“{idea.hook}”</p>
        </div>
        <Button size="sm" variant={savedId ? "ghost" : "secondary"} disabled={pending || Boolean(savedId)}
          onClick={save} aria-label={savedId ? "Idea guardada" : "Guardar idea"}>
          {savedId ? <BookmarkCheck className="size-4" strokeWidth={1.75} /> : <Bookmark className="size-4" strokeWidth={1.75} />}
          <span className="hidden sm:inline">{savedId ? "Guardada" : pending ? "Guardando…" : "Guardar"}</span>
        </Button>
      </div>
      <details className="group border-t border-line">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3.5 py-2 text-sm text-fg-3 transition-colors duration-150 hover:text-fg [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-3.5 transition-transform duration-150 group-open:rotate-90" strokeWidth={1.75} />
          Ver guion
        </summary>
        <p className="px-3.5 pb-3.5 pl-9 text-sm whitespace-pre-line text-fg-2">{idea.script}</p>
      </details>
    </div>
  );
}
