import { BarChart3, Eye, Heart, MessageCircle } from "lucide-react";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { Page } from "@/components/shell/page";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MenuButton } from "@/components/ui/menu-button";
import { Notice } from "@/components/ui/notice";
import { Pagination } from "@/components/ui/pagination";
import { instagramConfigured, reelsPage, type Reel } from "@/lib/instagram";
import { createClient } from "@/lib/supabase/server";
import { freshToken, getStats, TikTokError, tiktokConfigured, videosPage } from "@/lib/tiktok";

const PER_PAGE = 20;
// Para ordenar por vistas, me gusta o comentarios se leen todos los vídeos (hasta este máximo por red) y se ordenan juntos
const MAX_SORTED = 200;

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
type Filter = Network | "todas";
const NAMES: Record<Network, string> = { instagram: "Instagram", tiktok: "TikTok" };

const SORTS = {
  recientes: { label: "Más recientes", value: (i: Item) => new Date(i.postedAt).getTime() },
  vistas: { label: "Más vistos", value: (i: Item) => i.views ?? -1 },
  likes: { label: "Más me gusta", value: (i: Item) => i.likes ?? -1 },
  comentarios: { label: "Más comentarios", value: (i: Item) => i.comments ?? -1 },
} as const;
type Sort = keyof typeof SORTS;

// Un vídeo en la lista. Si se publicó desde Mova en las dos redes, es una sola tarjeta con sus dos redes.
type Item = {
  key: string;
  caption: string;
  thumbnailUrl?: string;
  postedAt: string;
  views?: number;
  likes?: number;
  comments?: number;
  networks: { network: Network; permalink: string; views?: number }[];
};

const add = (a?: number, b?: number) => (a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0));

export default async function MetricasPage({ searchParams }: PageProps<"/metricas">) {
  const params = await searchParams;
  const page = Math.min(50, Math.max(1, Math.floor(Number(params.p)) || 1));
  const period = PERIODS.find((x) => String(x.days) === params.periodo) ?? PERIODS[1];
  const sort: Sort = typeof params.orden === "string" && params.orden in SORTS ? (params.orden as Sort) : "recientes";
  const supabase = await createClient();
  const [{ data: accounts }, { data: pubs }] = await Promise.all([
    supabase.from("social_accounts").select("id, platform, username, followers_count, access_token, token_expires_at, refresh_token"),
    // Vídeos publicados desde Mova: sirven para juntar el mismo vídeo de las dos redes en una tarjeta
    supabase.from("publications").select("video_id, platform, post_id").eq("status", "published").not("post_id", "is", null),
  ]);

  const connected = (["instagram", "tiktok"] as const).filter((n) => accounts?.some((a) => a.platform === n));
  const filter: Filter = params.red === "instagram" || params.red === "tiktok"
    ? params.red
    : connected.length > 1 ? "todas" : connected[0] ?? "todas";

  const href = (query: Record<string, string | undefined>) => {
    const all: Record<string, string | undefined> = {
      red: filter === "todas" ? undefined : filter,
      orden: sort === "recientes" ? undefined : sort,
      p: page > 1 ? String(page) : undefined,
      periodo: period.days !== 30 ? String(period.days) : undefined,
      ...query,
    };
    const qs = new URLSearchParams(Object.entries(all).filter(([, v]) => v) as [string, string][]);
    return `/metricas${qs.size ? `?${qs}` : ""}`;
  };

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
    if (!acc) return { items: [], hasMore: false, error: `${NAMES[n]} no está conectado. Conéctalo en Mi marca.` };
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

  // Por fecha: cada red da su página (con "Todas", hasta esta página entera, y se mezclan).
  // Por vistas, me gusta o comentarios: se leen todos los vídeos y se ordenan juntos, sin importar la página.
  const shown: Network[] = filter === "todas" ? [...connected] : [filter];
  const global = sort !== "recientes";
  const [lists, both] = await Promise.all([
    Promise.all(shown.map(async (n) => ({
      n,
      data: global ? await load(n, 1, MAX_SORTED) : filter === "todas" ? await load(n, 1, page * PER_PAGE) : await load(n, page),
    }))),
    connected.length > 1
      ? Promise.all(connected.map(async (n) => ({ n, data: await load(n, 1, period.videos) })))
      : Promise.resolve([]),
  ]);
  const errors = lists.map(({ data }) => data.error).filter(Boolean) as string[];

  // El mismo vídeo publicado desde Mova en las dos redes se junta en una sola tarjeta
  const videoOf = new Map((pubs ?? []).map((p) => [`${p.platform}:${p.post_id}`, p.video_id as string]));
  const grouped = new Map<string, Item>();
  for (const { n, data } of lists) {
    for (const r of data.items) {
      const key = videoOf.get(`${n}:${r.id}`) ?? `${n}:${r.id}`;
      const prev = grouped.get(key);
      const net = { network: n, permalink: r.permalink, views: r.views };
      grouped.set(key, prev
        ? {
          ...prev,
          views: add(prev.views, r.views),
          likes: add(prev.likes, r.likes),
          comments: add(prev.comments, r.comments),
          postedAt: prev.postedAt < r.postedAt ? prev.postedAt : r.postedAt,
          networks: [...prev.networks, net],
        }
        : { key, caption: r.caption, thumbnailUrl: r.thumbnailUrl, postedAt: r.postedAt, views: r.views, likes: r.likes, comments: r.comments, networks: [net] });
    }
  }
  const all = [...grouped.values()].sort((a, b) =>
    global ? SORTS[sort].value(b) - SORTS[sort].value(a) : b.postedAt.localeCompare(a.postedAt));
  const items = global || filter === "todas" ? all.slice((page - 1) * PER_PAGE, page * PER_PAGE) : all;
  const hasMore = global ? all.length > page * PER_PAGE : lists.some(({ data }) => data.hasMore) || grouped.size > page * PER_PAGE;
  const totalPages = global ? Math.ceil(all.length / PER_PAGE) : filter === "todas" ? undefined : lists[0]?.data.totalPages;
  const lastPage = Math.max(page, totalPages ?? 0, hasMore ? page + 1 : page);
  // Si alguna red tiene más vídeos de los que se leen para ordenar, se avisa
  const capped = global && lists.some(({ data }) => data.hasMore);

  // Resumen de las dos redes juntas en el periodo elegido
  const since = daysAgo(period.days);
  const summary = both.map(({ n, data }) => {
    const recent = data.items.filter((r) => new Date(r.postedAt).getTime() >= since);
    return { n, followers: data.followers, views: recent.reduce((s, r) => s + (r.views ?? 0), 0), videos: recent.length };
  });
  const partial = both.some(({ data }) => data.hasMore && data.items.length > 0
    && new Date(data.items[data.items.length - 1].postedAt).getTime() >= since);
  const sum = (key: "followers" | "views" | "videos") => summary.reduce((t, x) => t + (x[key] ?? 0), 0);
  const detail = (key: "followers" | "views" | "videos") =>
    summary.map((x) => `${NAMES[x.n]} ${fmt(x[key] ?? undefined)}`).join(" · ");

  // Cifras de una red concreta (con "Todas" no se mezclan medias de redes distintas)
  const single = filter !== "todas" ? lists[0]?.data : undefined;
  // Al ordenar se leyeron todos: las medias y el mejor vídeo salen de todos, no solo de esta página
  const pool = global ? all : items;
  const withViews = pool.filter((i) => i.views !== undefined);
  const avgViews = withViews.length ? withViews.reduce((s, i) => s + (i.views ?? 0), 0) / withViews.length : undefined;
  const avgLikes = pool.length ? pool.reduce((s, i) => s + (i.likes ?? 0), 0) / pool.length : undefined;
  const best = filter !== "todas" ? [...withViews].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0] : undefined;

  const sorted = items;
  const account = filter !== "todas" ? accounts?.find((a) => a.platform === filter) : undefined;
  const tab = (active: boolean) =>
    `flex h-7 items-center rounded-md px-2.5 text-sm font-medium transition-colors duration-150 ${
      active ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg"
    }`;
  const pill = "rounded-full bg-[rgb(0_0_0/0.4)] px-2 py-0.5 text-2xs font-medium text-[#fff] backdrop-blur-md";

  return (
    <Page title="Métricas">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-8">
        {summary.length > 1 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-fg-2">Resumen <span className="text-fg-4">· Instagram y TikTok · {period.title}</span></h2>
              <div className="flex gap-1 rounded-lg border border-line p-0.5">
                {PERIODS.map((x) => (
                  <Link key={x.days} href={href({ periodo: x.days === 30 ? undefined : String(x.days) })} scroll={false} className={tab(x.days === period.days)}>
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

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-fg-2">
              Vídeos{" "}
              <span className="text-fg-4">
                · {filter === "todas" ? "Instagram y TikTok" : `${NAMES[filter]}${account?.username ? ` @${account.username}` : ""}`}
                {page > 1 ? ` · página ${page}` : ""}
              </span>
            </h2>
            <div className="flex gap-2">
              {connected.length > 1 && (
                <MenuButton icon="filtro" label="Filtrar por red" title="Red"
                  options={(["todas", ...connected] as Filter[]).map((f) => ({
                    label: f === "todas" ? "Todas las redes" : NAMES[f],
                    href: href({ red: f === "todas" ? undefined : f, p: undefined }),
                    active: f === filter,
                  }))} />
              )}
              <MenuButton icon="orden" label="Ordenar" title="Ordenar por"
                options={(Object.keys(SORTS) as Sort[]).map((s) => ({
                  label: SORTS[s].label,
                  href: href({ orden: s === "recientes" ? undefined : s }),
                  active: s === sort,
                }))} />
            </div>
          </div>

          {errors.map((e) => <Notice key={e} tone="danger">{e}</Notice>)}
          {capped && <p className="text-xs text-fg-4">Ordenado entre tus últimos {MAX_SORTED} vídeos de cada red.</p>}

          {single && (
            <div className="grid grid-cols-2 gap-3 pb-3 lg:grid-cols-4">
              <Stat label="Seguidores" value={fmt(single.followers)} />
              <Stat label="Vistas medias" value={fmt(avgViews)} />
              <Stat label="Me gusta medios" value={fmt(avgLikes)} />
              <Stat label="Mejor vídeo" value={best ? fmt(best.views) : "—"} />
            </div>
          )}

          {/* Misma tarjeta que el banco de vídeos: portada a sangre, la red arriba y los números sobre un degradado */}
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {sorted.map((item) => {
              const vsAvg = single ? change(item.views, avgViews) : null;
              return (
                <li key={item.key} className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-surface-2">
                  {item.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt="" loading="lazy"
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  )}
                  {/* Toda la tarjeta abre el vídeo en su red (la primera, si está en las dos) */}
                  <a href={item.networks[0].permalink} target="_blank" rel="noopener noreferrer" title={item.caption || undefined}
                    aria-label={`Abrir en ${NAMES[item.networks[0].network]}`} className="absolute inset-0" />
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {item.networks.map((n) => (
                      <a key={n.network} href={n.permalink} target="_blank" rel="noopener noreferrer" className={`${pill} hover:bg-[rgb(0_0_0/0.6)]`}>
                        {NAMES[n.network]}
                      </a>
                    ))}
                  </div>
                  {best && item.key === best.key && <span className={`${pill} absolute top-2 right-2`}>Mejor</span>}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-[rgb(0_0_0/0.85)] via-[rgb(0_0_0/0.4)] to-transparent px-3 pt-20 pb-3 text-[#fff]">
                    <p className="flex items-center gap-1.5 text-lg font-medium tabular-nums">
                      <Eye className="size-4" strokeWidth={1.75} />
                      {fmt(item.views)}
                    </p>
                    {item.networks.length > 1 && (
                      <p className="text-xs text-[rgb(255_255_255/0.7)] tabular-nums">
                        {item.networks.map((n) => `${NAMES[n.network]} ${fmt(n.views)}`).join(" · ")}
                      </p>
                    )}
                    {vsAvg && <p className="text-xs text-[rgb(255_255_255/0.7)]">{vsAvg}</p>}
                    <p className="mt-2 line-clamp-2 text-xs text-[rgb(255_255_255/0.85)]">{item.caption || "Sin descripción"}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[rgb(255_255_255/0.7)] tabular-nums">
                      <span className="inline-flex items-center gap-1"><Heart className="size-3.5" strokeWidth={1.75} />{fmt(item.likes)}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" strokeWidth={1.75} />{fmt(item.comments)}</span>
                      <span className="ml-auto">{new Date(item.postedAt).toLocaleDateString("es", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="pt-2">
            <Pagination current={page} last={lastPage} href={(p) => href({ p: p > 1 ? String(p) : undefined })} />
          </div>
        </section>
      </div>
    </Page>
  );
}
