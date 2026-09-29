// Subtítulos en formato ASS, estilo sobrio para founder creators:
// Geist en blanco a la altura del pecho, de 2 a 4 palabras, con una aparición suave y una sombra difusa
// que solo da legibilidad. Opcionalmente, un título arriba durante los primeros segundos.

/** Estilo por defecto. Más adelante cada founder tendrá el suyo según su marca. */
export const DEFAULT_STYLE = {
  font: "Geist SemiBold",
  sizeRatio: 0.034, // alto de letra respecto al alto del vídeo
  color: "&H00FFFFFF", // blanco (ASS: alfa-azul-verde-rojo)
  shadowColor: "&H80000000", // negro al 50 %
  spacing: -0.5, // tracking ligeramente negativo
  positionRatio: 0.3, // distancia desde abajo (a la altura del pecho)
  maxWords: 4,
  maxChars: 24,
  titleSizeRatio: 0.036,
  titleTopRatio: 0.1, // distancia del título desde arriba
  titleSeconds: 3,
};

/**
 * Agrupa las palabras en frases cortas: se corta por longitud, por puntuación o por una pausa.
 * @param {{ text: string, start: number, end: number }[]} words
 */
export function groupWords(words, { maxWords = 3, maxChars = 22, maxGap = 0.35 } = {}) {
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
 * @param {{ title?: string | null, style?: typeof DEFAULT_STYLE }} [options] título arriba al empezar
 */
export function buildAss(words, { width, height }, { title = null, style = DEFAULT_STYLE } = {}) {
  const fontSize = Math.round(height * style.sizeRatio);
  const shadow = Math.max(1, Math.round(fontSize * 0.04));
  const marginV = Math.round(height * style.positionRatio);
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
    `Style: Default,${style.font},${fontSize},${style.color},${style.color},${style.shadowColor},${style.shadowColor},0,0,0,0,100,100,${style.spacing},0,1,0,0,2,80,80,${marginV},1`,
    `Style: Title,${style.font},${Math.round(height * style.titleSizeRatio)},${style.color},${style.color},${style.shadowColor},${style.shadowColor},0,0,0,0,100,100,${style.spacing},0,1,0,0,8,80,80,${Math.round(height * style.titleTopRatio)},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  // Capa 0: sombra difusa (el mismo texto en negro y desenfocado). Capa 1: el texto nítido.
  const shade = `\\1c&H000000&\\1a&H${style.shadowColor.slice(2, 4)}&\\blur${shadow * 6}`;
  const layered = (start, end, styleName, text) => [
    `Dialogue: 0,${start},${end},${styleName},,0,0,0,,{\\fad(120,60)${shade}}${text}`,
    `Dialogue: 1,${start},${end},${styleName},,0,0,0,,{\\fad(120,60)}${text}`,
  ];

  const titleText = title ? clean(title.trim()) : "";
  const titleEvents = titleText ? layered(time(0), time(style.titleSeconds), "Title", titleText) : [];

  const groups = groupWords(words, style);
  const events = groups.flatMap((group, g) => {
    const next = groups[g + 1];
    const start = time(group[0].start);
    // La frase se queda hasta la siguiente si la pausa es corta, para que no parpadee
    const end = time(next && next[0].start - group.at(-1).end < 0.5 ? next[0].start : group.at(-1).end + 0.25);
    const text = group.map((w) => clean(w.text)).join(" ");
    return layered(start, end, "Default", text);
  });
  return [...header, ...titleEvents, ...events, ""].join("\n");
}

// Sin comas ni puntos finales: en pantalla se lee más limpio. Se mantienen ¿? y ¡!
function clean(text) {
  return text.replace(/[{}\\]/g, "").replace(/[.,;:]+$/g, "");
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
