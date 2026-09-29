"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { r2Configured, removeObjects, signUpload } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

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

export async function deleteVideo(id: string) {
  const { supabase } = await currentUser();
  const { data: video } = await supabase.from("videos").select("raw_path, storage_path").eq("id", id).maybeSingle();
  if (!video) return;
  await removeObjects([video.raw_path, video.storage_path].filter(Boolean) as string[]).catch((e) =>
    console.error("No se pudo borrar el vídeo de R2:", e),
  );
  await supabase.from("videos").delete().eq("id", id);
  revalidatePath("/videos");
}
