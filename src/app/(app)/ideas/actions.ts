"use server";

import { revalidatePath } from "next/cache";
import { AiError, chat } from "@/lib/ai";
import { STATUSES, type Status } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import type { ChatIdea, ChatMessage } from "./types";

const AI_ERRORS: Record<AiError["reason"], string> = {
  "sin-clave": "La IA aún no está configurada. Falta la clave de Anthropic en Vercel.",
  "clave-invalida": "La clave de Anthropic no es válida. Revísala en Vercel.",
  "sin-saldo": "Se acabó el saldo de la IA. Recarga créditos en la consola de Anthropic.",
  saturada: "La IA está saturada ahora mismo. Prueba de nuevo en un minuto.",
  limite: "Demasiadas peticiones seguidas. Espera un minuto y vuelve a intentarlo.",
  fallo: "La IA no pudo responder esta vez. Inténtalo de nuevo.",
};

// Mensajes anteriores que se envían como contexto: suficiente para seguir el hilo sin disparar el coste.
const HISTORY_LIMIT = 20;

export type SendResult = { messages: ChatMessage[] } | { error: string };

export async function sendMessage(text: string): Promise<SendResult> {
  const content = text.trim();
  if (!content) return { error: "Escribe un mensaje." };

  const supabase = await createClient();
  const [{ data: brand }, { data: recent }, { data: saved }] = await Promise.all([
    supabase
      .from("brand_profiles")
      .select("niche, audience, tone, topics, building, story, expertise, opinions, audience_questions, call_to_action")
      .maybeSingle(),
    supabase
      .from("chat_messages")
      .select("role, content, ideas")
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase.from("ideas").select("title").order("created_at", { ascending: false }).limit(50),
  ]);
  if (!brand) return { error: "Primero completa Mi marca." };

  // La API exige que la conversación empiece por un mensaje de la creadora.
  const history = (recent ?? []).reverse() as Omit<ChatMessage, "id">[];
  while (history[0]?.role === "assistant") history.shift();

  let answer;
  try {
    answer = await chat(brand, [...history, { role: "user", content, ideas: [] }], (saved ?? []).map((s) => s.title));
  } catch (error) {
    if (error instanceof AiError) {
      const code = error.code && error.reason === "fallo" ? ` (código: ${error.code})` : "";
      return { error: AI_ERRORS[error.reason] + code };
    }
    throw error;
  }

  // Marcas de tiempo explícitas para que el orden sea estable.
  const now = Date.now();
  const { data: inserted, error } = await supabase
    .from("chat_messages")
    .insert([
      { role: "user", content, created_at: new Date(now).toISOString() },
      { role: "assistant", content: answer.reply, ideas: answer.ideas, created_at: new Date(now + 1).toISOString() },
    ])
    .select("id, role, content, ideas")
    .order("created_at");
  if (error || !inserted) return { error: "No se pudo guardar la conversación. Inténtalo de nuevo." };

  return { messages: inserted as ChatMessage[] };
}

export async function saveIdea(messageId: string, index: number): Promise<string | null> {
  const supabase = await createClient();
  const { data: message } = await supabase
    .from("chat_messages")
    .select("ideas")
    .eq("id", messageId)
    .single();
  const ideas = (message?.ideas ?? []) as ChatIdea[];
  const idea = ideas[index];
  if (!idea) return null;
  if (idea.saved_id) return idea.saved_id;

  const { data: row } = await supabase
    .from("ideas")
    .insert({ title: idea.title, hook: idea.hook, format: idea.format, script: idea.script })
    .select("id")
    .single();
  if (!row) return null;

  ideas[index] = { ...idea, saved_id: row.id };
  await supabase.from("chat_messages").update({ ideas }).eq("id", messageId);
  revalidatePath("/ideas", "layout");
  return row.id;
}

export async function resetChat() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;
  await supabase.from("chat_messages").delete().eq("user_id", data.claims.sub);
  revalidatePath("/ideas");
}

export async function setStatus(id: string, status: Status) {
  if (!(status in STATUSES)) return;
  const supabase = await createClient();
  await supabase.from("ideas").update({ status }).eq("id", id);
  revalidatePath("/ideas", "layout");
}

export async function remove(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("ideas").delete().eq("id", String(formData.get("id")));
  revalidatePath("/ideas", "layout");
}
