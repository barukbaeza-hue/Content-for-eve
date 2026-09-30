// Diccionario de la marca: correcciones que el founder hizo en sus subtítulos y que se aplican solas
// en los vídeos siguientes (por ejemplo, "MOBA" → "Mova").

/** Clave de comparación: sin mayúsculas, tildes ni puntuación. */
export function normalize(word) {
  return String(word)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

/**
 * Aplica las correcciones a las palabras de la transcripción, conservando la puntuación de alrededor.
 * @param {{ text: string, start: number, end: number }[]} words
 * @param {Record<string, string>} corrections clave normalizada → palabra correcta
 */
export function applyCorrections(words, corrections) {
  const table = new Map(Object.entries(corrections ?? {}).map(([from, to]) => [normalize(from), to]));
  if (table.size === 0) return words;
  return words.map((word) => {
    const fix = table.get(normalize(word.text));
    if (!fix) return word;
    // Mantiene signos como "¿", "," o "." que iban pegados a la palabra
    const [, before, , after] = word.text.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u) ?? [];
    return { ...word, text: `${before ?? ""}${fix}${after ?? ""}` };
  });
}

/** Pista para Whisper con las palabras propias de la marca, para que las escriba bien desde el principio. */
export function whisperPrompt(vocabulary) {
  const words = [...new Set((vocabulary ?? []).map((w) => String(w).trim()).filter(Boolean))].slice(0, 40);
  return words.length ? words.join(", ") : null;
}
