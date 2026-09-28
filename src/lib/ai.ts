import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { FORMATS, type Format } from "./content";

// Claude Sonnet 5 vía la API de Anthropic. Solo se usa en el servidor.
const MODEL = "claude-sonnet-5";

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
    public reason: "sin-clave" | "clave-invalida" | "sin-saldo" | "limite" | "saturada" | "fallo",
    public code?: string,
  ) {
    super(reason);
  }
}

const IdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string().describe("Título corto de la idea, máximo 70 caracteres."),
      hook: z.string().describe("Gancho de los primeros 3 segundos, tal cual se diría o se leería."),
      format: z.string().describe(`Formato: uno de ${Object.keys(FORMATS).join(", ")}.`),
      script: z.string().describe("Guion breve en 3 a 5 pasos, separados por saltos de línea."),
    }),
  ),
});

const SYSTEM =
  "Eres estratega de contenido para redes sociales. Escribes en español, con el tono de la creadora. " +
  "Las ideas son concretas, variadas en formato y fáciles de grabar con un móvil. Nada genérico.";

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new AiError("clave-invalida", String(error.status));
  }
  if (error instanceof Anthropic.RateLimitError) return new AiError("limite", "429");
  if (error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message)) {
    return new AiError("sin-saldo", "400");
  }
  if (error instanceof Anthropic.APIError) {
    const status = error.status ?? 0;
    // 529 = sobrecarga de Anthropic; el SDK ya reintenta antes de llegar aquí.
    return new AiError(status >= 500 ? "saturada" : "fallo", String(error.status ?? "red"));
  }
  return new AiError("fallo", "desconocido");
}

export async function generateIdeas(
  brand: BrandContext,
  options: { topic?: string; avoid: string[]; count: number },
): Promise<GeneratedIdea[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError("sin-clave");

  const client = new Anthropic({ apiKey });

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
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
      // Esfuerzo bajo: tarea creativa sencilla; mantiene el coste en ~1-2 céntimos por llamada.
      output_config: { effort: "low", format: zodOutputFormat(IdeasSchema) },
    });

    if (response.stop_reason === "refusal") throw new AiError("fallo", "rechazo");
    const ideas = (response.parsed_output?.ideas ?? []).map((idea) => ({
      ...idea,
      format: (idea.format.toLowerCase() in FORMATS ? idea.format.toLowerCase() : "reel") as Format,
    }));
    if (ideas.length === 0) throw new AiError("fallo", "vacio");
    return ideas;
  } catch (error) {
    console.error("Error de Claude:", error);
    throw toAiError(error);
  }
}
