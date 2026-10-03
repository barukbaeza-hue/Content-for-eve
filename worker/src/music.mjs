// Música de Epidemic Sound (API para plataformas): buscar una canción para el vídeo, descargarla y avisar del uso al publicar.
// Sin EPIDEMIC_API_KEY en worker/.env, los vídeos se editan sin música.
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { config } from "./config.mjs";
import { supabase } from "./storage.mjs";

const API = "https://partner-content-api.epidemicsound.com/v0";

// Hasta que la IA de Mova elija la música según el guion y el tono: fondo tranquilo e instrumental, que no compite con la voz
export const DEFAULT_TERM =
  "warm calm instrumental background music for a person talking to camera, soft modern beat, low energy, no vocals";

// Canciones de los últimos vídeos del founder que no se repiten
const RECENT_VIDEOS = 15;

export const musicEnabled = () => Boolean(config.epidemicKey);

// Epidemic pide un identificador estable y anónimo del usuario final (no nombre ni correo)
const partnerUser = (userId) => createHash("sha256").update(`mova:${userId}`).digest("hex").slice(0, 32);

async function epidemic(path, userId, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${config.epidemicKey}`,
      "x-partner-user-id": partnerUser(userId),
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Epidemic Sound respondió ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  return res.json();
}

/** Canciones que el founder usó en sus últimos vídeos, para no repetirlas varios días seguidos. */
async function recentTracks(userId, videoId) {
  const { data } = await supabase
    .from("videos")
    .select("card")
    .eq("user_id", userId)
    .neq("id", videoId)
    .not("edited_at", "is", null)
    .order("edited_at", { ascending: false })
    .limit(RECENT_VIDEOS);
  return new Set((data ?? []).map((v) => v.card?.edicion?.musica?.id).filter(Boolean));
}

/**
 * Elige y descarga una canción instrumental para el vídeo.
 * Devuelve dónde empieza la parte más atractiva (para vídeos cortos) y los datos para la ficha del vídeo.
 */
export async function pickTrack({ userId, videoId, term = DEFAULT_TERM, duration, file }) {
  const used = await recentTracks(userId, videoId);
  // isPreviewOnly: canciones que nuestro plan no permite descargar. Con la clave de la API solo se descargan
  // las de las colecciones activadas en el portal de Epidemic; si la búsqueda no da ninguna, se elige de ellas.
  const downloadable = (list) => list.filter((t) => !t.isPreviewOnly && t.hasVocals !== true && t.vocalType !== "LEAD");
  const params = new URLSearchParams({ term, vocalType: "NONE", sort: "relevance", order: "desc", limit: "60" });
  const { tracks = [] } = await epidemic(`/tracks/search?${params}`, userId);
  let pool = downloadable(tracks);
  if (!pool.length) pool = downloadable(await collectionTracks(userId));
  const track = pool.find((t) => !used.has(t.id)) ?? pool[0];
  if (!track) {
    throw new Error(
      `ninguna canción descargable (búsqueda: ${tracks.length}, todas de vista previa). Activa colecciones en el portal de Epidemic Sound`,
    );
  }

  const seconds = Math.min(60, Math.max(5, Math.round(duration)));
  const [highlight, download] = await Promise.all([
    epidemic(`/tracks/${track.id}/highlights?duration=${seconds}`, userId).catch(() => null),
    epidemic(`/tracks/${track.id}/download?format=mp3&quality=normal`, userId),
  ]);
  const audio = await fetch(download.url);
  if (!audio.ok) throw new Error(`No se pudo descargar la canción (${audio.status})`);
  await writeFile(file, Buffer.from(await audio.arrayBuffer()));

  const start = (highlight?.highlights?.[0]?.from ?? 0) / 1000;
  return {
    start,
    info: {
      id: track.id,
      titulo: track.title,
      artistas: [...(track.mainArtists ?? []), ...(track.featuredArtists ?? [])],
      busqueda: term,
      desde: start,
    },
  };
}

/** Canciones de las colecciones activadas en el portal de Epidemic (las que nuestro plan puede descargar). */
async function collectionTracks(userId) {
  const { collections = [] } = await epidemic("/collections?limit=50", userId);
  const tracks = [];
  for (const c of collections) {
    const list = c.tracks?.length ? c.tracks : (await epidemic(`/collections/${c.id}`, userId).catch(() => null))?.tracks ?? [];
    tracks.push(...list);
  }
  // Orden variado para no usar siempre la primera canción de la primera colección
  return tracks.sort(() => Math.random() - 0.5);
}

/** Avisa a Epidemic de que el vídeo con esa canción se publicó en una red (lo pide su licencia). */
export async function reportUsage(userId, trackId, platform) {
  if (!musicEnabled() || !trackId) return;
  await epidemic("/usage", userId, {
    method: "POST",
    body: JSON.stringify({ eventType: "EXPORTED", platform: platform.toUpperCase(), trackIds: [trackId] }),
  });
}
