"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { r2Configured, removeObjects, signUpload } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { applyLineEdits, type Word } from "@/lib/subtitles";

const MAX_FILES = 20;
const MAX_BYTES = 2 * 1024 ** 3; // 2 GB por vídeo

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Sesión caducada. Vuelve a entrar.");
  return { supabase, userId: data.claims.sub as string };
}

export type UploadSlot = { id: string; key: string; url: string };
export type PrepareResult = { slots: UploadSlot[] } | { error: string };

// Paso 1: enlaces temporales para que el navegador suba cada vídeo directamente a R2.
export async function prepareUploads(files: { name: string; type: string; size: number }[]): Promise<PrepareResult> {
  if (!r2Configured()) return { error: "El almacenamiento de vídeos aún no está configurado." };
  if (files.length === 0) return { error: "Elige al menos un vídeo." };
  if (files.length > MAX_FILES) return { error: `Puedes subir hasta ${MAX_FILES} vídeos a la vez.` };
  if (files.some((f) => !f.type.startsWith("video/"))) return { error: "Solo se pueden subir vídeos." };
  if (files.some((f) => f.size > MAX_BYTES)) return { error: "Cada vídeo puede pesar como máximo 2 GB." };

  const { userId } = await currentUser();
  const slots = await Promise.all(
    files.map(async (file) => {
      const id = randomUUID();
      const ext = (file.name.match(/\.[a-z0-9]{2,4}$/i)?.[0] ?? ".mp4").toLowerCase();
      const key = `videos/${userId}/${id}/original${ext}`;
      return { id, key, url: await signUpload(key, file.type) };
    }),
  );
  return { slots };
}

// Paso 2: cuando los vídeos ya están en R2, entran en la cola de edición.
export async function queueVideos(
  items: { id: string; key: string; title: string }[],
  instructions: string,
): Promise<{ error?: string }> {
  const { supabase, userId } = await currentUser();
  // Solo se aceptan rutas de la propia cuenta
  if (items.some((i) => !i.key.startsWith(`videos/${userId}/${i.id}/`))) return { error: "Subida no válida." };

  const { error } = await supabase.from("videos").insert(
    items.map((item) => ({
      id: item.id,
      title: item.title.slice(0, 120) || "Vídeo sin título",
      raw_path: item.key,
      status: "editing",
      edit_status: "queued",
      edit_instructions: instructions.trim() || null,
      platforms: ["instagram"],
    })),
  );
  if (error) return { error: "No se pudieron guardar los vídeos. Inténtalo de nuevo." };
  revalidatePath("/videos");
  return {};
}

export async function retryVideo(id: string) {
  const { supabase } = await currentUser();
  await supabase
    .from("videos")
    .update({ edit_status: "queued", edit_error: null, edit_attempts: 0 })
    .eq("id", id)
    .eq("edit_status", "failed");
  revalidatePath("/videos");
}

const PLATFORMS = ["instagram", "tiktok"] as const;
export type Platform = (typeof PLATFORMS)[number];

// Texto de la publicación y redes donde saldrá el vídeo
export async function updatePost(id: string, caption: string, platforms: Platform[]): Promise<{ error?: string }> {
  const chosen = PLATFORMS.filter((p) => platforms.includes(p));
  if (!chosen.length) return { error: "Elige al menos una red." };
  if (caption.length > 2200) return { error: "El texto no puede pasar de 2.200 caracteres." };
  const { supabase } = await currentUser();
  const { error } = await supabase.from("videos").update({ caption: caption.trim() || null, platforms: chosen }).eq("id", id);
  if (error) return { error: "No se pudo guardar." };
  revalidatePath("/videos");
  revalidatePath("/calendario");
  return {};
}

export async function renameVideo(id: string, title: string): Promise<{ error?: string }> {
  const clean = title.trim().slice(0, 120);
  if (!clean) return { error: "Escribe un nombre." };
  const { supabase } = await currentUser();
  const { error } = await supabase.from("videos").update({ title: clean }).eq("id", id);
  if (error) return { error: "No se pudo cambiar el nombre." };
  revalidatePath("/videos");
  return {};
}

export async function deleteVideo(id: string) {
  const { supabase } = await currentUser();
  const { data: video } = await supabase.from("videos").select("raw_path, storage_path, clean_path").eq("id", id).maybeSingle();
  if (!video) return;
  await removeObjects([video.raw_path, video.storage_path, video.clean_path].filter(Boolean) as string[]).catch((e) =>
    console.error("No se pudo borrar el vídeo de R2:", e),
  );
  await supabase.from("videos").delete().eq("id", id);
  revalidatePath("/videos");
}

// Guarda los subtítulos corregidos y pide al worker que los vuelva a poner (sin reeditar el vídeo).
// Las correcciones de una palabra por otra se guardan en el diccionario de la marca para los próximos vídeos.
export async function saveSubtitles(id: string, lines: string[], remember: boolean): Promise<{ error?: string }> {
  const { supabase, userId } = await currentUser();
  const { data: video } = await supabase
    .from("videos")
    .select("transcript, clean_path, edit_status")
    .eq("id", id)
    .maybeSingle();
  if (!video) return { error: "No se encontró el vídeo." };
  if (!video.clean_path) return { error: "Este vídeo se editó antes de poder corregir subtítulos. Súbelo de nuevo para corregirlos." };
  if (video.edit_status !== "edited") return { error: "Espera a que termine la edición actual." };

  const current = (video.transcript?.edited_words ?? []) as Word[];
  const { words, corrections } = applyLineEdits(current, lines);

  const { error } = await supabase
    .from("videos")
    .update({
      transcript: { ...video.transcript, edited_words: words },
      edit_status: "queued",
      edit_job: "subtitulos",
      edit_attempts: 0,
      edit_error: null,
    })
    .eq("id", id);
  if (error) return { error: "No se pudieron guardar los subtítulos." };

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
