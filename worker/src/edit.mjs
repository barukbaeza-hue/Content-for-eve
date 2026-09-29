// Edición de un vídeo: limpia el audio, transcribe, quita silencios y monta el vídeo final.
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ROOT, config } from "./config.mjs";
import { keepSegments, parseSilences, remapWords, totalDuration } from "./cuts.mjs";
import { download, remove, supabase, upload } from "./storage.mjs";
import { run, tools } from "./tools.mjs";

/** @param {Record<string, any>} video fila de public.videos */
export async function editVideo(video, log = console.log) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mova-"));
  try {
    const raw = path.join(dir, `original${path.extname(video.raw_path) || ".mp4"}`);
    log("Descargando el original…");
    await download(video.raw_path, raw);
    const duration = await probeDuration(raw);

    log("Limpiando el audio con DeepFilterNet…");
    const clean = await cleanAudio(raw, dir);

    log("Transcribiendo con Whisper…");
    const words = await transcribe(clean, dir);

    log("Buscando silencios…");
    const { stderr } = await run(tools.ffmpeg, [
      "-hide_banner", "-i", clean, "-af", "silencedetect=noise=-38dB:d=0.45", "-f", "null", "-",
    ]);
    const segments = keepSegments(parseSilences(stderr, duration), duration);

    log(`Montando el vídeo (${segments.length} tramos)…`);
    const output = path.join(dir, "editado.mp4");
    await render(raw, clean, segments, output, dir);

    const key = `videos/${video.user_id}/${video.id}/editado.mp4`;
    log("Subiendo el vídeo editado…");
    await upload(output, key);

    if (config.keepLocalCopy) {
      const folder = path.join(ROOT, "salida");
      await mkdir(folder, { recursive: true });
      await copyFile(output, path.join(folder, `${safeName(video.title)}-${video.id.slice(0, 8)}.mp4`));
    }

    const editedDuration = totalDuration(segments);
    const text = words.map((w) => w.text).join(" ").replace(/\s+([.,;:!?])/g, "$1");
    const { error } = await supabase
      .from("videos")
      .update({
        storage_path: key,
        status: "ready",
        edit_status: "edited",
        edit_error: null,
        edited_at: new Date().toISOString(),
        duration_seconds: editedDuration,
        transcript: { language: config.language, words, segments, edited_words: remapWords(words, segments) },
        card: {
          ...video.card,
          dice: { transcripcion: text },
          edicion: {
            duracion_original: round(duration),
            duracion_final: editedDuration,
            tramos: segments.length,
            indicaciones: video.edit_instructions ?? null,
          },
        },
      })
      .eq("id", video.id);
    if (error) throw new Error(`No se pudo guardar el resultado: ${error.message}`);

    // El original ya no hace falta
    await remove(video.raw_path).catch((e) => log(`Aviso: no se pudo borrar el original (${e.message})`));
    log(`Listo: ${round(duration)}s → ${editedDuration}s`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function probeDuration(file) {
  const { stdout } = await run(tools.ffprobe, [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file,
  ]);
  const duration = Number(stdout.trim());
  if (!duration) throw new Error("No se pudo leer la duración del vídeo");
  return duration;
}

// DeepFilterNet trabaja a 48 kHz; --compensate-delay mantiene el audio sincronizado con la imagen.
async function cleanAudio(raw, dir) {
  const input = path.join(dir, "voz.wav");
  await run(tools.ffmpeg, ["-y", "-hide_banner", "-i", raw, "-vn", "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", input]);
  const outDir = path.join(dir, "limpio");
  await mkdir(outDir, { recursive: true });
  await run(tools.deepFilter, ["--compensate-delay", "-o", outDir, input]);
  return path.join(outDir, "voz.wav");
}

// Whisper con una palabra por segmento para tener el tiempo de cada palabra.
async function transcribe(clean, dir) {
  const audio = path.join(dir, "voz16k.wav");
  await run(tools.ffmpeg, ["-y", "-hide_banner", "-i", clean, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audio]);
  const base = path.join(dir, "transcripcion");
  await run(tools.whisper, [
    "-m", config.whisperModel, "-f", audio, "-l", config.language,
    "-t", String(config.threads), "-ml", "1", "-sow", "-oj", "-of", base, "-np",
  ]);
  const json = JSON.parse(await readFile(`${base}.json`, "utf8"));
  return (json.transcription ?? [])
    .map((s) => ({ text: String(s.text).trim(), start: s.offsets.from / 1000, end: s.offsets.to / 1000 }))
    .filter((w) => w.text && !/^\[.*\]$/.test(w.text));
}

// Corta los tramos con ffmpeg, usa el audio limpio, nivela el volumen y deja el formato de Reels.
async function render(raw, clean, segments, output, dir) {
  const parts = segments.map(
    (s, i) =>
      `[0:v]trim=start=${s.start}:end=${s.end},setpts=PTS-STARTPTS[v${i}];` +
      `[1:a]atrim=start=${s.start}:end=${s.end},asetpts=PTS-STARTPTS[a${i}];`,
  );
  const inputs = segments.map((_, i) => `[v${i}][a${i}]`).join("");
  const graph =
    parts.join("") +
    `${inputs}concat=n=${segments.length}:v=1:a=1[vc][ac];` +
    `[vc]scale='min(1080,iw)':-2,fps=30,format=yuv420p[vo];` +
    `[ac]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo[ao]`;

  // Con muchos tramos el filtro no cabe en la línea de comandos de Windows: va en un archivo
  const script = path.join(dir, "filtro.txt");
  await writeFile(script, graph);
  await run(tools.ffmpeg, [
    "-y", "-hide_banner", "-i", raw, "-i", clean,
    "-/filter_complex", script,
    "-map", "[vo]", "-map", "[ao]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
    output,
  ]);
}

function safeName(title) {
  return String(title || "video").normalize("NFD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
}

function round(n) {
  return Math.round(n * 100) / 100;
}
