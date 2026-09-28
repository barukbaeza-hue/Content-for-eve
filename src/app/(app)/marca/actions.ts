"use server";

import { revalidatePath } from "next/cache";
import { AiError, analyzeProfile } from "@/lib/ai";
import { getSocialSource, type SocialPlatform } from "@/lib/social";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { ok: boolean; message: string } | null;

const TEXT_FIELDS = ["niche", "audience", "tone", "description"] as const;

export async function saveBrandProfile(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { ok: false, message: "Tu sesión ha caducado. Vuelve a entrar." };

  const values = Object.fromEntries(
    TEXT_FIELDS.map((key) => [key, String(formData.get(key) ?? "").trim() || null]),
  );
  const topics = String(formData.get("topics") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase.from("brand_profiles").upsert({
    user_id: data.claims.sub,
    ...values,
    topics,
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, message: "No se pudo guardar. Inténtalo de nuevo." };
  revalidatePath("/marca");
  return { ok: true, message: "Guardado." };
}

const ANALYZE_ERRORS: Record<AiError["reason"], string> = {
  "sin-clave": "La IA aún no está configurada. Falta la clave de Anthropic en Vercel.",
  "clave-invalida": "La clave de Anthropic no es válida. Revísala en Vercel.",
  "sin-saldo": "Se acabó el saldo de la IA. Recarga créditos en la consola de Anthropic.",
  saturada: "La IA está saturada ahora mismo. Prueba de nuevo en un minuto.",
  limite: "Demasiadas peticiones seguidas. Espera un minuto y vuelve a intentarlo.",
  fallo: "No se pudo analizar tu perfil. Inténtalo de nuevo.",
};

// Crea (o actualiza) el perfil a partir de los vídeos de las redes conectadas.
export async function analyzeFromSocial(platforms: SocialPlatform[]): Promise<SaveState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { ok: false, message: "Tu sesión ha caducado. Vuelve a entrar." };

  const sources = (await Promise.all(platforms.map((p) => getSocialSource(data.claims.sub, p)))).filter(
    (s) => s !== null,
  );
  if (sources.length === 0) return { ok: false, message: "Primero conecta Instagram o TikTok." };

  try {
    const videos = (await Promise.all(sources.map((s) => s.recentVideos(20)))).flat();
    const draft = await analyzeProfile(videos);
    const connected = sources.map((s) => s.platform).sort();

    const { error } = await supabase.from("brand_profiles").upsert({
      user_id: data.claims.sub,
      ...Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, typeof v === "string" ? v || null : v])),
      source: connected.length === 2 ? "instagram_tiktok" : connected[0],
      analyzed_videos: videos.length,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, message: "No se pudo guardar tu perfil. Inténtalo de nuevo." };
  } catch (error) {
    if (error instanceof AiError) return { ok: false, message: ANALYZE_ERRORS[error.reason] };
    throw error;
  }

  revalidatePath("/marca");
  return { ok: true, message: "Tu perfil está listo." };
}
