"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { analyzeFromSocial } from "./actions";

// Analiza los vídeos de Instagram y crea el perfil. Arranca solo si `auto`.
export function Analyzer({ auto, doneHref, label = "Volver a analizar" }: { auto: boolean; doneHref: string; label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = () =>
    startTransition(async () => {
      setError(null);
      const result = await analyzeFromSocial(["instagram"]);
      if (result?.ok) router.replace(doneHref);
      else setError(result?.message ?? "No se pudo analizar tu perfil.");
    });

  useEffect(() => {
    if (auto && !started.current) {
      started.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  if (pending) {
    return (
      <div className="flex items-center gap-3 text-base text-fg-2" role="status">
        <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
        Analizando tus vídeos. Tarda alrededor de un minuto…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Notice tone="danger">{error}</Notice>}
      <Button onClick={run}>{error ? "Intentar de nuevo" : label}</Button>
    </div>
  );
}
