import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name} en worker/.env`);
  return value;
}

export const config = {
  supabaseUrl: required("SUPABASE_URL"),
  supabaseKey: required("SUPABASE_SECRET_KEY"),
  r2: {
    endpoint: required("R2_ENDPOINT"),
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    bucket: required("R2_BUCKET"),
  },
  whisperModel: process.env.WHISPER_MODEL?.trim() || path.join(ROOT, "models", "ggml-small-q5_1.bin"),
  language: process.env.WHISPER_LANGUAGE?.trim() || "es",
  threads: Number(process.env.THREADS) || Math.max(1, os.cpus().length - 1),
  pollSeconds: Number(process.env.POLL_SECONDS) || 3,
  // TikTok: para renovar el token de 24 h al publicar
  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY?.trim() || "",
    clientSecret: process.env.TIKTOK_CLIENT_SECRET?.trim() || "",
  },
  // Epidemic Sound: música de los vídeos. Sin clave, los vídeos se editan sin música
  epidemicKey: process.env.EPIDEMIC_API_KEY?.trim() || "",
  instagramGraph: `https://graph.instagram.com/${process.env.INSTAGRAM_GRAPH_VERSION?.trim() || "v23.0"}`,
  publishSeconds: Number(process.env.PUBLISH_SECONDS) || 30,
  // En el PC del equipo guarda una copia del vídeo editado en worker/salida para revisarlo
  keepLocalCopy: process.env.GUARDAR_COPIA !== "0",
};
