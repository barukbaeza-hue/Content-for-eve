// TikTok: inicio de sesión (Login Kit) para publicar vídeos (Content Posting API). Solo se usa en el servidor.
const API = "https://open.tiktokapis.com/v2";

// user.info.basic: nombre y foto · user.info.profile: @usuario · user.info.stats: seguidores
// video.list: tus vídeos y sus métricas · video.publish: publicar directamente
export const TIKTOK_SCOPES = ["user.info.basic", "user.info.profile", "user.info.stats", "video.list", "video.publish"];

// Sin espacios ni saltos de línea que se cuelan al pegar las claves en Vercel.
const clientKey = () => (process.env.TIKTOK_CLIENT_KEY ?? "").trim();
const clientSecret = () => (process.env.TIKTOK_CLIENT_SECRET ?? "").trim();

export function tiktokConfigured() {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

export function authorizeUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_key: clientKey(),
    scope: TIKTOK_SCOPES.join(","),
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
}

export class TikTokError extends Error {}

// Cambia el código de autorización por el token (24 h) y el de renovación (365 días).
export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey(),
      client_secret: clientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new TikTokError(body.error_description || body.error || `TikTok respondió ${res.status}`);
  }
  return {
    openId: body.open_id as string,
    accessToken: body.access_token as string,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
    refreshToken: body.refresh_token as string,
    refreshExpiresAt: new Date(Date.now() + body.refresh_expires_in * 1000),
    scope: String(body.scope ?? ""),
  };
}

// El token dura 24 h: si caducó (o está por caducar), se renueva con el de renovación y se guarda
export async function freshToken(
  account: { id: string; access_token: string; token_expires_at: string | null; refresh_token: string | null },
  save: (fields: Record<string, string>) => Promise<unknown>,
) {
  const left = account.token_expires_at ? new Date(account.token_expires_at).getTime() - Date.now() : 0;
  if (left > 5 * 60 * 1000) return account.access_token;
  if (!account.refresh_token) throw new TikTokError("La conexión con TikTok caducó. Vuelve a conectarla en Mi marca.");
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new TikTokError("La conexión con TikTok caducó. Vuelve a conectarla en Mi marca.");
  await save({
    access_token: body.access_token,
    token_expires_at: new Date(Date.now() + body.expires_in * 1000).toISOString(),
    refresh_token: body.refresh_token,
    refresh_expires_at: new Date(Date.now() + body.refresh_expires_in * 1000).toISOString(),
  });
  return body.access_token as string;
}

async function api<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.error?.code && body.error.code !== "ok")) {
    const code = body.error?.code;
    throw new TikTokError(code === "scope_not_authorized"
      ? "Falta el permiso para leer tus vídeos. Vuelve a conectar TikTok en Mi marca."
      : body.error?.message || `TikTok respondió ${res.status}`);
  }
  return body.data as T;
}

// Seguidores y número de vídeos publicados
export async function getStats(token: string) {
  const data = await api<{ user: { follower_count?: number; video_count?: number } }>("/user/info/?fields=follower_count,video_count", token);
  return { followers: data.user.follower_count, videos: data.user.video_count };
}

export type TikTokVideo = {
  id: string;
  caption: string;
  permalink: string;
  thumbnailUrl?: string;
  postedAt: string;
  likes?: number;
  comments?: number;
  views?: number;
};

// Una página de vídeos con sus métricas. TikTok los da de 20 en 20 con un cursor: se avanza hasta la página pedida.
export async function videosPage(token: string, page: number, perPage: number): Promise<{ items: TikTokVideo[]; hasMore: boolean }> {
  const limit = page * perPage;
  const fields = "id,title,video_description,cover_image_url,share_url,create_time,view_count,like_count,comment_count";
  const all: Record<string, string | number | undefined>[] = [];
  let cursor: number | undefined;
  let more = false;
  while (all.length < limit) {
    const data = await api<{ videos?: Record<string, string | number | undefined>[]; cursor?: number; has_more?: boolean }>(
      `/video/list/?fields=${fields}`,
      token,
      { method: "POST", body: JSON.stringify({ max_count: Math.min(limit - all.length, 20), ...(cursor ? { cursor } : {}) }) },
    );
    all.push(...(data.videos ?? []));
    more = Boolean(data.has_more && data.cursor);
    if (!more) break;
    cursor = data.cursor;
  }
  const items = all.slice((page - 1) * perPage, limit).map((v) => ({
    id: String(v.id),
    caption: String(v.video_description || v.title || ""),
    permalink: String(v.share_url ?? ""),
    thumbnailUrl: v.cover_image_url ? String(v.cover_image_url) : undefined,
    postedAt: new Date(Number(v.create_time) * 1000).toISOString(),
    likes: v.like_count === undefined ? undefined : Number(v.like_count),
    comments: v.comment_count === undefined ? undefined : Number(v.comment_count),
    views: v.view_count === undefined ? undefined : Number(v.view_count),
  }));
  return { items, hasMore: more || all.length > limit };
}

// Ajustes de publicación que exige TikTok: lo que puede elegir cada cuenta antes de publicar
export type TikTokSettings = {
  privacy: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  // Contenido comercial: marca propia ("Promotional content") o patrocinado ("Paid partnership")
  brandOrganic: boolean;
  brandContent: boolean;
};

export type CreatorInfo = {
  username?: string;
  nickname?: string;
  avatarUrl?: string;
  privacyOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxDuration?: number;
};

export async function creatorInfo(token: string): Promise<CreatorInfo> {
  const data = await api<{
    creator_username?: string;
    creator_nickname?: string;
    creator_avatar_url?: string;
    privacy_level_options?: string[];
    comment_disabled?: boolean;
    duet_disabled?: boolean;
    stitch_disabled?: boolean;
    max_video_post_duration_sec?: number;
  }>("/post/publish/creator_info/query/", token, { method: "POST" });
  return {
    username: data.creator_username,
    nickname: data.creator_nickname,
    avatarUrl: data.creator_avatar_url,
    privacyOptions: data.privacy_level_options ?? [],
    commentDisabled: Boolean(data.comment_disabled),
    duetDisabled: Boolean(data.duet_disabled),
    stitchDisabled: Boolean(data.stitch_disabled),
    maxDuration: data.max_video_post_duration_sec,
  };
}

export async function getProfile(token: string) {
  const res = await fetch(`${API}/user/info/?fields=open_id,avatar_url,display_name,username`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error?.code !== "ok") throw new TikTokError(body.error?.message || `TikTok respondió ${res.status}`);
  const user = body.data.user as { open_id: string; avatar_url?: string; display_name?: string; username?: string };
  return { username: user.username || user.display_name || null, avatarUrl: user.avatar_url ?? null };
}
