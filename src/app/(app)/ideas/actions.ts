"use server";

import { revalidatePath } from "next/cache";
import { AiError, generateIdeas } from "@/lib/ai";
import { STATUSES, type Status } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

export type GenerateState = { error: string } | null;

const AI_ERRORS: Record<AiError["reason"], string> = {
  "sin-clave": "La IA aún no está configurada. Falta la clave de Anthropic en Vercel.",
  "clave-invalida": "La clave de Anthropic no es válida. Revísala en Vercel.",
  "sin-saldo": "Se acabó el saldo de la IA. Recarga créditos en la consola de Anthropic.",
  saturada: "La IA está saturada ahora mismo. Prueba de nuevo en un minuto.",
  limite: "Demasiadas peticiones seguidas. Espera un minuto y vuelve a intentarlo.",
  fallo: "La IA no pudo generar ideas esta vez. Inténtalo de nuevo.",
};

export async function generate(_prev: GenerateState, formData: FormData): Promise<GenerateState> {
  const supabase = await createClient();

  const [{ data: brand }, { data: recent }] = await Promise.all([
    supabase.from("brand_profiles").select("niche, audience, tone, topics").maybeSingle(),
    supabase.from("ideas").select("title").order("created_at", { ascending: false }).limit(30),
  ]);
  if (!brand) return { error: "Primero completa Mi marca." };

  try {
    const ideas = await generateIdeas(brand, {
      topic: String(formData.get("topic") ?? "").trim() || undefined,
      avoid: (recent ?? []).map((r) => r.title),
      count: 5,
    });

    const { error } = await supabase.from("ideas").insert(
      ideas.map((i) => ({ title: i.title, hook: i.hook, format: i.format, script: i.script })),
    );
    if (error) return { error: "No se pudieron guardar las ideas. Inténtalo de nuevo." };
  } catch (error) {
    if (error instanceof AiError) {
      const code = error.code && error.reason === "fallo" ? ` (código: ${error.code})` : "";
      return { error: AI_ERRORS[error.reason] + code };
    }
    throw error;
  }

  revalidatePath("/ideas");
  return null;
}

export async function setStatus(id: string, status: Status) {
  if (!(status in STATUSES)) return;
  const supabase = await createClient();
  await supabase.from("ideas").update({ status }).eq("id", id);
  revalidatePath("/ideas");
}

export async function remove(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("ideas").delete().eq("id", String(formData.get("id")));
  revalidatePath("/ideas");
}
