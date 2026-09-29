// Edición de un vídeo: limpia el audio, transcribe, quita silencios, pone subtítulos y monta el vídeo final.
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ROOT, config } from "./config.mjs";
import { keepSegments, parseSilences, remapWords, totalDuration } from "./cuts.mjs";
import { download, remove, supabase, upload } from "./storage.mjs";
import { buildAss } from "./subtitles.mjs";
import { run, tools } from "./tools.mjs";

// Volumen objetivo de Instagram y TikTok
const TARGET_LUFS = -14;

/** @param {Record<string, any>} video fila de public.videos */
export async function editVideo(video, log = console.log) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mova-"));
  try {
    const raw = path.join(dir, `original${path.extname(video.raw_path) || ".mp4"}`);
    log("Descargando el original…");
    await download(video.raw_path, raw);
    const { duration, width, height } = await probe(raw);

    log("Limpiando el audio con DeepFilterNet…");
    const audio = await prepareAudio(raw, dir, log);

    log("Transcribiendo con Whisper…");
    const words = await transcribe(audio.file, dir);

    log("Buscando silencios…");
    const { stderr } = await run(tools.ffmpeg, [
      "-hide_banner", "-i", audio.file, "-af", "silencedetect=noise=-40dB:d=0.45", "-f", "null", "-",
    ]);
    const segments = keepSegments(parseSilences(stderr, duration), duration);
    const editedWords = remapWords(words, segments);

    log(`Montando el vídeo (${segments.length} tramos, ${editedWords.length} palabras de subtítulos)…`);
    const output = path.join(dir, "editado.mp4");
    await render({ raw, audio: audio.file, segments, words: editedWords, width, height, output, dir });

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
        transcript: { language: config.language, words, segments, edited_words: editedWords },
        card: {
          ...video.card,
          dice: { transcripcion: text },
          edicion: {
            duracion_original: round(duration),
            duracion_final: editedDuration,
            tramos: segments.length,
            subtitulos: true,
            audio: audio.info,
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

// Duración y tamaño tal como se ve el vídeo (los móviles graban girado y guardan la rotación aparte).
async function probe(file) {
  const { stdout } = await run(tools.ffprobe, [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "format=duration:stream=width,height:stream_side_data=rotation:stream_tags=rotate",
    "-of", "json", file,
  ]);
  const info = JSON.parse(stdout);
  const duration = Number(info.format?.duration);
  const stream = info.streams?.[0] ?? {};
  if (!duration || !stream.width) throw new Error("No se pudo leer el vídeo");
  const rotation = Number(stream.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? stream.tags?.rotate ?? 0);
  const rotated = Math.abs(rotation) % 180 === 90;
  return { duration, width: rotated ? stream.height : stream.width, height: rotated ? stream.width : stream.height };
}

// Volumen integrado (LUFS) de un archivo de audio.
async function loudness(file) {
  const { stderr } = await run(tools.ffmpeg, ["-hide_banner", "-i", file, "-af", "loudnorm=print_format=json", "-f", "null", "-"]);
  const json = stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1);
  const value = Number(JSON.parse(json).input_i);
  return Number.isFinite(value) ? value : -99;
}

/**
 * Limpia la voz con DeepFilterNet y la deja al volumen de Reels.
 * Si la limpieza se come la voz (pasa con audios muy comprimidos), usa el original con un filtro suave.
 */
async function prepareAudio(raw, dir, log) {
  const original = path.join(dir, "voz.wav");
  await run(tools.ffmpeg, ["-y", "-hide_banner", "-i", raw, "-vn", "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", original]);

  const outDir = path.join(dir, "limpio");
  await mkdir(outDir, { recursive: true });
  // Limitar la atenuación evita que DeepFilterNet borre parte de la voz; --compensate-delay mantiene la sincronía
  await run(tools.deepFilter, ["--compensate-delay", "--atten-lim", "24", "-o", outDir, original]).catch(() =>
    run(tools.deepFilter, ["--compensate-delay", "-o", outDir, original]),
  );
  const cleaned = path.join(outDir, "voz.wav");

  const originalLufs = await loudness(original);
  const cleanedLufs = await loudness(cleaned);
  let source = cleaned;
  let method = "deepfilternet";
  if (cleanedLufs < originalLufs - 8) {
    log(`  La limpieza bajó demasiado la voz (${originalLufs} → ${cleanedLufs} LUFS): uso el audio original con filtro suave`);
    source = path.join(dir, "voz-suave.wav");
    await run(tools.ffmpeg, ["-y", "-hide_banner", "-i", original, "-af", "highpass=f=80,afftdn=nf=-25", source]);
    method = "ffmpeg";
  }

  const sourceLufs = method === "ffmpeg" ? await loudness(source) : cleanedLufs;
  const gain = round(Math.min(35, Math.max(-12, TARGET_LUFS - sourceLufs)));
  const file = path.join(dir, "voz-final.wav");
  // Ganancia fija hasta -14 LUFS y un limitador para que los picos no saturen
  await run(tools.ffmpeg, [
    "-y", "-hide_banner", "-i", source, "-af", `volume=${gain}dB,alimiter=limit=0.84:level=0`,
    "-ar", "48000", "-c:a", "pcm_s16le", file,
  ]);
  log(`  Volumen: original ${originalLufs} LUFS, limpio ${cleanedLufs} LUFS, ganancia ${gain > 0 ? "+" : ""}${gain} dB`);
  return { file, info: { metodo: method, lufs_original: originalLufs, lufs_limpio: cleanedLufs, ganancia_db: gain } };
}

// Whisper con una palabra por segmento para tener el tiempo de cada palabra.
async function transcribe(audioFile, dir) {
  const audio = path.join(dir, "voz16k.wav");
  await run(tools.ffmpeg, ["-y", "-hide_banner", "-i", audioFile, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audio]);
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

// Corta los tramos, quema los subtítulos y deja el formato de Reels (H.264, AAC estéreo 48 kHz).
async function render({ raw, audio, segments, words, width, height, output, dir }) {
  const outWidth = Math.min(1080, width) - (Math.min(1080, width) % 2);
  const outHeight = Math.round((height * outWidth) / width / 2) * 2;
  await writeFile(path.join(dir, "subtitulos.ass"), buildAss(words, { width: outWidth, height: outHeight }));
  // Tipografías de los subtítulos (Geist), junto al archivo para que la ruta sea simple en Windows
  await cp(path.join(ROOT, "fonts"), path.join(dir, "fonts"), { recursive: true });

  const parts = segments.map(
    (s, i) =>
      `[0:v]trim=start=${s.start}:end=${s.end},setpts=PTS-STARTPTS[v${i}];` +
      `[1:a]atrim=start=${s.start}:end=${s.end},asetpts=PTS-STARTPTS[a${i}];`,
  );
  const inputs = segments.map((_, i) => `[v${i}][a${i}]`).join("");
  const graph =
    parts.join("") +
    `${inputs}concat=n=${segments.length}:v=1:a=1[vc][ac];` +
    `[vc]scale=${outWidth}:${outHeight},setsar=1,fps=30,subtitles=subtitulos.ass:fontsdir=fonts,format=yuv420p[vo];` +
    `[ac]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo[ao]`;

  // Con muchos tramos el filtro no cabe en la línea de comandos de Windows: va en un archivo.
  // ffmpeg corre dentro de la carpeta temporal para que la ruta de los subtítulos sea simple.
  await writeFile(path.join(dir, "filtro.txt"), graph);
  await run(
    tools.ffmpeg,
    [
      "-y", "-hide_banner", "-i", raw, "-i", audio,
      "-/filter_complex", "filtro.txt",
      "-map", "[vo]", "-map", "[ao]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
      "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
      output,
    ],
    { cwd: dir },
  );
}

function safeName(title) {
  return String(title || "video").normalize("NFD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
}

function round(n) {
  return Math.round(n * 100) / 100;
}
