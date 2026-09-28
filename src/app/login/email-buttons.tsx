"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { login, signup } from "./actions";

export function EmailButtons() {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-2">
      <Button formAction={login} variant="primary" size="lg" disabled={pending} className="w-full">
        Entrar
      </Button>
      <Button formAction={signup} variant="ghost" size="lg" disabled={pending} className="w-full">
        Crear cuenta nueva
      </Button>
    </div>
  );
}
