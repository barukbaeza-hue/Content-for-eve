import { BarChart3, Eye, Heart, MessageCircle } from "lucide-react";
import Link from "next/link";
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

function change(views: number | undefined, avg: number | undefined) {
  if (views === undefined || !avg) return null;
  const pct = Math.round((views / avg - 1) * 100);
  return pct === 0 ? "= media" : `${pct > 0 ? "+" : "−"}${Math.abs(pct)} % vs media`;
}

export default async function MetricasPage({ searchParams }: PageProps<"/metricas">) {
  const byViews = (await searchParams).orden === "vistas";
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

  const sorted = byViews ? [...reels].sort((a, b) => (b.views ?? -1) - (a.views ?? -1)) : reels;
  const tab = (active: boolean) =>
    `flex h-7 items-center rounded-md px-2.5 text-sm font-medium transition-colors duration-150 ${
      active ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg"
    }`;

  return (
    <Page title="Métricas">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-8">
        {failed && <Notice tone="danger">No se pudieron leer tus Reels de Instagram. Vuelve a conectar la cuenta desde Mi marca.</Notice>}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Seguidores" value={fmt(account.followers_count ?? undefined)} />
          <Stat label="Vistas medias" value={fmt(avgViews)} />
          <Stat label="Me gusta medios" value={fmt(avgLikes)} />
          <Stat label="Mejor Reel" value={best ? fmt(best.views) : "—"} />
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-fg-2">
              Reels <span className="text-fg-4">· @{account.username} · últimos {reels.length}</span>
            </h2>
            <div className="flex gap-1 rounded-lg border border-line p-0.5">
              <Link href="/metricas" className={tab(!byViews)} scroll={false}>Recientes</Link>
              <Link href="/metricas?orden=vistas" className={tab(byViews)} scroll={false}>Más vistos</Link>
            </div>
          </div>

          {/* Misma tarjeta que el banco de vídeos: la portada a sangre y los números sobre un degradado */}
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {sorted.map((reel) => {
              const vsAvg = change(reel.views, avgViews);
              return (
                <li key={reel.id}>
                  <a href={reel.permalink} target="_blank" rel="noopener noreferrer" title={reel.caption || undefined}
                    className="group relative block aspect-[9/16] overflow-hidden rounded-lg bg-surface-2">
                    {reel.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={reel.thumbnailUrl} alt="" loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    )}
                    {best && reel.id === best.id && (
                      <span className="absolute top-2 left-2 rounded-full bg-[rgb(0_0_0/0.35)] px-2 py-0.5 text-xs font-medium text-[#fff] backdrop-blur-md">
                        Mejor Reel
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[rgb(0_0_0/0.85)] via-[rgb(0_0_0/0.4)] to-transparent px-3 pt-20 pb-3 text-[#fff]">
                      <p className="flex items-center gap-1.5 text-lg font-medium tabular-nums">
                        <Eye className="size-4" strokeWidth={1.75} />
                        {fmt(reel.views)}
                      </p>
                      {vsAvg && <p className="text-xs text-[rgb(255_255_255/0.7)]">{vsAvg}</p>}
                      <p className="mt-2 line-clamp-2 text-xs text-[rgb(255_255_255/0.85)]">{reel.caption || "Sin descripción"}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-[rgb(255_255_255/0.7)] tabular-nums">
                        <span className="inline-flex items-center gap-1"><Heart className="size-3.5" strokeWidth={1.75} />{fmt(reel.likes)}</span>
                        <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" strokeWidth={1.75} />{fmt(reel.comments)}</span>
                        <span className="ml-auto">{new Date(reel.postedAt).toLocaleDateString("es", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Page>
  );
}
