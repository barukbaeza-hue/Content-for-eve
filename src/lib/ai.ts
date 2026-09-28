import { ApiError, GoogleGenAI } from "@google/genai";
import { FORMATS, type Format } from "./content";

// Gemini (plan gratuito de Google AI Studio). Solo se usa en el servidor.
// Google retira modelos con frecuencia, así que no se fija un nombre: se consulta qué
// modelos Flash tiene disponibles la clave y se prueban en orden, del más reciente al más antiguo.
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];
const EXCLUDED = /image|tts|audio|live|embedding|robotics|computer|thinking/;

let discovered: string[] | undefined;

function version(name: string) {
  return Number(name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
}

// Estables antes que previews, versiones nuevas antes que viejas, Flash antes que Flash-Lite.
export function rankModels(names: string[]): string[] {
  const rank = (n: string) => [/preview|exp/.test(n) ? 1 : 0, -version(n), n.includes("lite") ? 1 : 0];
  return [...names].sort((a, b) => {
    const [ra, rb] = [rank(a), rank(b)];
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return a.localeCompare(b);
  });
}

async function candidateModels(ai: GoogleGenAI): Promise<string[]> {
  if (!discovered) {
    try {
      const found: string[] = [];
      for await (const model of await ai.models.list()) {
        const name = model.name?.replace(/^models\//, "");
        if (
          name?.startsWith("gemini-") &&
          name.includes("flash") &&
          !EXCLUDED.test(name) &&
          model.supportedActions?.includes("generateContent")
        ) {
          found.push(name);
        }
      }
      if (found.length > 0) discovered = rankModels(found).slice(0, 3);
    } catch (error) {
      console.error("No se pudo listar los modelos de Gemini:", error);
    }
  }

  return [process.env.GEMINI_MODEL, ...(discovered ?? FALLBACK_MODELS)].filter(
    (m, i, all): m is string => Boolean(m) && all.indexOf(m) === i,
  );
}

export type BrandContext = {
  niche: string | null;
  audience: string | null;
  tone: string | null;
  topics: string[];
};

export type GeneratedIdea = {
  title: string;
  hook: string;
  format: Format;
  script: string;
};

export class AiError extends Error {
  constructor(
    public reason: "sin-clave" | "clave-invalida" | "limite" | "fallo",
    public code?: string,
  ) {
    super(reason);
  }
}

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof ApiError) {
    if (error.status === 429) return new AiError("limite", "429");
    if (error.status === 401 || error.status === 403 || error.message.includes("API_KEY_INVALID")) {
      return new AiError("clave-invalida", String(error.status));
    }
    return new AiError("fallo", String(error.status));
  }
  return new AiError("fallo", error instanceof SyntaxError ? "json" : "desconocido");
}

const IDEAS_SCHEMA = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título corto de la idea, máximo 70 caracteres." },
          hook: { type: "string", description: "Gancho de los primeros 3 segundos, tal cual se diría o se leería." },
          format: { type: "string", enum: Object.keys(FORMATS) },
          script: { type: "string", description: "Guion breve en 3 a 5 pasos, separados por saltos de línea." },
        },
        required: ["title", "hook", "format", "script"],
      },
    },
  },
  required: ["ideas"],
};

export async function generateIdeas(
  brand: BrandContext,
  options: { topic?: string; avoid: string[]; count: number },
): Promise<GeneratedIdea[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("sin-clave");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = [
    `Propón ${options.count} ideas de contenido para Instagram y TikTok de esta creadora.`,
    "",
    `Nicho: ${brand.niche || "sin especificar"}`,
    `Público: ${brand.audience || "sin especificar"}`,
    `Tono: ${brand.tone || "sin especificar"}`,
    `Temas habituales: ${brand.topics.join(", ") || "sin especificar"}`,
    options.topic ? `Esta vez, las ideas deben tratar sobre: ${options.topic}` : "",
    options.avoid.length
      ? `No repitas estas ideas que ya tiene:\n${options.avoid.map((t) => `- ${t}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");

  let lastError: AiError | undefined;

  for (const model of await candidateModels(ai)) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            "Eres estratega de contenido para redes sociales. Escribes en español, con el tono de la creadora. " +
            "Las ideas son concretas, variadas en formato y fáciles de grabar con un móvil. Nada genérico.",
          responseMimeType: "application/json",
          responseJsonSchema: IDEAS_SCHEMA,
          temperature: 1,
        },
      });

      const parsed = JSON.parse(response.text ?? "{}") as { ideas?: GeneratedIdea[] };
      const ideas = (parsed.ideas ?? []).filter(
        (i) => i.title && i.hook && i.script && i.format in FORMATS,
      );
      if (ideas.length === 0) throw new AiError("fallo", "vacio");
      return ideas;
    } catch (error) {
      console.error(`Error de Gemini (${model}):`, error);
      lastError = toAiError(error);
      // Con la clave mal no sirve probar otro modelo.
      if (lastError.reason === "clave-invalida") break;
    }
  }

  throw lastError ?? new AiError("fallo");
}
