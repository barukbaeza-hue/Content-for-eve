import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { FORMATS, type Format } from "./content";
import type { SocialVideo } from "./social";

// Claude Sonnet 5 vía la API de Anthropic. Solo se usa en el servidor.
const MODEL = "claude-sonnet-5";

export type BrandContext = {
  offer: string | null;
  voice: string | null;
  insights: string | null;
  niche: string | null;
  audience: string | null;
  tone: string | null;
  topics: string[];
  building: string | null;
  story: string | null;
  expertise: string | null;
  opinions: string | null;
  audience_questions: string | null;
  call_to_action: string | null;
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
  reply: z.string().describe("Tu respuesta al founder, breve y en su tono. Sin repetir el contenido de las ideas."),
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
  const field = (label: string, value: string | null) => (value ? `- ${label}: ${value}` : "");
  return [
    "Eres Mova, estratega de contenido para founder creators: fundadores que publican vídeos cortos y sencillos",
    "(hablando a cámara) en Instagram y TikTok con tres objetivos: distribuir su oferta, generar confianza y",
    "documentar su proceso, sus aprendizajes y sus consejos. Hablas en español, en su tono y con sus expresiones.",
    "Propones ideas concretas, fáciles de grabar con un móvil y nada genéricas. Equilibra los tres objetivos:",
    "la mayoría aportan valor o documentan; la oferta aparece con naturalidad, sin sonar a anuncio.",
    "Si tiene un destino para su audiencia, puedes cerrar algunos guiones llevándola ahí.",
    "Cuando propongas o modifiques ideas, ponlas en `ideas` (5 por defecto si pide ideas sin decir cuántas) y deja `reply` en una o dos frases.",
    "Si pide cambiar una idea anterior, devuelve solo la versión nueva de esa idea.",
    "",
    "Marca personal:",
    `- Nicho: ${brand.niche || "sin especificar"}`,
    `- Público: ${brand.audience || "sin especificar"}`,
    `- Tono: ${brand.tone || "sin especificar"}`,
    field("Cómo habla", brand.voice),
    `- Temas habituales: ${brand.topics.join(", ") || "sin especificar"}`,
    "",
    "Oferta, historia y visión:",
    field("Qué ofrece", brand.offer),
    field("Qué está construyendo", brand.building),
    field("Su historia", brand.story),
    field("Lo que sabe y enseña", brand.expertise),
    field("Sus opiniones", brand.opinions),
    field("Lo que le pregunta su audiencia", brand.audience_questions),
    field("A dónde quiere llevar a su audiencia", brand.call_to_action),
    field("Qué le funciona", brand.insights),
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

// Perfil creado a partir de los vídeos propios del founder.
const ProfileSchema = z.object({
  niche: z.string().describe("De qué trata su contenido, en una frase."),
  audience: z.string().describe("A quién le habla: edad, intereses y qué busca."),
  tone: z.string().describe("Tono en 2 a 4 adjetivos separados por comas."),
  voice: z.string().describe("Cómo habla: expresiones y muletillas reales que repite, cómo empieza y cómo cierra sus vídeos."),
  topics: z.array(z.string()).describe("Sus 3 a 6 pilares de contenido."),
  offer: z.string().describe("Qué ofrece o vende, si se deduce. Vacío si no se ve."),
  building: z.string().describe("Qué está construyendo. Vacío si no se ve."),
  story: z.string().describe("Lo que cuenta de su historia: origen, hitos, errores. Vacío si no se ve."),
  expertise: z.string().describe("Lo que sabe y enseña."),
  opinions: z.string().describe("Opiniones propias o poco comunes que defiende. Vacío si no se ven."),
  audience_questions: z.string().describe("Preguntas que le hace su audiencia, una por línea. Vacío si no hay comentarios."),
  call_to_action: z.string().describe("A dónde lleva a su audiencia (enlace, mensaje privado, newsletter…). Vacío si no lo hace."),
  insights: z.string().describe("Qué le funciona mejor según las métricas: temas, formatos y ganchos de sus vídeos con más alcance."),
});

export type ProfileDraft = z.infer<typeof ProfileSchema>;

export async function analyzeProfile(videos: SocialVideo[]): Promise<ProfileDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError("sin-clave");
  if (videos.length === 0) throw new AiError("fallo", "sin-videos");

  const client = new Anthropic({ apiKey });
  const list = videos
    .map((v, i) =>
      [
        `### Vídeo ${i + 1} (${v.platform}${v.postedAt ? `, ${v.postedAt.slice(0, 10)}` : ""})`,
        `Métricas: ${v.views ?? "?"} vistas, ${v.likes ?? "?"} me gusta, ${v.comments ?? "?"} comentarios`,
        `Descripción: ${v.caption || "(sin descripción)"}`,
        v.transcript ? `Lo que dice: ${v.transcript}` : "",
        v.topComments?.length ? `Comentarios: ${v.topComments.join(" | ")}` : "",
      ].filter(Boolean).join("\n"),
    )
    .join("\n\n");

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system:
        "Analizas los vídeos de un founder creator para crear el perfil de su marca personal. " +
        "Escribe en español y en segunda persona (\"hablas…\", \"tu audiencia…\"). " +
        "Básate solo en lo que aparece en los vídeos: no inventes datos. Cita expresiones reales cuando describas cómo habla.",
      messages: [{ role: "user", content: `Estos son sus vídeos más recientes:\n\n${list}` }],
      output_config: { effort: "medium", format: zodOutputFormat(ProfileSchema) },
    });

    if (response.stop_reason === "refusal") throw new AiError("fallo", "rechazo");
    if (!response.parsed_output) throw new AiError("fallo", "vacio");
    return response.parsed_output;
  } catch (error) {
    console.error("Error de Claude:", error);
    throw toAiError(error);
  }
}
