// Etiquetas en español de los valores guardados en la base de datos.

export const FORMATS = {
  reel: "Reel",
  carousel: "Carrusel",
  post: "Post",
  tiktok: "TikTok",
  story: "Historia",
} as const;

export const STATUSES = {
  idea: "Idea",
  in_production: "En producción",
  ready: "Lista",
  scheduled: "Programada",
  published: "Publicada",
} as const;

export type Format = keyof typeof FORMATS;
export type Status = keyof typeof STATUSES;

// Columnas del perfil de marca que usan la IA y la pantalla "Mi marca".
export const PROFILE_FIELDS = "niche, audience, tone, topics, description";
