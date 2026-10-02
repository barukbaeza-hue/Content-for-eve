"use client";

import { SquarePen } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resetChat } from "./actions";

export function ResetButton() {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button aria-label="Nueva conversación" data-tip="Nueva conversación" disabled={pending}
        onClick={() => setConfirming(true)}
        className="flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:opacity-50">
        <SquarePen className="size-4" strokeWidth={1.75} />
      </button>
      <ConfirmDialog
        open={confirming}
        title="¿Empezar una conversación nueva?"
        description="Las ideas guardadas no se borran."
        confirmLabel="Empezar de nuevo"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          startTransition(() => resetChat());
        }}
      />
    </>
  );
}
