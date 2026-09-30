// Edición de un vídeo: limpia el audio, transcribe, quita silencios, pone subtítulos y monta el vídeo final.
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ROOT, config } from "./config.mjs";
import { alignWords, detectSilences, framingPlan, keepSegments, remapWords, snapToOnsets, totalDuration } from "./cuts.mjs";
import { download, remove, supabase, upload } from "./storage.mjs";
import { applyCorrections, whisperPrompt } from "./dictionary.mjs";
import { buildAss } from "./subtitles.mjs";
import { run, tools } from "./tools.mjs";

// Volumen objetivo de Instagram y TikTok
const TARGET_LUFS = -14;

/** @param {Record<string, any>} video fila de public.videos */
export async function editVideo(video, log = console.log) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mova-"));
  try {
    const raw = path.join(dir, `original${path.extname(video.raw_path) || ".mp4"}`);
    // Tiempo de cada paso, para saber qué pesa
    let mark = Date.now();
    const step = (label) => {
      log(`  ${label}: ${((Date.now() - mark) / 1000).toFixed(1)} s`);
      mark = Date.now();
    };

    // Diccionario de la marca: palabras propias (pista para Whisper) y correcciones anteriores
    const { data: brand } = await supabase
      .from("brand_profiles")
      .select("vocabulary, corrections")
      .eq("user_id", video.user_id)
      .maybeSingle();

    log("Descargando el original…");
    await download(video.raw_path, raw);
    const { duration, width, height } = await probe(raw);
    step("descarga");

    // Whisper transcribe con el audio original mientras DeepFilterNet limpia la voz: van a la vez
    log("Limpiando el audio (DeepFilterNet) y transcribiendo (Whisper) a la vez…");
    const voice = path.join(dir, "voz.wav");
    await run(tools.ffmpeg, ["-y", "-hide_banner", "-i", raw, "-vn", "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", voice]);
    const t0 = Date.now();
    const took = (label) => (r) => (log(`  ${label}: ${((Date.now() - t0) / 1000).toFixed(1)} s`), r);
    const [audio, rawWords] = await Promise.all([
      prepareAudio(voice, dir, log).then(took("audio limpio")),
      transcribe(voice, dir, duration, log, whisperPrompt(brand?.vocabulary)).then(took("transcripción")),
    ]);
    mark = Date.now();

    log("Buscando silencios…");
    const pcm = path.join(dir, "voz16k.raw");
    await run(tools.ffmpeg, ["-y", "-hide_banner", "-i", audio.file, "-ac", "1", "-ar", "16000", "-f", "s16le", pcm]);
    const buffer = await readFile(pcm);
    const detection = detectSilences(new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length >> 1), 16000);
    const segments = keepSegments(detection.silences, duration);
    // Tiempos de cada palabra corregidos con los silencios reales, para que los subtítulos vayan a tiempo
    // y con el inicio de cada palabra ajustado a cuando empieza a sonar
    const words = applyCorrections(snapToOnsets(alignWords(rawWords, detection.silences), detection), brand?.corrections);
    log(`  ${detection.silences.length} pausas (ruido ${detection.noiseDb} dB, voz ${detection.voiceDb} dB)`);
    step("silencios");
    const editedWords = remapWords(words, segments);
    // Por defecto solo subtítulos. Título y zoom alterno solo si se piden (prompt o estilo de su marca).
    const extras = video.card?.estilo ?? {};
    const pieces = extras.zoom_alterno ? framingPlan(segments, words) : segments.map((s) => ({ ...s, zoom: 1 }));
    const title = extras.titulo ?? null;

    log(`Montando el vídeo (${segments.length} tramos, ${pieces.length} planos, ${editedWords.length} palabras de subtítulos)…`);
    const output = path.join(dir, "editado.mp4");
    // Copia sin subtítulos en la misma pasada: permite corregirlos luego sin reeditar todo el vídeo
    const clean = path.join(dir, "limpio.mp4");
    await render({ raw, audio: audio.file, pieces, words: editedWords, title, width, height, output, clean, dir });
    step("montaje");

    const key = `videos/${video.user_id}/${video.id}/editado.mp4`;
    const cleanKey = `videos/${video.user_id}/${video.id}/sin-subtitulos.mp4`;
    log("Subiendo el vídeo editado…");
    await Promise.all([upload(output, key), upload(clean, cleanKey)]);
    step("subida");

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
        clean_path: cleanKey,
        status: "ready",
        edit_status: "edited",
        edit_job: "completa",
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
async function prepareAudio(original, dir, log) {

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

/** Variante de DTW que funciona en este equipo (undefined: aún no se sabe; null: ninguna). */
let dtwOption;

// Whisper con el tiempo de cada palabra. Primero con DTW (alinea cada palabra con el audio, mucho más preciso);
// si esta versión de whisper.cpp no lo admite, con el método simple de una palabra por segmento.
async function transcribe(audioFile, dir, duration, log, prompt) {
  const audio = path.join(dir, "voz16k.wav");
  await run(tools.ffmpeg, ["-y", "-hide_banner", "-i", audioFile, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audio]);
  // Greedy (-bs 1 -bo 1): una sola pasada por palabra, 2-3 veces más rápido que buscar 5 alternativas
  const common = ["-m", config.whisperModel, "-f", audio, "-l", config.language, "-t", String(config.threads), "-np", "-bs", "1", "-bo", "1"];
  // Palabras de la marca como pista, para que Whisper las escriba bien (por ejemplo "Mova" y no "Moba")
  if (prompt) common.push("--prompt", prompt);
  const clamp = (words) =>
    words
      .filter((w) => w.start < duration)
      .map((w) => ({ ...w, end: Math.min(w.end, duration) }));

  const base = path.join(dir, "transcripcion");
  // DTW necesita la atención normal: -nfa la activa en las versiones nuevas; las antiguas no conocen la opción
  // Se recuerda qué variante funciona en este equipo para no transcribir dos veces
  const options = dtwOption === undefined ? [["--dtw", "small", "-nfa"], ["--dtw", "small"]] : dtwOption ? [dtwOption] : [];
  for (const extra of options) {
    try {
      await run(tools.whisper, [...common, ...extra, "-ojf", "-of", base]);
      const words = wordsFromTokens(JSON.parse(await readFile(`${base}.json`, "utf8")));
      if (words.length) {
        dtwOption = extra;
        log("  Tiempos de palabra: DTW");
        return clamp(words);
      }
    } catch {
      // se prueba la siguiente opción
    }
  }
  dtwOption = null;

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

/** Subtítulos (.ass) y tipografías (Geist) en la carpeta temporal, para que la ruta sea simple en Windows. */
async function prepareSubtitles(words, title, width, height, dir) {
  await writeFile(path.join(dir, "subtitulos.ass"), buildAss(words, { width, height }, { title }));
  await cp(path.join(ROOT, "fonts"), path.join(dir, "fonts"), { recursive: true });
}

const H264 = ["-c:v", "libx264", "-preset", "veryfast"];
const AAC = ["-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart"];

// Corta los planos (con zoom alterno si se pidió), quema los subtítulos y deja el formato de Reels
// (H.264, AAC estéreo 48 kHz). En la misma pasada sale la copia sin subtítulos.
async function render({ raw, audio, pieces, words, title, width, height, output, clean, dir }) {
  const outWidth = Math.min(1080, width) - (Math.min(1080, width) % 2);
  const outHeight = Math.round((height * outWidth) / width / 2) * 2;
  await prepareSubtitles(words, title, outWidth, outHeight, dir);

  // Con muchos tramos el filtro no cabe en la línea de comandos de Windows: va en un archivo.
  // ffmpeg corre dentro de la carpeta temporal para que la ruta de los subtítulos sea simple.
  await writeFile(path.join(dir, "filtro.txt"), buildGraph(pieces, outWidth, outHeight));
  await run(
    tools.ffmpeg,
    [
      // Decodificación por hardware si el equipo la tiene (acelera los originales HEVC del iPhone)
      "-y", "-hide_banner", "-hwaccel", "auto", "-i", raw, "-i", audio,
      "-/filter_complex", "filtro.txt",
      "-map", "[vo]", "-map", "[ao]", ...H264, "-crf", "21", ...AAC, output,
      "-map", "[vc2]", "-map", "[ac2]", ...H264, "-crf", "20", ...AAC, clean,
    ],
    { cwd: dir },
  );
}

/** Grafo de filtros de ffmpeg: planos con zoom alterno, subtítulos, copia sin subtítulos y audio de Reels. */
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
    `[vc]fps=30,format=yuv420p,split=2[vs][vc2];` +
    `[vs]subtitles=subtitulos.ass:fontsdir=fonts,format=yuv420p[vo];` +
    `[ac]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[ao][ac2]`
  );
}

/**
 * Solo vuelve a poner los subtítulos (tras corregirlos en Mova) sobre la copia sin subtítulos.
 * Tarda poco: no hay que limpiar audio, transcribir ni cortar otra vez.
 * @param {Record<string, any>} video fila de public.videos
 */
export async function resubtitleVideo(video, log = console.log) {
  if (!video.clean_path) {
    throw new Error("Este vídeo se editó antes de poder corregir subtítulos. Súbelo de nuevo para corregirlos.");
  }
  const dir = await mkdtemp(path.join(os.tmpdir(), "mova-"));
  try {
    const input = path.join(dir, "limpio.mp4");
    log("Descargando la copia sin subtítulos…");
    await download(video.clean_path, input);
    const { stdout } = await run(tools.ffprobe, [
      "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", input,
    ]);
    const [width, height] = stdout.trim().split(",").map(Number);
    const words = video.transcript?.edited_words ?? [];
    await prepareSubtitles(words, video.card?.estilo?.titulo ?? null, width, height, dir);

    log(`Poniendo los subtítulos corregidos (${words.length} palabras)…`);
    const output = path.join(dir, "editado.mp4");
    await run(
      tools.ffmpeg,
      [
        "-y", "-hide_banner", "-i", input,
        "-vf", "subtitles=subtitulos.ass:fontsdir=fonts,format=yuv420p",
        ...H264, "-crf", "21", "-c:a", "copy", "-movflags", "+faststart", output,
      ],
      { cwd: dir },
    );

    log("Subiendo el vídeo…");
    await upload(output, video.storage_path);
    if (config.keepLocalCopy) {
      const folder = path.join(ROOT, "salida");
      await mkdir(folder, { recursive: true });
      await copyFile(output, path.join(folder, `${safeName(video.title)}-${video.id.slice(0, 8)}.mp4`));
    }
    const { error } = await supabase
      .from("videos")
      .update({ edit_status: "edited", edit_job: "completa", edit_error: null, edited_at: new Date().toISOString() })
      .eq("id", video.id);
    if (error) throw new Error(`No se pudo guardar el resultado: ${error.message}`);
    log("Listo: subtítulos actualizados");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function safeName(title) {
  return String(title || "video").normalize("NFD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
}

function round(n) {
  return Math.round(n * 100) / 100;
}
