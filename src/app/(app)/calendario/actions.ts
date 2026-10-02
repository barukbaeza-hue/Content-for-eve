"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Programa (o devuelve al banco con `at: null`) varios vídeos de una vez.
// Solo se mueven vídeos editados que aún no se han publicado.
export async function scheduleVideos(items: { id: string; at: string | null }[], timezone: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Sesión caducada. Vuelve a entrar." };

  // TikTok exige que el usuario elija quién puede ver el vídeo: sin eso no se deja programar
  const toSchedule = items.filter((i) => i.at).map((i) => i.id);
  if (toSchedule.length) {
    const { data: pending } = await supabase
      .from("videos")
      .select("title, platforms, tiktok_settings")
      .in("id", toSchedule);
    const missing = (pending ?? []).find((v) => v.platforms?.includes("tiktok") && !v.tiktok_settings?.privacy);
    if (missing) {
      return { error: `Antes de programar "${missing.title}", elige en «Descripción y redes» quién puede verlo en TikTok.` };
    }
  }

  for (const { id, at } of items.slice(0, 60)) {
    if (at && Number.isNaN(Date.parse(at))) return { error: "Fecha no válida." };
    const { error } = await supabase
      .from("videos")
      .update(at ? { status: "scheduled", scheduled_at: at } : { status: "ready", scheduled_at: null })
      .eq("id", id)
      .eq("edit_status", "edited")
      .in("status", ["ready", "scheduled"]);
    if (error) return { error: "No se pudo guardar el calendario. Inténtalo de nuevo." };
    // Si antes falló la publicación, al volver a programarlo se intenta de cero
    await supabase.from("publications").delete().eq("video_id", id).eq("status", "failed");
  }

  // La zona horaria del navegador se guarda para publicar a la hora correcta
  await supabase.from("brand_profiles").update({ timezone }).eq("user_id", data.claims.sub).neq("timezone", timezone);
  revalidatePath("/calendario");
  revalidatePath("/videos");
  return {};
}

// Ajustes del calendario: cuántos vídeos al día y a qué horas se suele publicar
export async function saveCalendarSettings(perDay: number, times: string[]): Promise<{ error?: string }> {
  const clean = [...new Set(times.filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)))].sort().slice(0, 8);
  if (!clean.length) return { error: "Añade al menos una hora de publicación." };
  if (![1, 2, 3].includes(perDay)) return { error: "Elige entre 1 y 3 vídeos al día." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Sesión caducada. Vuelve a entrar." };
  const { error } = await supabase
    .from("brand_profiles")
    .update({ posts_per_day: perDay, post_times: clean })
    .eq("user_id", data.claims.sub);
  if (error) return { error: "No se pudieron guardar los ajustes." };
  revalidatePath("/calendario");
  return {};
}
