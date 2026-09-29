// Subtítulos estilo Reels en formato ASS: 2-3 palabras a la vez y la palabra que se dice resaltada.

const HIGHLIGHT = "&H0000D7FF&"; // amarillo (ASS usa azul-verde-rojo)

/**
 * Agrupa las palabras en frases cortas: se corta por longitud, por puntuación o por una pausa.
 * @param {{ text: string, start: number, end: number }[]} words
 */
export function groupWords(words, { maxWords = 3, maxChars = 18, maxGap = 0.35 } = {}) {
  const groups = [];
  let current = [];
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

/**
 * Genera el archivo .ass para quemar los subtítulos con ffmpeg.
 * @param {{ text: string, start: number, end: number }[]} words tiempos del vídeo ya cortado
 * @param {{ width: number, height: number }} size tamaño del vídeo final
 */
export function buildAss(words, { width, height }) {
  const fontSize = Math.round(height * 0.056);
  const outline = Math.max(3, Math.round(fontSize * 0.09));
  const marginV = Math.round(height * 0.26);
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "ScaledBorderAndShadow: yes",
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,Arial,${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,${outline},${Math.round(outline / 2)},2,60,60,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events = [];
  const groups = groupWords(words);
  groups.forEach((group, g) => {
    const next = groups[g + 1];
    // La frase se queda en pantalla hasta la siguiente si la pausa es corta
    const groupEnd = next && next[0].start - group.at(-1).end < 0.5 ? next[0].start : group.at(-1).end + 0.2;
    group.forEach((word, i) => {
      const start = word.start;
      const end = i < group.length - 1 ? group[i + 1].start : groupEnd;
      if (end <= start) return;
      const text = group
        .map((w, j) => (j === i ? `{\\c${HIGHLIGHT}}${escape(w.text)}{\\c&H00FFFFFF&}` : escape(w.text)))
        .join(" ");
      // Al aparecer la frase, un pequeño "pop"
      const pop = i === 0 ? "{\\fscx88\\fscy88\\t(0,90,\\fscx104\\fscy104)\\t(90,160,\\fscx100\\fscy100)}" : "";
      events.push(`Dialogue: 0,${time(start)},${time(end)},Default,,0,0,0,,${pop}${text}`);
    });
  });
  return [...header, ...events, ""].join("\n");
}

function escape(text) {
  return text.replace(/[{}]/g, "").replace(/\\/g, "");
}

// Formato de tiempo ASS: h:mm:ss.cc
function time(seconds) {
  const cs = Math.max(0, Math.round(seconds * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}
