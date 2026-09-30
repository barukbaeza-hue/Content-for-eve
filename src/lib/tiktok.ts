// TikTok: inicio de sesión (Login Kit) para publicar vídeos (Content Posting API). Solo se usa en el servidor.
const API = "https://open.tiktokapis.com/v2";

// user.info.basic: nombre y foto · user.info.profile: @usuario · video.publish: publicar directamente
export const TIKTOK_SCOPES = ["user.info.basic", "user.info.profile", "video.publish"];

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
