// Lógica de programación del banco de vídeos. Sin dependencias de la base de datos,
// para que la usen igual la interfaz y el agente.

export type Rhythm = { perDay: number; times: string[]; timeZone: string };

// Partes de una fecha tal como se ven en una zona horaria.
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
}

// Convierte una fecha y hora "de reloj" en una zona horaria a un instante UTC.
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(new Date(guess), timeZone);
  // Segunda pasada por si el cambio de horario cae entre medias.
  return new Date(guess - offsetMs(new Date(first), timeZone));
}

// Día de calendario (AAAA-MM-DD) de un instante en una zona horaria.
export function localDay(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// Próximos huecos libres según el ritmo, a partir de `from` y durante `days` días.
export function nextSlots(rhythm: Rhythm, options: { from: Date; days: number; taken: Date[] }): Date[] {
  const times = [...rhythm.times].sort().slice(0, rhythm.perDay);
  const taken = new Set(options.taken.map((d) => d.getTime()));
  // Margen para no programar algo que sale en unos minutos.
  const earliest = options.from.getTime() + 15 * 60 * 1000;
  const start = zonedParts(options.from, rhythm.timeZone);
  const slots: Date[] = [];

  for (let offset = 0; offset < options.days; offset++) {
    const day = new Date(Date.UTC(start.year, start.month - 1, start.day + offset));
    for (const time of times) {
      const [hour, minute] = time.split(":").map(Number);
      const slot = zonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hour, minute, rhythm.timeZone);
      if (slot.getTime() >= earliest && !taken.has(slot.getTime())) slots.push(slot);
    }
  }
  return slots;
}

// Días de contenido que cubren los vídeos pendientes al ritmo actual.
export function daysOfContent(pending: number, perDay: number) {
  return Math.floor(pending / Math.max(perDay, 1));
}
