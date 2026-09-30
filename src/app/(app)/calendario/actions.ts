"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Programa (o devuelve al banco con `at: null`) varios vídeos de una vez.
// Solo se mueven vídeos editados que aún no se han publicado.
export async function scheduleVideos(items: { id: string; at: string | null }[], timezone: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Sesión caducada. Vuelve a entrar." };

  for (const { id, at } of items.slice(0, 60)) {
    if (at && Number.isNaN(Date.parse(at))) return { error: "Fecha no válida." };
    const { error } = await supabase
      .from("videos")
      .update(at ? { status: "scheduled", scheduled_at: at } : { status: "ready", scheduled_at: null })
      .eq("id", id)
      .eq("edit_status", "edited")
      .in("status", ["ready", "scheduled"]);
    if (error) return { error: "No se pudo guardar el calendario. Inténtalo de nuevo." };
  }

  // La zona horaria del navegador se guarda para publicar a la hora correcta
  await supabase.from("brand_profiles").update({ timezone }).eq("user_id", data.claims.sub).neq("timezone", timezone);
  revalidatePath("/calendario");
  revalidatePath("/videos");
  return {};
}
