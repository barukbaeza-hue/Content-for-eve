// Decide qué partes del vídeo se conservan a partir de los silencios del audio limpio.

/**
 * Lee la salida de `ffmpeg -af silencedetect` y devuelve los silencios en segundos.
 * @param {string} log
 * @param {number} duration
 * @returns {{ start: number, end: number }[]}
 */
export function parseSilences(log, duration) {
  const silences = [];
  let start = null;
  for (const line of log.split(/\r?\n/)) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (s) start = Math.max(0, Number(s[1]));
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (e && start !== null) {
      silences.push({ start, end: Number(e[1]) });
      start = null;
    }
  }
  // Un silencio que llega hasta el final no trae silence_end
  if (start !== null) silences.push({ start, end: duration });
  return silences;
}

/**
 * Detecta silencios con un umbral que se adapta a cada vídeo: mide el ruido de fondo y el nivel de la voz,
 * y considera silencio lo que queda cerca del ruido durante al menos `minSilence` segundos.
 * @param {Int16Array} samples audio mono
 * @param {number} sampleRate
 * @returns {{ silences: { start: number, end: number }[], noiseDb: number, voiceDb: number, thresholdDb: number }}
 */
export function detectSilences(samples, sampleRate, { frameMs = 20, minSilence = 0.4, position = 0.3 } = {}) {
  const frame = Math.round((sampleRate * frameMs) / 1000);
  const levels = [];
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j++) sum += samples[j] * samples[j];
    const rms = Math.sqrt(sum / frame) / 32768;
    levels.push(20 * Math.log10(Math.max(rms, 1e-6)));
  }
  if (levels.length === 0) return { silences: [], noiseDb: -120, voiceDb: -120, thresholdDb: -120 };

  const sorted = [...levels].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const noiseDb = pct(0.1);
  const voiceDb = pct(0.9);
  // Umbral a un 30 % del camino entre el ruido y la voz (en dB)
  const thresholdDb = noiseDb + (voiceDb - noiseDb) * position;

  // Suaviza con una ventana corta para que una consonante suelta no rompa el silencio
  const quiet = levels.map((_, i) => {
    const window = levels.slice(Math.max(0, i - 2), i + 3);
    return Math.max(...window) < thresholdDb;
  });

  const silences = [];
  const seconds = frameMs / 1000;
  let start = null;
  quiet.forEach((isQuiet, i) => {
    if (isQuiet && start === null) start = i;
    if ((!isQuiet || i === quiet.length - 1) && start !== null) {
      const end = isQuiet ? i + 1 : i;
      if ((end - start) * seconds >= minSilence) silences.push({ start: round(start * seconds), end: round(end * seconds) });
      start = null;
    }
  });
  // Solo hay pausas reales si la voz destaca claramente sobre el ruido
  return { silences: voiceDb - noiseDb < 10 ? [] : silences, noiseDb: round(noiseDb), voiceDb: round(voiceDb), thresholdDb: round(thresholdDb) };
}

/**
 * Corrige los tiempos de Whisper con los silencios reales: Whisper suele alargar la palabra anterior a una pausa
 * o adelantar la siguiente, y eso desfasa los subtítulos. Ninguna palabra puede empezar o acabar dentro de un silencio.
 * @param {{ text: string, start: number, end: number }[]} words
 * @param {{ start: number, end: number }[]} silences
 */
export function alignWords(words, silences) {
  return words.map((word) => {
    let { start, end } = word;
    for (const s of silences) {
      if (start >= s.start && start < s.end) start = s.end; // empieza en un silencio: se retrasa al final de la pausa
      if (end > s.start && end <= s.end) end = s.start; // acaba en un silencio: se adelanta al inicio de la pausa
      if (start < s.start && end > s.end) end = s.start; // una pausa no puede ir dentro de una palabra
    }
    if (end <= start) end = start + Math.min(0.3, word.end - word.start || 0.3);
    return { ...word, start: round(start), end: round(end) };
  });
}

/**
 * Tramos que se conservan: todo menos los silencios, dejando un respiro a cada lado.
 * @param {{ start: number, end: number }[]} silences
 * @param {number} duration
 * @param {{ pad?: number, minKeep?: number }} [options]
 * @returns {{ start: number, end: number }[]}
 */
export function keepSegments(silences, duration, { pad = 0.1, minKeep = 0.25 } = {}) {
  const segments = [];
  let cursor = 0;
  for (const silence of silences) {
    const atStart = silence.start <= 0.05;
    const atEnd = silence.end >= duration - 0.05;
    // Al principio y al final se quita casi todo el silencio; en medio se deja un respiro
    const cutFrom = atStart ? 0 : silence.start + pad;
    const cutTo = atEnd ? duration : Math.max(cutFrom, silence.end - pad);
    if (cutFrom > cursor) segments.push({ start: cursor, end: cutFrom });
    cursor = Math.max(cursor, cutTo);
  }
  if (cursor < duration) segments.push({ start: cursor, end: duration });

  const kept = segments
    .map((s) => ({ start: round(s.start), end: round(s.end) }))
    .filter((s) => s.end - s.start >= minKeep);
  // Si todo era silencio, mejor no tocar el vídeo
  return kept.length ? kept : [{ start: 0, end: round(duration) }];
}

/**
 * Pasa las palabras de la transcripción a los tiempos del vídeo ya cortado (para los subtítulos).
 * Ninguna palabra se pierde: si cae en una parte cortada, se coloca en el tramo conservado más cercano.
 * @param {{ text: string, start: number, end: number }[]} words
 * @param {{ start: number, end: number }[]} segments
 */
export function remapWords(words, segments) {
  if (segments.length === 0) return [];
  // Dónde empieza cada tramo en el vídeo final
  const offsets = [];
  let offset = 0;
  for (const segment of segments) {
    offsets.push(offset);
    offset += segment.end - segment.start;
  }
  const distance = (segment, t) => (t < segment.start ? segment.start - t : t > segment.end ? t - segment.end : 0);

  const result = words.map((word) => {
    const mid = (word.start + word.end) / 2;
    let index = 0;
    segments.forEach((segment, i) => {
      if (distance(segment, mid) < distance(segments[index], mid)) index = i;
    });
    const segment = segments[index];
    const start = Math.min(Math.max(word.start, segment.start), segment.end - 0.05);
    const end = Math.max(Math.min(word.end, segment.end), start + 0.05);
    return {
      text: word.text,
      start: round(offsets[index] + start - segment.start),
      end: round(offsets[index] + end - segment.start),
    };
  });
  // Orden y sin solapes, por si varias palabras se juntaron en el mismo punto
  result.sort((a, b) => a.start - b.start);
  for (let i = 1; i < result.length; i++) {
    if (result[i].start < result[i - 1].start + 0.05) result[i].start = round(result[i - 1].start + 0.05);
    if (result[i].end < result[i].start + 0.05) result[i].end = round(result[i].start + 0.05);
  }
  return result;
}

/**
 * Planos: divide los tramos al final de las frases y alterna encuadre normal y cerrado,
 * para que con una sola cámara parezca que hay dos. Cada corte por silencio también cambia de plano.
 * @param {{ start: number, end: number }[]} segments
 * @param {{ text: string, start: number, end: number }[]} words tiempos del vídeo original
 * @returns {{ start: number, end: number, zoom: number }[]}
 */
export function framingPlan(segments, words, { minShot = 3.5, zoom = 1.12 } = {}) {
  const pieces = [];
  let closeUp = false;
  for (const segment of segments) {
    let start = segment.start;
    // Finales de frase dentro del tramo, con margen para no dejar planos muy cortos
    const sentenceEnds = words
      .filter((w) => /[.!?]$/.test(w.text) && w.end > segment.start && w.end < segment.end - minShot / 2)
      .map((w) => w.end);
    for (const cut of sentenceEnds) {
      if (cut - start < minShot) continue;
      pieces.push({ start, end: round(cut), zoom: closeUp ? zoom : 1 });
      closeUp = !closeUp;
      start = round(cut);
    }
    pieces.push({ start, end: segment.end, zoom: closeUp ? zoom : 1 });
    closeUp = !closeUp;
  }
  return pieces;
}

export function totalDuration(segments) {
  return round(segments.reduce((sum, s) => sum + (s.end - s.start), 0));
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
