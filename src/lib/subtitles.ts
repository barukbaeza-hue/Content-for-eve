// Subtítulos en la web: agrupar palabras en líneas (igual que el worker) y aplicar las correcciones del founder.

export type Word = { text: string; start: number; end: number };
export type Line = { start: number; end: number; text: string };

/** Agrupa las palabras en líneas cortas, como aparecen en el vídeo (mismo criterio que worker/src/subtitles.mjs). */
export function groupWords(words: Word[], { maxWords = 4, maxChars = 24, maxGap = 0.35 } = {}): Word[][] {
  const groups: Word[][] = [];
  let current: Word[] = [];
  for (const word of words) {
    const last = current.at(-1);
    const chars = current.reduce((n, w) => n + w.text.length + 1, 0) + word.text.length;
    const breakHere =
      last && (current.length >= maxWords || chars > maxChars || word.start - last.end > maxGap || /[.,;:!?]$/.test(last.text));
    if (breakHere) {
      groups.push(current);
      current = [];
    }
    current.push(word);
  }
  if (current.length) groups.push(current);
  return groups;
}

export function toLines(words: Word[]): Line[] {
  return groupWords(words).map((g) => ({ start: g[0].start, end: g.at(-1)!.end, text: g.map((w) => w.text).join(" ") }));
}

/** Clave de comparación: sin mayúsculas, tildes ni puntuación (igual que worker/src/dictionary.mjs). */
export function normalizeWord(word: string) {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

/**
 * Aplica el texto corregido de cada línea a sus palabras.
 * Si el número de palabras no cambia, cada palabra conserva su tiempo; si cambia, se reparten en el tramo de la línea.
 * Devuelve las palabras nuevas y las correcciones de una palabra por otra, para el diccionario de la marca.
 */
export function applyLineEdits(words: Word[], edits: string[]) {
  const groups = groupWords(words);
  const corrections: Record<string, string> = {};
  const result: Word[] = [];
  groups.forEach((group, i) => {
    const text = edits[i]?.trim();
    const next = text ? text.split(/\s+/) : [];
    if (!text || next.join(" ") === group.map((w) => w.text).join(" ")) {
      result.push(...group);
      return;
    }
    if (next.length === group.length) {
      group.forEach((w, j) => {
        const from = normalizeWord(w.text);
        const to = next[j].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
        if (from && to && from !== normalizeWord(to)) corrections[from] = to;
        result.push({ ...w, text: next[j] });
      });
      return;
    }
    const start = group[0].start;
    const span = Math.max(0.1, group.at(-1)!.end - start);
    next.forEach((t, j) =>
      result.push({
        text: t,
        start: Math.round((start + (span * j) / next.length) * 1000) / 1000,
        end: Math.round((start + (span * (j + 1)) / next.length) * 1000) / 1000,
      }),
    );
  });
  return { words: result, corrections };
}
