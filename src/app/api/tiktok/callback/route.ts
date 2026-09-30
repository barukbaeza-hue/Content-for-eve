import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, getProfile, TikTokError } from "@/lib/tiktok";

export async function GET(request: NextRequest) {
  const base = appUrl(request);
  const params = request.nextUrl.searchParams;

  let saved: { state?: string; redirectUri?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get("tt_oauth")?.value ?? "{}");
  } catch {}

  const finish = (query: Record<string, string>) => {
    const response = NextResponse.redirect(`${base}/marca?${new URLSearchParams(query)}`);
    response.cookies.delete({ name: "tt_oauth", path: "/api/tiktok" });
    return response;
  };

  // El usuario canceló en TikTok, o la respuesta no es de esta sesión.
  if (params.get("error")) return finish({ tiktok: "cancelado" });
  const code = params.get("code");
  if (!code || !saved.state || params.get("state") !== saved.state) return finish({ tiktok: "error" });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.redirect(`${base}/login`);

  try {
    const token = await exchangeCode(code, saved.redirectUri ?? `${base}/api/tiktok/callback`);
    if (!token.scope.includes("video.publish")) {
      return finish({ tiktok: "rechazado", detalle: "no se dio permiso para publicar vídeos" });
    }
    const profile = await getProfile(token.accessToken).catch(() => ({ username: null, avatarUrl: null }));

    const { error } = await supabase.from("social_accounts").upsert(
      {
        user_id: data.claims.sub,
        platform: "tiktok",
        external_user_id: token.openId,
        username: profile.username,
        profile_picture_url: profile.avatarUrl,
        access_token: token.accessToken,
        token_expires_at: token.expiresAt.toISOString(),
        refresh_token: token.refreshToken,
        refresh_expires_at: token.refreshExpiresAt.toISOString(),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" },
    );
    if (error) return finish({ tiktok: "error", detalle: `guardar: ${error.message}` });
  } catch (error) {
    console.error("Error al conectar TikTok:", error);
    return finish({
      tiktok: error instanceof TikTokError ? "rechazado" : "error",
      detalle: (error instanceof Error ? error.message : "").slice(0, 400),
    });
  }

  return finish({ tiktok: "conectado" });
}
