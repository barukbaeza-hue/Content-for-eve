// Publicador: cuando llega la hora de un vídeo programado, lo publica en Instagram y TikTok.
// Cada red avanza por pasos (crear → esperar a que la red procese → publicar) y el estado queda en `publications`.
import { mkdtemp, open, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { config } from "./config.mjs";
import { download, signedUrl, supabase } from "./storage.mjs";

const MAX_ATTEMPTS = 3;
// Si la red tarda más que esto en procesar el vídeo, se da por fallido
const PROCESSING_LIMIT_MS = 30 * 60 * 1000;
const NAMES = { instagram: "Instagram", tiktok: "TikTok" };

class PublishError extends Error {
  // `final`: no tiene sentido reintentar (permiso denegado, cuenta sin conectar…)
  constructor(message, final = false) {
    super(message);
    this.final = final;
  }
}

// ---------- Instagram ----------

async function instagram(pathname, token, params = {}, method = "GET") {
  const url = new URL(pathname.startsWith("http") ? pathname : `${config.instagramGraph}${pathname}`);
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = method === "GET"
    ? await fetch(`${url}?${body}`)
    : await fetch(url, { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    // 190: token caducado o revocado; 10/200: sin permiso
    const final = [10, 190, 200].includes(e.code);
    throw new PublishError(`Instagram: ${e.error_user_msg || e.message || res.status}`, final);
  }
  return json;
}

// El token de Instagram dura ~60 días: se renueva cuando le queda menos de una semana
async function instagramToken(account) {
  const left = account.token_expires_at ? new Date(account.token_expires_at).getTime() - Date.now() : Infinity;
  if (left > 7 * 24 * 3600 * 1000) return account.access_token;
  if (left <= 0) throw new PublishError("Instagram: la conexión caducó. Vuelve a conectar la cuenta en Mi marca.", true);
  const res = await instagram("https://graph.instagram.com/refresh_access_token", account.access_token, { grant_type: "ig_refresh_token" });
  const expires = new Date(Date.now() + res.expires_in * 1000).toISOString();
  await supabase.from("social_accounts").update({ access_token: res.access_token, token_expires_at: expires }).eq("id", account.id);
  return res.access_token;
}

async function stepInstagram(pub, video, account, log) {
  const token = await instagramToken(account);
  const igUser = account.external_user_id;

  if (!pub.job_id) {
    // 1. Instagram descarga el vídeo desde R2 con un enlace temporal y crea el contenedor del Reel
    const created = await instagram(`/${igUser}/media`, token, {
      media_type: "REELS",
      video_url: await signedUrl(video.storage_path, 6 * 3600),
      caption: video.caption ?? "",
      share_to_feed: "true",
    }, "POST");
    log(`Instagram: vídeo enviado, esperando a que lo procese (${created.id})`);
    return { status: "processing", job_id: created.id };
  }

  // 2. Espera a que termine de procesarlo
  const container = await instagram(`/${pub.job_id}`, token, { fields: "status_code,status" });
  if (container.status_code === "ERROR" || container.status_code === "EXPIRED") {
    throw new PublishError(`Instagram no pudo procesar el vídeo: ${container.status || container.status_code}`, true);
  }
  if (container.status_code !== "FINISHED") return null;

  // 3. Publica
  const media = await instagram(`/${igUser}/media_publish`, token, { creation_id: pub.job_id }, "POST");
  const info = await instagram(`/${media.id}`, token, { fields: "permalink" }).catch(() => ({}));
  log(`Instagram: publicado ${info.permalink ?? media.id}`);
  return { status: "published", post_id: media.id, permalink: info.permalink ?? null, published_at: new Date().toISOString() };
}

// ---------- TikTok ----------

const TIKTOK = "https://open.tiktokapis.com/v2";

async function tiktok(pathname, token, body) {
  const res = await fetch(`${TIKTOK}${pathname}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  const code = json.error?.code;
  if (!res.ok || (code && code !== "ok")) {
    const final = ["access_token_invalid", "scope_not_authorized", "spam_risk_too_many_posts", "spam_risk_user_banned_from_posting", "privacy_level_option_mismatch"].includes(code);
    const error = new PublishError(`TikTok: ${json.error?.message || code || res.status}`, final);
    error.code = code;
    throw error;
  }
  return json.data ?? {};
}

// El token de TikTok dura 24 h: se renueva con el de renovación (365 días)
async function tiktokToken(account) {
  const left = account.token_expires_at ? new Date(account.token_expires_at).getTime() - Date.now() : 0;
  if (left > 5 * 60 * 1000) return account.access_token;
  if (!config.tiktok.clientKey || !config.tiktok.clientSecret) {
    throw new PublishError("TikTok: faltan TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET en worker/.env", true);
  }
  if (!account.refresh_token) throw new PublishError("TikTok: la conexión caducó. Vuelve a conectar la cuenta en Mi marca.", true);
  const res = await fetch(`${TIKTOK}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: config.tiktok.clientKey,
      client_secret: config.tiktok.clientSecret,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new PublishError(`TikTok: no se pudo renovar la conexión (${json.error_description || json.error || res.status}). Vuelve a conectar la cuenta en Mi marca.`, true);
  }
  await supabase.from("social_accounts").update({
    access_token: json.access_token,
    token_expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
    refresh_token: json.refresh_token,
    refresh_expires_at: new Date(Date.now() + json.refresh_expires_in * 1000).toISOString(),
  }).eq("id", account.id);
  return json.access_token;
}

// Trozos para la subida: un solo trozo hasta 64 MB; si no, de 10 MB (el último se lleva el resto)
function chunks(size) {
  const MB = 1024 * 1024;
  if (size <= 64 * MB) return { chunkSize: size, count: 1 };
  const chunkSize = 10 * MB;
  return { chunkSize, count: Math.floor(size / chunkSize) };
}

async function stepTikTok(pub, video, account, log) {
  const token = await tiktokToken(account);

  if (!pub.job_id) {
    // 1. Pide la subida directa y sube el archivo por trozos
    // Se publica con lo que eligió el usuario en "Descripción y redes" (TikTok no permite valores por defecto)
    const settings = video.tiktok_settings;
    if (!settings?.privacy) {
      throw new PublishError("TikTok: elige quién puede ver el vídeo en «Descripción y redes» y vuelve a programarlo.", true);
    }
    const creator = await tiktok("/post/publish/creator_info/query/", token);
    if (!(creator.privacy_level_options ?? []).includes(settings.privacy)) {
      throw new PublishError("TikTok: tu cuenta ya no permite la privacidad elegida. Cámbiala en «Descripción y redes».", true);
    }
    const privacy = settings.privacy;

    const dir = await mkdtemp(path.join(os.tmpdir(), "mova-tiktok-"));
    const file = path.join(dir, "video.mp4");
    try {
      await download(video.storage_path, file);
      const { size } = await stat(file);
      const { chunkSize, count } = chunks(size);
      let started;
      try {
        started = await tiktok("/post/publish/video/init/", token, {
          post_info: {
            title: video.caption ?? "",
            privacy_level: privacy,
            // Lo que la cuenta tiene desactivado en TikTok se respeta aunque se haya marcado
            disable_comment: creator.comment_disabled || !settings.allowComment,
            disable_duet: creator.duet_disabled || !settings.allowDuet,
            disable_stitch: creator.stitch_disabled || !settings.allowStitch,
            brand_organic_toggle: Boolean(settings.brandOrganic),
            brand_content_toggle: Boolean(settings.brandContent),
            video_cover_timestamp_ms: 1000,
          },
          source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: chunkSize, total_chunk_count: count },
        });
      } catch (e) {
        // Mientras TikTok no apruebe la app, solo deja publicar en cuentas privadas
        if (e.code === "unaudited_client_can_only_post_to_private_accounts") {
          throw new PublishError("TikTok: Mova aún no está aprobada por TikTok y solo puede publicar en cuentas privadas.", true);
        }
        throw e;
      }

      const handle = await open(file, "r");
      try {
        for (let i = 0; i < count; i++) {
          const start = i * chunkSize;
          const end = i === count - 1 ? size - 1 : start + chunkSize - 1;
          const buffer = Buffer.alloc(end - start + 1);
          await handle.read(buffer, 0, buffer.length, start);
          const res = await fetch(started.upload_url, {
            method: "PUT",
            headers: {
              "Content-Type": "video/mp4",
              "Content-Length": String(buffer.length),
              "Content-Range": `bytes ${start}-${end}/${size}`,
            },
            body: buffer,
          });
          if (!res.ok) throw new PublishError(`TikTok: falló la subida del vídeo (${res.status})`);
        }
      } finally {
        await handle.close();
      }
      log(`TikTok: vídeo subido${privacy === "SELF_ONLY" ? " (solo tú)" : ""}, esperando a que lo procese`);
      return { status: "processing", job_id: started.publish_id };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  // 2. Espera a que TikTok termine de procesarlo y lo publique
  const status = await tiktok("/post/publish/status/fetch/", token, { publish_id: pub.job_id });
  if (status.status === "FAILED") throw new PublishError(`TikTok no pudo publicar el vídeo: ${status.fail_reason || "sin motivo"}`, true);
  if (status.status !== "PUBLISH_COMPLETE") return null;

  const postId = status.publicaly_available_post_id?.[0] ?? null;
  const permalink = postId && account.username ? `https://www.tiktok.com/@${account.username}/video/${postId}` : null;
  log(`TikTok: publicado${permalink ? ` ${permalink}` : ""}`);
  return { status: "published", post_id: postId ? String(postId) : null, permalink, published_at: new Date().toISOString() };
}

// ---------- Bucle ----------

const STEPS = { instagram: stepInstagram, tiktok: stepTikTok };
// Para las pruebas
export const _steps = { ...STEPS, chunks };

async function processVideo(video, log) {
  const { data: accounts } = await supabase.from("social_accounts").select("*").eq("user_id", video.user_id);

  // Una publicación por red elegida (la primera vez)
  await supabase.from("publications").upsert(
    video.platforms.map((platform) => ({ user_id: video.user_id, video_id: video.id, platform })),
    { onConflict: "video_id,platform", ignoreDuplicates: true },
  );
  const { data: pubs } = await supabase.from("publications").select("*").eq("video_id", video.id);

  for (const pub of pubs ?? []) {
    if (pub.status === "published" || pub.status === "failed") continue;
    const account = accounts?.find((a) => a.platform === pub.platform);
    const save = (fields) =>
      supabase.from("publications").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", pub.id);

    if (!account) {
      await save({ status: "failed", error: `${NAMES[pub.platform]} no está conectado. Conéctalo en Mi marca.` });
      continue;
    }
    if (pub.status === "processing" && Date.now() - new Date(pub.updated_at).getTime() > PROCESSING_LIMIT_MS) {
      await save({ status: "failed", error: `${NAMES[pub.platform]} tardó demasiado en procesar el vídeo.` });
      continue;
    }
    try {
      const result = await STEPS[pub.platform](pub, video, account, log);
      if (result) await save({ ...result, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const attempts = pub.attempts + 1;
      const final = e.final || attempts >= MAX_ATTEMPTS;
      log(`${NAMES[pub.platform]}: ${message}${final ? "" : " (se reintentará)"}`);
      await save({ attempts, error: message.slice(0, 1000), ...(final ? { status: "failed" } : {}) });
    }
  }

  // Cuando todas las redes terminaron: publicado si salió en alguna; si no, vuelve al banco
  const { data: after } = await supabase.from("publications").select("status").eq("video_id", video.id);
  if (!after?.length || after.some((p) => p.status === "pending" || p.status === "processing")) return;
  const ok = after.some((p) => p.status === "published");
  await supabase.from("videos").update(
    ok ? { status: "published", published_at: new Date().toISOString() } : { status: "ready", scheduled_at: null },
  ).eq("id", video.id);
  log(ok ? `"${video.title}" publicado.` : `"${video.title}" no se pudo publicar; vuelve al banco.`);
}

export async function publishDue(log) {
  const { data: videos, error } = await supabase
    .from("videos")
    .select("id, user_id, title, caption, platforms, tiktok_settings, storage_path, scheduled_at")
    .eq("status", "scheduled")
    .eq("edit_status", "edited")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(10);
  if (error) throw new Error(`No se pudo leer el calendario: ${error.message}`);
  for (const video of videos ?? []) {
    await processVideo(video, (msg) => log(`[${video.title}] ${msg}`));
  }
}
