"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { ok: boolean; message: string } | null;

export async function saveBrandProfile(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { ok: false, message: "Tu sesión ha caducado. Vuelve a entrar." };

  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;
  const topics = String(formData.get("topics") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase.from("brand_profiles").upsert({
    user_id: data.claims.sub,
    niche: text("niche"),
    audience: text("audience"),
    tone: text("tone"),
    topics,
    building: text("building"),
    story: text("story"),
    expertise: text("expertise"),
    opinions: text("opinions"),
    audience_questions: text("audience_questions"),
    call_to_action: text("call_to_action"),
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, message: "No se pudo guardar. Inténtalo de nuevo." };
  revalidatePath("/marca");
  return { ok: true, message: "Guardado." };
}
