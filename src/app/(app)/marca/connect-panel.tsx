"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Conexión de redes. Los botones se activan cuando esté lista la conexión oficial con cada red.
export function ConnectPanel({ analyzed }: { analyzed: { source: string; videos: number; at: string } | null }) {
  const sourceLabel: Record<string, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    instagram_tiktok: "Instagram y TikTok",
  };

  return (
    <div className="space-y-4 rounded-lg border border-line bg-surface-2 p-5">
      {analyzed ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-2">
            Creado a partir de {analyzed.videos} vídeos de {sourceLabel[analyzed.source] ?? analyzed.source} ·{" "}
            {new Date(analyzed.at).toLocaleDateString("es", { day: "numeric", month: "short" })}
          </p>
          <Button size="sm" disabled title="Disponible cuando conectes tus redes">
            <RefreshCw className="size-3.5" strokeWidth={1.75} />
            Volver a analizar
          </Button>
        </div>
      ) : (
        <p className="text-sm text-fg-2">
          Perfil rellenado a mano. Cuando conectes Instagram o TikTok, Mova lo completará a partir de tus vídeos.
        </p>
      )}
    </div>
  );
}
