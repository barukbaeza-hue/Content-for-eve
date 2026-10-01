import { BarChart3, Eye, Heart, MessageCircle } from "lucide-react";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { Page } from "@/components/shell/page";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Pagination } from "@/components/ui/pagination";
import { instagramConfigured, reelsPage, type Reel } from "@/lib/instagram";
import { createClient } from "@/lib/supabase/server";
import { freshToken, getStats, TikTokError, tiktokConfigured, videosPage } from "@/lib/tiktok";

const PER_PAGE = 20;

const number = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
const fmt = (n?: number) => (n === undefined ? "—" : number.format(n));

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-line p-4">
      <p className="text-xs text-fg-3">{label}</p>
      <p className="mt-1 text-xl font-medium tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-xs text-fg-3 tabular-nums">{detail}</p>}
    </div>
  );
}

function change(views: number | undefined, avg: number | undefined) {
  if (views === undefined || !avg) return null;
  const pct = Math.round((views / avg - 1) * 100);
  return pct === 0 ? "= media" : `${pct > 0 ? "+" : "−"}${Math.abs(pct)} % vs media`;
}

// Lo que se lee de Instagram y TikTok se guarda 10 minutos: moverse por Métricas no vuelve a pedirlo todo
const CACHE = { revalidate: 600 };
const cachedReels = unstable_cache((token: string, p: number, n: number) => reelsPage(token, p, n), ["metricas-ig"], CACHE);
const cachedTikToks = unstable_cache((token: string, p: number, n: number) => videosPage(token, p, n), ["metricas-tt"], CACHE);
const cachedStats = unstable_cache((token: string) => getStats(token), ["metricas-tt-stats"], CACHE);

// Periodos del resumen: días y cuántos vídeos recientes de cada red se leen para cubrirlo
const PERIODS = [
  { days: 7, label: "7 días", title: "últimos 7 días", videos: 20 },
  { days: 30, label: "1 mes", title: "último mes", videos: 40 },
  { days: 90, label: "3 meses", title: "últimos 3 meses", videos: 60 },
  { days: 365, label: "1 año", title: "último año", videos: 100 },
] as const;

function daysAgo(days: number) {
  return Date.now() - days * 24 * 3600 * 1000;
}

type Network = "instagram" | "tiktok";
const LABELS: Record<Network, { name: string; item: string; best: string }> = {
  instagram: { name: "Instagram", item: "Reels", best: "Mejor Reel" },
  tiktok: { name: "TikTok", item: "Vídeos", best: "Mejor vídeo" },
};

export default async function MetricasPage({ searchParams }: PageProps<"/metricas">) {
  const params = await searchParams;
  const byViews = params.orden === "vistas";
  // 20 vídeos por página
  const page = Math.min(50, Math.max(1, Math.floor(Number(params.p)) || 1));
  const period = PERIODS.find((x) => String(x.days) === params.periodo) ?? PERIODS[1];
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, username, followers_count, access_token, token_expires_at, refresh_token");

  // Por defecto, la primera red conectada (Instagram si están las dos)
  const connected = (["instagram", "tiktok"] as const).filter((n) => accounts?.some((a) => a.platform === n));
  const network: Network = params.red === "tiktok" || params.red === "instagram" ? params.red : connected[0] ?? "instagram";
  const account = accounts?.find((a) => a.platform === network);
  const label = LABELS[network];
  const href = (query: Record<string, string>) =>
    `/metricas?${new URLSearchParams({
      red: network,
      ...(byViews ? { orden: "vistas" } : {}),
      ...(page > 1 ? { p: String(page) } : {}),
      ...(period.days !== 30 ? { periodo: String(period.days) } : {}),
      ...query,
    })}`;

  if (!connected.length) {
    return (
      <Page title="Métricas">
        <EmptyState
          icon={BarChart3}
          title="Conecta tus redes para ver tus métricas"
          description="Mova te muestra el alcance de cada vídeo en Instagram y TikTok, y qué te funciona mejor."
          action={instagramConfigured() || tiktokConfigured()
            ? <Link href="/marca" className={buttonClasses("primary")}>Conectar en Mi marca</Link>
            : undefined}
        />
      </Page>
    );
  }

  type Loaded = { items: Reel[]; hasMore: boolean; totalPages?: number; followers?: number; error?: string };

  // Lee una página de vídeos de una red, con sus seguidores
  async function load(n: Network, p: number, perPage = PER_PAGE): Promise<Loaded> {
    const acc = accounts?.find((a) => a.platform === n);
    if (!acc) return { items: [], hasMore: false, error: `${LABELS[n].name} no está conectado. Conéctalo en Mi marca.` };
    if (n === "instagram") {
      try {
        return { ...(await cachedReels(acc.access_token, p, perPage)), followers: acc.followers_count ?? undefined };
      } catch (error) {
        console.error("Error al leer Instagram:", error);
        return { items: [], hasMore: false, error: "No se pudieron leer tus Reels de Instagram. Vuelve a conectar la cuenta desde Mi marca." };
      }
    }
    try {
      const token = await freshToken(acc, async (fields) => { await supabase.from("social_accounts").update(fields).eq("id", acc.id); });
      const [result, stats] = await Promise.all([cachedTikToks(token, p, perPage), cachedStats(token).catch(() => undefined)]);
      if (stats?.followers !== undefined && stats.followers !== acc.followers_count) {
        await supabase.from("social_accounts").update({ followers_count: stats.followers }).eq("id", acc.id);
      }
      return {
        ...result,
        totalPages: stats?.videos ? Math.ceil(stats.videos / PER_PAGE) : undefined,
        followers: stats?.followers ?? acc.followers_count ?? undefined,
      };
    } catch (error) {
      console.error("Error al leer TikTok:", error);
      return {
        items: [], hasMore: false,
        error: error instanceof TikTokError ? error.message : "No se pudieron leer tus vídeos de TikTok. Vuelve a conectar la cuenta desde Mi marca.",
      };
    }
  }

  // La lista de la red elegida y el resumen de las dos redes se cargan a la vez
  const [current, both] = await Promise.all([
    load(network, page),
    connected.length > 1
      ? Promise.all(connected.map(async (n) => ({ n, data: await load(n, 1, period.videos) })))
      : Promise.resolve([]),
  ]);
  const { items: reels, hasMore, totalPages, followers } = current;
  const failed = current.error ?? null;
  const since = daysAgo(period.days);
  const summary = both.map(({ n, data }) => {
    const recent = data.items.filter((r) => new Date(r.postedAt).getTime() >= since);
    return {
      n,
      followers: data.followers,
      views: recent.reduce((sum, r) => sum + (r.views ?? 0), 0),
      videos: recent.length,
    };
  });
  // Si en el periodo hay más vídeos de los que se leyeron, el resumen se queda corto: se avisa
  const partial = both.some(({ data }) => data.hasMore && data.items.length > 0
    && new Date(data.items[data.items.length - 1].postedAt).getTime() >= since);
  const sum = (key: "followers" | "views" | "videos") => summary.reduce((t, x) => t + (x[key] ?? 0), 0);
  const detail = (key: "followers" | "views" | "videos") =>
    summary.map((x) => `${LABELS[x.n].name} ${fmt(x[key] ?? undefined)}`).join(" · ");

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
        {summary.length > 1 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-fg-2">Resumen <span className="text-fg-4">· Instagram y TikTok · {period.title}</span></h2>
              <div className="flex gap-1 rounded-lg border border-line p-0.5">
                {PERIODS.map((x) => (
                  <Link key={x.days} href={href({ periodo: String(x.days) })} scroll={false} className={tab(x.days === period.days)}>
                    {x.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Seguidores" value={fmt(sum("followers"))} detail={detail("followers")} />
              <Stat label="Vistas" value={fmt(sum("views"))} detail={detail("views")} />
              <Stat label="Vídeos publicados" value={fmt(sum("videos"))} detail={detail("videos")} />
            </div>
            {partial && (
              <p className="text-xs text-fg-4">Cuenta los últimos {period.videos} vídeos de cada red; en este periodo publicaste más.</p>
            )}
          </section>
        )}

        {connected.length > 1 && (
          <div className="flex w-fit gap-1 rounded-lg border border-line p-0.5">
            {connected.map((n) => (
              <Link key={n} href={`/metricas?red=${n}${period.days !== 30 ? `&periodo=${period.days}` : ""}`} className={tab(network === n)} scroll={false}>{LABELS[n].name}</Link>
            ))}
          </div>
        )}

        {failed && <Notice tone="danger">{failed}</Notice>}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Seguidores" value={fmt(followers)} />
          <Stat label="Vistas medias" value={fmt(avgViews)} />
          <Stat label="Me gusta medios" value={fmt(avgLikes)} />
          <Stat label={label.best} value={best ? fmt(best.views) : "—"} />
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-fg-2">
              {label.item} <span className="text-fg-4">· @{account?.username}{page > 1 ? ` · página ${page}` : ""}</span>
            </h2>
            <div className="flex gap-1 rounded-lg border border-line p-0.5">
              <Link href={`/metricas?red=${network}${page > 1 ? `&p=${page}` : ""}${period.days !== 30 ? `&periodo=${period.days}` : ""}`} className={tab(!byViews)} scroll={false}>Recientes</Link>
              <Link href={href({ orden: "vistas" })} className={tab(byViews)} scroll={false}>Más vistos</Link>
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
                        {label.best}
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

          {/* Si la red no da el total, se conoce hasta la página siguiente */}
          <div className="pt-2">
            <Pagination current={page} last={Math.max(page, totalPages ?? 0, hasMore ? page + 1 : page)}
              href={(p) => href({ p: String(p) })} />
          </div>
        </section>
      </div>
    </Page>
  );
}
