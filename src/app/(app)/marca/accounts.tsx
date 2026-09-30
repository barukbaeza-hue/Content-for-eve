import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

type Account = { platform: "instagram" | "tiktok"; username: string | null } | undefined;

const TIKTOK_MESSAGES: Record<string, string> = {
  conectado: "TikTok conectado. Ya puedes publicar tus vídeos programados.",
  cancelado: "Cancelaste la conexión con TikTok.",
  rechazado: "TikTok no aceptó la conexión.",
  error: "No se pudo conectar TikTok. Inténtalo de nuevo.",
  "no-configurado": "La conexión con TikTok aún no está configurada.",
};

export function tiktokMessage(status: unknown, detail: unknown) {
  if (typeof status !== "string" || !TIKTOK_MESSAGES[status]) return undefined;
  return typeof detail === "string" && detail ? `${TIKTOK_MESSAGES[status]} (${detail})` : TIKTOK_MESSAGES[status];
}

// Redes donde Mova publica los vídeos programados del calendario.
export function Accounts({ instagram, tiktok, canInstagram, canTiktok, message, ok }: {
  instagram: Account;
  tiktok: Account;
  canInstagram: boolean;
  canTiktok: boolean;
  message?: string;
  ok?: boolean;
}) {
  const rows = [
    { name: "Instagram", account: instagram, href: "/api/instagram/connect?desde=marca", can: canInstagram },
    { name: "TikTok", account: tiktok, href: "/api/tiktok/connect", can: canTiktok },
  ];
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-md font-medium">Redes para publicar</h3>
        <p className="text-sm text-fg-3">Mova publica tus vídeos programados en estas cuentas a la hora del calendario.</p>
      </div>
      {message && <Notice tone={ok ? "success" : "danger"}>{message}</Notice>}
      <ul className="divide-y divide-line rounded-lg border border-line">
        {rows.map(({ name, account, href, can }) => (
          <li key={name} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-fg-3">
                {account ? `Conectado${account.username ? ` · @${account.username}` : ""}` : "Sin conectar"}
              </p>
            </div>
            {can && (
              <a href={href} className={buttonClasses(account ? "ghost" : "primary", "sm")}>
                {account ? "Reconectar" : "Conectar"}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
