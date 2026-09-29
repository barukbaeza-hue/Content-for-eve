import type { NextRequest } from "next/server";

// URL pública de la app. Debe coincidir con la registrada en Meta para el redireccionamiento.
export function appUrl(request: NextRequest) {
  return process.env.APP_URL || request.nextUrl.origin;
}
