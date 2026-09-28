"use client";

import { SquarePen } from "lucide-react";
import { useTransition } from "react";
import { resetChat } from "./actions";

export function ResetButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      aria-label="Nueva conversación"
      title="Nueva conversación"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Empezar una conversación nueva? Las ideas guardadas no se borran.")) {
          startTransition(() => resetChat());
        }
      }}
      className="flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:opacity-50">
      <SquarePen className="size-4" strokeWidth={1.75} />
    </button>
  );
}
