// Instagram API con inicio de sesión de Instagram. Solo se usa en el servidor.
import type { SocialVideo } from "./social";

const GRAPH = `https://graph.instagram.com/${process.env.INSTAGRAM_GRAPH_VERSION || "v23.0"}`;

export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_comments",
  "instagram_business_manage_insights",
];

export function instagramConfigured() {
  return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
}

export function authorizeUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    // Pide siempre iniciar sesión, para que se conecte la cuenta correcta.
    force_reauth: "true",
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_SCOPES.join(","),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params}`;
}

export class InstagramError extends Error {}

async function graph<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${GRAPH}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new InstagramError(body?.error?.message ?? `Instagram respondió ${res.status}`);
  return body as T;
}

// Cambia el código de autorización por un token de larga duración (~60 días).
export async function exchangeCode(code: string, redirectUri: string) {
  const form = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  // La respuesta puede venir directa o dentro de `data`.
  const short = (body?.data?.[0] ?? body) as { access_token?: string; user_id?: string | number };
  if (!res.ok || !short.access_token) {
    throw new InstagramError(body?.error_message ?? body?.error?.message ?? "No se pudo conectar Instagram.");
  }

  const long = await graph<{ access_token: string; expires_in: number }>(
    "https://graph.instagram.com/access_token",
    short.access_token,
    { grant_type: "ig_exchange_token", client_secret: process.env.INSTAGRAM_APP_SECRET! },
  );
  return {
    accessToken: long.access_token,
    expiresAt: new Date(Date.now() + long.expires_in * 1000),
  };
}

export type InstagramProfile = {
  user_id: string;
  username: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
};

export function getProfile(token: string) {
  return graph<InstagramProfile>("/me", token, {
    fields: "user_id,username,profile_picture_url,followers_count,media_count",
  });
}

type Media = {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  thumbnail_url?: string;
};

// Vistas y alcance de una publicación; si Instagram no las da, se omiten.
async function mediaViews(id: string, token: string) {
  try {
    const res = await graph<{ data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(
      `/${id}/insights`,
      token,
      { metric: "views,reach" },
    );
    const get = (name: string) => {
      const m = res.data.find((d) => d.name === name);
      return m?.total_value?.value ?? m?.values?.[0]?.value;
    };
    return get("views") ?? get("reach");
  } catch {
    return undefined;
  }
}

async function topComments(id: string, token: string) {
  try {
    const res = await graph<{ data: { text: string }[] }>(`/${id}/comments`, token, { fields: "text", limit: "8" });
    return res.data.map((c) => c.text).filter(Boolean);
  } catch {
    return [];
  }
}

export type Reel = {
  id: string;
  caption: string;
  permalink: string;
  thumbnailUrl?: string;
  postedAt: string;
  likes?: number;
  comments?: number;
  views?: number;
};

// Últimos Reels con sus métricas.
export async function recentReels(token: string, limit: number): Promise<Reel[]> {
  const res = await graph<{ data: Media[] }>("/me/media", token, {
    fields: "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count,thumbnail_url",
    limit: String(Math.min(limit * 2, 50)),
  });
  const videos = res.data.filter((m) => m.media_type === "VIDEO" || m.media_product_type === "REELS").slice(0, limit);

  return Promise.all(
    videos.map(async (m) => ({
      id: m.id,
      caption: m.caption ?? "",
      permalink: m.permalink,
      thumbnailUrl: m.thumbnail_url,
      postedAt: m.timestamp,
      likes: m.like_count,
      comments: m.comments_count,
      views: await mediaViews(m.id, token),
    })),
  );
}

// Últimos vídeos con métricas y comentarios, para crear el perfil.
export async function recentVideos(token: string, limit: number): Promise<SocialVideo[]> {
  const reels = await recentReels(token, limit);
  return Promise.all(
    reels.map(async (r) => ({
      platform: "instagram" as const,
      caption: r.caption,
      likes: r.likes,
      comments: r.comments,
      views: r.views,
      postedAt: r.postedAt,
      topComments: r.comments ? await topComments(r.id, token) : [],
    })),
  );
}
