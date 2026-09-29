import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/app-url";
import { exchangeCode, getProfile, InstagramError } from "@/lib/instagram";
import { createClient } from "@/lib/supabase/server";

const DESTINATIONS = { bienvenida: "/bienvenida", marca: "/marca" } as const;

export async function GET(request: NextRequest) {
  const base = appUrl(request);
  const params = request.nextUrl.searchParams;

  let saved: { state?: string; from?: keyof typeof DESTINATIONS; redirectUri?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get("ig_oauth")?.value ?? "{}");
  } catch {}
  const target = DESTINATIONS[saved.from ?? "bienvenida"] ?? "/bienvenida";

  const fail = (reason: string, detail?: string) => {
    const query = new URLSearchParams({ instagram: reason });
    if (detail) query.set("detalle", detail.slice(0, 200));
    const response = NextResponse.redirect(`${base}${target}?${query}`);
    response.cookies.delete({ name: "ig_oauth", path: "/api/instagram" });
    return response;
  };

  // El usuario canceló en Instagram, o la respuesta no es de esta sesión.
  if (params.get("error")) return fail("cancelado");
  const code = params.get("code");
  if (!code || !saved.state || params.get("state") !== saved.state) return fail("error");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.redirect(`${base}/login`);

  try {
    const token = await exchangeCode(code, saved.redirectUri ?? `${base}/api/instagram/callback`);
    const profile = await getProfile(token.accessToken);

    const { error } = await supabase.from("social_accounts").upsert(
      {
        user_id: data.claims.sub,
        platform: "instagram",
        external_user_id: String(profile.user_id),
        username: profile.username,
        profile_picture_url: profile.profile_picture_url ?? null,
        followers_count: profile.followers_count ?? null,
        access_token: token.accessToken,
        token_expires_at: token.expiresAt.toISOString(),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" },
    );
    if (error) return fail("error", `guardar: ${error.message}`);
  } catch (error) {
    console.error("Error al conectar Instagram:", error);
    return fail(error instanceof InstagramError ? "rechazado" : "error", error instanceof Error ? error.message : undefined);
  }

  const next = saved.from === "marca" ? "/marca?analizar=1" : "/bienvenida?paso=analizando";
  const response = NextResponse.redirect(`${base}${next}`);
  response.cookies.delete({ name: "ig_oauth", path: "/api/instagram" });
  return response;
}
