// Mensajes tras volver de Instagram (parámetro ?instagram=).
export const INSTAGRAM_MESSAGES: Record<string, string> = {
  cancelado: "Cancelaste la conexión con Instagram.",
  rechazado: "Instagram no aceptó la conexión. Comprueba que la cuenta sea profesional y esté invitada como probadora.",
  error: "No se pudo conectar Instagram. Inténtalo de nuevo.",
  "no-configurado": "La conexión con Instagram aún no está configurada.",
};

// Mensaje con el detalle técnico que devolvió Instagram, si lo hay.
export function instagramMessage(status: unknown, detail: unknown) {
  if (typeof status !== "string" || !INSTAGRAM_MESSAGES[status]) return undefined;
  return typeof detail === "string" && detail ? `${INSTAGRAM_MESSAGES[status]} (${detail})` : INSTAGRAM_MESSAGES[status];
}
