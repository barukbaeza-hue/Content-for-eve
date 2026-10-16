"use server";

import { revalidatePath } from "next/cache";
import { AiError, studioEdit, type StudioEdit, type StudioTurn } from "@/lib/ai";
import { aiErrorMessage } from "@/lib/ai-errors";
import { applyLineEdits, type Word } from "@/lib/subtitles";
import { createClient } from "@/lib/supabase/server";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Sesión caducada. Vuelve a entrar.");
  return { supabase, userId: data.claims.sub as string };
}

// El asistente del Studio: recibe el estado actual (subtítulos y título) y devuelve los cambios que pide el founder.
// No guarda nada: los cambios se ven en la vista previa y se guardan con «Guardar».
export async function studioChat(
  lines: string[],
  title: string | null,
  history: StudioTurn[],
  request: string,
): Promise<StudioEdit | { error: string }> {
  const text = request.trim();
  if (!text) return { error: "Escribe qué quieres cambiar." };
  const { supabase } = await currentUser();
  const { data: brand } = await supabase.from("brand_profiles").select("vocabulary").maybeSingle();
  try {
    return await studioEdit({ lines, title, vocabulary: brand?.vocabulary ?? [] }, history, text);
  } catch (error) {
    if (error instanceof AiError) return { error: aiErrorMessage(error) };
    throw error;
  }
}

// Guarda los subtítulos y el título del Studio y pide al worker que los vuelva a poner sobre la copia sin subtítulos
// (rápido: no se vuelve a editar el vídeo). Las correcciones de una palabra por otra van al diccionario de la marca.
export async function saveStudio(id: string, lines: string[], title: string | null, remember: boolean): Promise<{ error?: string }> {
  const { supabase, userId } = await currentUser();
  const { data: video } = await supabase
    .from("videos")
    .select("transcript, clean_path, edit_status, card")
    .eq("id", id)
    .maybeSingle();
  if (!video) return { error: "No se encontró el vídeo." };
  if (!video.clean_path) return { error: "Este vídeo se editó antes de poder cambiar los subtítulos. Súbelo de nuevo." };
  if (video.edit_status !== "edited") return { error: "Espera a que termine la edición actual." };

  const current = (video.transcript?.edited_words ?? []) as Word[];
  const { words, corrections } = applyLineEdits(current, lines);
  const estilo = { ...(video.card?.estilo ?? {}) };
  if (title?.trim()) estilo.titulo = title.trim();
  else delete estilo.titulo;

  const { error } = await supabase
    .from("videos")
    .update({
      transcript: { ...video.transcript, edited_words: words },
      card: { ...video.card, estilo },
      edit_status: "queued",
      edit_job: "subtitulos",
      edit_attempts: 0,
      edit_error: null,
    })
    .eq("id", id);
  if (error) return { error: "No se pudieron guardar los cambios." };

  if (remember && Object.keys(corrections).length) {
    const { data: brand } = await supabase
      .from("brand_profiles")
      .select("vocabulary, corrections")
      .eq("user_id", userId)
      .maybeSingle();
    const vocabulary = [...new Set([...(brand?.vocabulary ?? []), ...Object.values(corrections)])];
    await supabase
      .from("brand_profiles")
      .upsert({ user_id: userId, vocabulary, corrections: { ...(brand?.corrections ?? {}), ...corrections } });
  }

  revalidatePath("/videos");
  return {};
}
