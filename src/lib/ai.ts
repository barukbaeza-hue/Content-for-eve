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

const ChatSchema = z.object({
  reply: z.string().describe("Tu respuesta a la creadora, breve y en su tono. Sin repetir el contenido de las ideas."),
  ideas: z
    .array(
      z.object({
        title: z.string().describe("Título corto de la idea, máximo 70 caracteres."),
        hook: z.string().describe("Gancho de los primeros 3 segundos, tal cual se diría o se leería."),
        format: z.string().describe(`Formato: uno de ${Object.keys(FORMATS).join(", ")}.`),
        script: z.string().describe("Guion breve en 3 a 5 pasos, separados por saltos de línea."),
      }),
    )
    .describe("Ideas nuevas o modificadas que propones en este mensaje. Vacío si solo conversas."),
});

export type ChatTurn = { role: "user" | "assistant"; content: string; ideas: GeneratedIdea[] };

function systemPrompt(brand: BrandContext, saved: string[]) {
  return [
    "Eres Mova, estratega de contenido para redes sociales (Instagram y TikTok). Hablas en español, en el tono de la creadora.",
    "Ayudas a pensar ideas concretas, variadas en formato y fáciles de grabar con un móvil. Nada genérico.",
    "Cuando propongas o modifiques ideas, ponlas en `ideas` (5 por defecto si pide ideas sin decir cuántas) y deja `reply` en una o dos frases.",
    "Si pide cambiar una idea anterior, devuelve solo la versión nueva de esa idea.",
    "",
    "Marca de la creadora:",
    `- Nicho: ${brand.niche || "sin especificar"}`,
    `- Público: ${brand.audience || "sin especificar"}`,
    `- Tono: ${brand.tone || "sin especificar"}`,
    `- Temas habituales: ${brand.topics.join(", ") || "sin especificar"}`,
    saved.length ? `\nIdeas que ya tiene guardadas (no las repitas):\n${saved.map((t) => `- ${t}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

// Las ideas de turnos anteriores se envían como texto para que pueda referirse a ellas ("la 2").
function toApiMessage(turn: ChatTurn): Anthropic.MessageParam {
  if (turn.role === "user" || turn.ideas.length === 0) return { role: turn.role, content: turn.content };
  const ideas = turn.ideas
    .map((i, n) => `${n + 1}. [${FORMATS[i.format]}] ${i.title}\n   Gancho: ${i.hook}\n   Guion: ${i.script.replace(/\n/g, " / ")}`)
    .join("\n");
  return { role: "assistant", content: `${turn.content}\n\nIdeas:\n${ideas}` };
}

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

export async function chat(
  brand: BrandContext,
  history: ChatTurn[],
  saved: string[],
): Promise<{ reply: string; ideas: GeneratedIdea[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError("sin-clave");

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: systemPrompt(brand, saved),
      messages: history.map(toApiMessage),
      // Esfuerzo bajo: tarea creativa sencilla; mantiene el coste en ~1-2 céntimos por mensaje.
      output_config: { effort: "low", format: zodOutputFormat(ChatSchema) },
    });

    if (response.stop_reason === "refusal") throw new AiError("fallo", "rechazo");
    const output = response.parsed_output;
    if (!output) throw new AiError("fallo", "vacio");

    return {
      reply: output.reply,
      ideas: output.ideas.map((idea) => ({
        ...idea,
        format: (idea.format.toLowerCase() in FORMATS ? idea.format.toLowerCase() : "reel") as Format,
      })),
    };
  } catch (error) {
    console.error("Error de Claude:", error);
    throw toAiError(error);
  }
}
