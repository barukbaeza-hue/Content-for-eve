import { BarChart3, Eye, Heart, MessageCircle } from "lucide-react";
import { Page } from "@/components/shell/page";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { instagramConfigured, recentReels, type Reel } from "@/lib/instagram";
import { createClient } from "@/lib/supabase/server";

const number = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
const fmt = (n?: number) => (n === undefined ? "—" : number.format(n));

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line p-4">
      <p className="text-xs text-fg-3">{label}</p>
      <p className="mt-1 text-xl font-medium tabular-nums">{value}</p>
    </div>
  );
}

export default async function MetricasPage() {
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("social_accounts")
    .select("username, followers_count, access_token")
    .eq("platform", "instagram")
    .maybeSingle();

  if (!account) {
    return (
      <Page title="Métricas">
        <EmptyState
          icon={BarChart3}
          title="Conecta Instagram para ver tus métricas"
          description="Mova te muestra el alcance de cada Reel y qué te funciona mejor."
          action={instagramConfigured()
            ? <a href="/api/instagram/connect?desde=marca" className={buttonClasses("primary")}>Conectar Instagram</a>
            : undefined}
        />
      </Page>
    );
  }

  let reels: Reel[] = [];
  let failed = false;
  try {
    reels = await recentReels(account.access_token, 20);
  } catch (error) {
    console.error("Error al leer Instagram:", error);
    failed = true;
  }

  const withViews = reels.filter((r) => r.views !== undefined);
  const avgViews = withViews.length ? withViews.reduce((sum, r) => sum + (r.views ?? 0), 0) / withViews.length : undefined;
  const avgLikes = reels.length ? reels.reduce((sum, r) => sum + (r.likes ?? 0), 0) / reels.length : undefined;
  const best = [...withViews].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];

  return (
    <Page title="Métricas">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <p className="text-sm text-fg-3">Instagram · @{account.username} · últimos {reels.length} Reels</p>

        {failed && <Notice tone="danger">No se pudieron leer tus Reels de Instagram. Vuelve a conectar la cuenta desde Mi marca.</Notice>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Seguidores" value={fmt(account.followers_count ?? undefined)} />
          <Stat label="Vistas medias" value={fmt(avgViews)} />
          <Stat label="Me gusta medios" value={fmt(avgLikes)} />
          <Stat label="Mejor Reel" value={best ? fmt(best.views) : "—"} />
        </div>

        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {reels.map((reel) => (
            <li key={reel.id}>
              <a href={reel.permalink} target="_blank" rel="noopener noreferrer"
                className="flex gap-3 p-3 transition-colors duration-150 hover:bg-surface-2">
                <div className="aspect-[9/16] w-14 shrink-0 overflow-hidden rounded-md bg-surface-3">
                  {reel.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reel.thumbnailUrl} alt="" className="size-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                  <p className="line-clamp-2 text-sm text-fg-2">{reel.caption || "Sin descripción"}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-3 tabular-nums">
                    <span className="inline-flex items-center gap-1"><Eye className="size-3.5" strokeWidth={1.75} />{fmt(reel.views)}</span>
                    <span className="inline-flex items-center gap-1"><Heart className="size-3.5" strokeWidth={1.75} />{fmt(reel.likes)}</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" strokeWidth={1.75} />{fmt(reel.comments)}</span>
                    <span>{new Date(reel.postedAt).toLocaleDateString("es", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  );
}
