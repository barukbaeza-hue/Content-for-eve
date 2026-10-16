import type { AiError } from "./ai";

// Mensajes para el founder cuando la IA falla, con lo que puede hacer al respecto.
const AI_ERRORS: Record<AiError["reason"], string> = {
  "sin-clave": "La IA aún no está configurada. Falta la clave de Anthropic en Vercel.",
  "clave-invalida": "La clave de Anthropic no es válida. Revísala en Vercel.",
  "sin-saldo": "Se acabó el saldo de la IA. Recarga créditos en la consola de Anthropic.",
  saturada: "La IA está saturada ahora mismo. Prueba de nuevo en un minuto.",
  limite: "Demasiadas peticiones seguidas. Espera un minuto y vuelve a intentarlo.",
  fallo: "La IA no pudo responder esta vez. Inténtalo de nuevo.",
};

export function aiErrorMessage(error: AiError) {
  const code = error.code && error.reason === "fallo" ? ` (código: ${error.code})` : "";
  return AI_ERRORS[error.reason] + code;
}
