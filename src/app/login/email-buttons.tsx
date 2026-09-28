"use client";

import { useFormStatus } from "react-dom";
import { login, signup } from "./actions";

export function EmailButtons() {
  const { pending } = useFormStatus();

  return (
    <div className="flex gap-2">
      <button formAction={login} disabled={pending}
        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 font-medium disabled:opacity-50 dark:border-neutral-700">
        Entrar
      </button>
      <button formAction={signup} disabled={pending}
        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 font-medium disabled:opacity-50 dark:border-neutral-700">
        Crear cuenta
      </button>
    </div>
  );
}
