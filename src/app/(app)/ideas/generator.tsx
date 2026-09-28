"use client";

import { Sparkles } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { generate } from "./actions";

export function Generator() {
  const [state, formAction, pending] = useActionState(generate, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="topic" placeholder="¿Sobre qué? (opcional)"
          aria-label="Tema de las ideas" disabled={pending} />
        <Button variant="primary" disabled={pending} className="h-9">
          <Sparkles className="size-4" strokeWidth={1.75} />
          {pending ? "Generando…" : "Generar 5 ideas"}
        </Button>
      </div>
      {state?.error && <Notice tone="danger">{state.error}</Notice>}
    </form>
  );
}
