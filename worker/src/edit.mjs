// Edición de un vídeo: limpia el audio, transcribe, quita silencios, pone subtítulos y monta el vídeo final.
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ROOT, config } from "./config.mjs";
import { alignWords, detectSilences, framingPlan, keepSegments, remapWords, snapToOnsets, totalDuration } from "./cuts.mjs";
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
    const rawWords = await transcribe(audio.file, dir, duration, log);

    log("Buscando silencios…");
    const pcm = path.join(dir, "voz16k.raw");
    await run(tools.ffmpeg, ["-y", "-hide_banner", "-i", audio.file, "-ac", "1", "-ar", "16000", "-f", "s16le", pcm]);
    const buffer = await readFile(pcm);
    const detection = detectSilences(new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length >> 1), 16000);
    const segments = keepSegments(detection.silences, duration);
    // Tiempos de cada palabra corregidos con los silencios reales, para que los subtítulos vayan a tiempo
    // y con el inicio de cada palabra ajustado a cuando empieza a sonar
    const words = snapToOnsets(alignWords(rawWords, detection.silences), detection);
    log(`  ${detection.silences.length} pausas (ruido ${detection.noiseDb} dB, voz ${detection.voiceDb} dB)`);
    const editedWords = remapWords(words, segments);
    // Por defecto solo subtítulos. Título y zoom alterno solo si se piden (prompt o estilo de su marca).
    const extras = video.card?.estilo ?? {};
    const pieces = extras.zoom_alterno ? framingPlan(segments, words) : segments.map((s) => ({ ...s, zoom: 1 }));
    const title = extras.titulo ?? null;

    log(`Montando el vídeo (${segments.length} tramos, ${pieces.length} planos, ${editedWords.length} palabras de subtítulos)…`);
    const output = path.join(dir, "editado.mp4");
    await render({ raw, audio: audio.file, pieces, words: editedWords, title, width, height, output, dir });

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
            pausas: detection.silences.length,
            planos: pieces.length,
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

// Whisper con el tiempo de cada palabra. Primero con DTW (alinea cada palabra con el audio, mucho más preciso);
// si esta versión de whisper.cpp no lo admite, con el método simple de una palabra por segmento.
async function transcribe(audioFile, dir, duration, log) {
  const audio = path.join(dir, "voz16k.wav");
  await run(tools.ffmpeg, ["-y", "-hide_banner", "-i", audioFile, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audio]);
  const common = ["-m", config.whisperModel, "-f", audio, "-l", config.language, "-t", String(config.threads), "-np"];
  const clamp = (words) =>
    words
      .filter((w) => w.start < duration)
      .map((w) => ({ ...w, end: Math.min(w.end, duration) }));

  const base = path.join(dir, "transcripcion");
  // DTW necesita la atención normal: -nfa la activa en las versiones nuevas; las antiguas no conocen la opción
  for (const extra of [["--dtw", "small", "-nfa"], ["--dtw", "small"]]) {
    try {
      await run(tools.whisper, [...common, ...extra, "-ojf", "-of", base]);
      const words = wordsFromTokens(JSON.parse(await readFile(`${base}.json`, "utf8")));
      if (words.length) {
        log("  Tiempos de palabra: DTW");
        return clamp(words);
      }
    } catch {
      // se prueba la siguiente opción
    }
  }

  log("  Tiempos de palabra: método simple (DTW no disponible)");
  await run(tools.whisper, [...common, "-ml", "1", "-sow", "-oj", "-of", base]);
  const json = JSON.parse(await readFile(`${base}.json`, "utf8"));
  return clamp(
    (json.transcription ?? [])
      .map((s) => ({ text: String(s.text).trim(), start: s.offsets.from / 1000, end: s.offsets.to / 1000 }))
      .filter((w) => w.text && !/^\[.*\]$/.test(w.text)),
  );
}

/**
 * Convierte los tokens de whisper.cpp (salida -ojf con DTW) en palabras con su tiempo.
 * Un token que empieza por espacio abre palabra nueva. t_dtw va en centésimas de segundo.
 * Devuelve [] si faltan tiempos DTW, para usar el método simple.
 */
export function wordsFromTokens(json) {
  const words = [];
  for (const segment of json.transcription ?? []) {
    const segmentEnd = (segment.offsets?.to ?? 0) / 1000;
    const pieces = [];
    for (const token of segment.tokens ?? []) {
      const text = String(token.text ?? "");
      if (!text.trim() || /^\[_|^<\|/.test(text.trim())) continue;
      if (typeof token.t_dtw !== "number" || token.t_dtw < 0) return [];
      const time = token.t_dtw / 100;
      if (text.startsWith(" ") || pieces.length === 0) pieces.push({ text: text.trim(), start: time });
      else pieces.at(-1).text += text;
    }
    pieces.forEach((piece, i) => {
      const next = pieces[i + 1]?.start ?? segmentEnd;
      // Una palabra no dura más de ~1 s aunque detrás venga una pausa
      words.push({ text: piece.text, start: piece.start, end: Math.max(piece.start + 0.05, Math.min(next, piece.start + 1)) });
    });
  }
  return words.filter((w) => w.text && !/^\[.*\]$/.test(w.text));
}

// Corta los planos (con zoom alterno), quema los subtítulos y deja el formato de Reels (H.264, AAC estéreo 48 kHz).
async function render({ raw, audio, pieces, words, title, width, height, output, dir }) {
  const outWidth = Math.min(1080, width) - (Math.min(1080, width) % 2);
  const outHeight = Math.round((height * outWidth) / width / 2) * 2;
  await writeFile(path.join(dir, "subtitulos.ass"), buildAss(words, { width: outWidth, height: outHeight }, { title }));
  // Tipografías de los subtítulos (Geist), junto al archivo para que la ruta sea simple en Windows
  await cp(path.join(ROOT, "fonts"), path.join(dir, "fonts"), { recursive: true });

  const graph = buildGraph(pieces, outWidth, outHeight);

  // Con muchos tramos el filtro no cabe en la línea de comandos de Windows: va en un archivo.
  // ffmpeg corre dentro de la carpeta temporal para que la ruta de los subtítulos sea simple.
  await writeFile(path.join(dir, "filtro.txt"), graph);
  await run(
    tools.ffmpeg,
    [
      // Decodificación por hardware si el equipo la tiene (acelera mucho los originales HEVC del iPhone)
      "-y", "-hide_banner", "-hwaccel", "auto", "-i", raw, "-i", audio,
      "-/filter_complex", "filtro.txt",
      "-map", "[vo]", "-map", "[ao]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
      "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
      output,
    ],
    { cwd: dir },
  );
}

/** Grafo de filtros de ffmpeg: planos con zoom alterno, subtítulos y audio en formato de Reels. */
export function buildGraph(pieces, outWidth, outHeight) {
  const parts = pieces.map((p, i) => {
    // Plano cerrado: recorta el centro (algo por encima, donde está la cara) y lo vuelve a escalar
    const zoom = p.zoom > 1 ? `crop=iw/${p.zoom}:ih/${p.zoom}:(iw-iw/${p.zoom})/2:(ih-ih/${p.zoom})*0.35,` : "";
    return (
      `[0:v]trim=start=${p.start}:end=${p.end},setpts=PTS-STARTPTS,${zoom}scale=${outWidth}:${outHeight},setsar=1[v${i}];` +
      `[1:a]atrim=start=${p.start}:end=${p.end},asetpts=PTS-STARTPTS[a${i}];`
    );
  });
  const inputs = pieces.map((_, i) => `[v${i}][a${i}]`).join("");
  return (
    parts.join("") +
    `${inputs}concat=n=${pieces.length}:v=1:a=1[vc][ac];` +
    `[vc]fps=30,subtitles=subtitulos.ass:fontsdir=fonts,format=yuv420p[vo];` +
    `[ac]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo[ao]`
  );
}

function safeName(title) {
  return String(title || "video").normalize("NFD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
}

function round(n) {
  return Math.round(n * 100) / 100;
}
