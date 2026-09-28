// Fuente de los vídeos propios del founder para crear su perfil.
// La conexión real (API oficial de Instagram y TikTok) se añade al implementar cada fuente.

export type SocialPlatform = "instagram" | "tiktok";

export type SocialVideo = {
  platform: SocialPlatform;
  caption: string;
  // Lo que dice en el vídeo, si se pudo transcribir.
  transcript?: string;
  views?: number;
  likes?: number;
  comments?: number;
  postedAt?: string;
  // Comentarios destacados: sirven para saber qué pregunta su audiencia.
  topComments?: string[];
};

export interface SocialSource {
  platform: SocialPlatform;
  recentVideos(limit: number): Promise<SocialVideo[]>;
}

// Devuelve la fuente conectada del usuario, o null si aún no ha conectado esa red.
export async function getSocialSource(userId: string, platform: SocialPlatform): Promise<SocialSource | null> {
  // Todavía no hay ninguna red conectable.
  void userId;
  void platform;
  return null;
}
