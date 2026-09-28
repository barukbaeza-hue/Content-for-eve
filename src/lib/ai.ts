import { ApiError, GoogleGenAI } from "@google/genai";
import { FORMATS, type Format } from "./content";

// Gemini (plan gratuito de Google AI Studio). Solo se usa en el servidor.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

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
  constructor(public reason: "sin-clave" | "clave-invalida" | "limite" | "fallo") {
    super(reason);
  }
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

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
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
    if (ideas.length === 0) throw new AiError("fallo");
    return ideas;
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error instanceof ApiError && error.status === 429) throw new AiError("limite");
    if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.message.includes("API_KEY_INVALID"))) {
      throw new AiError("clave-invalida");
    }
    console.error("Error de Gemini:", error);
    throw new AiError("fallo");
  }
}
