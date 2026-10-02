import type { Reference } from "./sample";

export const compact = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
export const PLATFORM = { tiktok: "TikTok", instagram: "Instagram" } as const;
export const VIDEO_SUGGESTIONS = ["¿Por qué funciona?", "Adáptalo a mi marca", "Dame el guion en mi voz"];

// Lo que se le manda al agente: la pregunta con el vídeo como contexto (texto, cuenta y cifras; no ve el vídeo)
export function withContext(item: Reference, question: string) {
  return [
    `Vídeo de referencia de @${item.handle} en ${PLATFORM[item.platform]}`,
    `(${compact.format(item.views)} visualizaciones, ${compact.format(item.likes)} me gusta, ${compact.format(item.comments)} comentarios).`,
    `Texto: "${item.caption}"`,
    "",
    question,
  ].join("\n");
}

// Para mostrar en el chat solo la pregunta, con una etiqueta del vídeo, en vez de todo el contexto
export function parseContext(content: string) {
  const match = content.match(/^Vídeo de referencia de @(\S+) en (TikTok|Instagram)\n[\s\S]*?\n\n([\s\S]*)$/);
  if (!match) return null;
  return { handle: match[1], platform: match[2] === "TikTok" ? "tiktok" as const : "instagram" as const, question: match[3] };
}
