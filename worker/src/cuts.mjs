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
 * Tramos que se conservan: todo menos los silencios, dejando un respiro a cada lado.
 * @param {{ start: number, end: number }[]} silences
 * @param {number} duration
 * @param {{ pad?: number, minKeep?: number }} [options]
 * @returns {{ start: number, end: number }[]}
 */
export function keepSegments(silences, duration, { pad = 0.15, minKeep = 0.25 } = {}) {
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
 * @param {{ text: string, start: number, end: number }[]} words
 * @param {{ start: number, end: number }[]} segments
 */
export function remapWords(words, segments) {
  const result = [];
  let offset = 0;
  for (const segment of segments) {
    for (const word of words) {
      const mid = (word.start + word.end) / 2;
      if (mid < segment.start || mid >= segment.end) continue;
      result.push({
        text: word.text,
        start: round(offset + Math.max(0, word.start - segment.start)),
        end: round(offset + Math.min(segment.end, word.end) - segment.start),
      });
    }
    offset += segment.end - segment.start;
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
