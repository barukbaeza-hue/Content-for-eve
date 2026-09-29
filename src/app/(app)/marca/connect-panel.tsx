import { Notice } from "@/components/ui/notice";
import { buttonClasses } from "@/components/ui/button";
import { Analyzer } from "./analyzer";

type Props = {
  analyzed: { source: string; videos: number; at: string } | null;
  instagram: { username: string | null } | null;
  canConnect: boolean;
  autoAnalyze: boolean;
  message?: string;
};

const SOURCE: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", instagram_tiktok: "Instagram y TikTok" };

export function ConnectPanel({ analyzed, instagram, canConnect, autoAnalyze, message }: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-line bg-surface-2 p-5">
      {message && <Notice tone="danger">{message}</Notice>}
      <p className="text-sm text-fg-2">
        {analyzed
          ? `Creado a partir de ${analyzed.videos} vídeos de ${SOURCE[analyzed.source] ?? analyzed.source} · ${new Date(analyzed.at).toLocaleDateString("es", { day: "numeric", month: "short" })}`
          : "Perfil rellenado a mano."}
        {instagram?.username && ` Instagram conectado: @${instagram.username}.`}
      </p>
      {instagram ? (
        <Analyzer auto={autoAnalyze} doneHref="/marca" label={analyzed ? "Volver a analizar" : "Crear perfil con mis vídeos"} />
      ) : canConnect ? (
        <a href="/api/instagram/connect?desde=marca" className={buttonClasses("primary")}>Conectar Instagram</a>
      ) : null}
    </div>
  );
}
