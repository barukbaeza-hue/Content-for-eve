import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/app-url";
import { authorizeUrl, instagramConfigured } from "@/lib/instagram";

// A dónde volver tras conectar, según desde dónde se inició.
const DESTINATIONS = { bienvenida: "/bienvenida?paso=analizando", marca: "/marca?analizar=1" } as const;

export async function GET(request: NextRequest) {
  const base = appUrl(request);
  const from = request.nextUrl.searchParams.get("desde") === "marca" ? "marca" : "bienvenida";
  if (!instagramConfigured()) return NextResponse.redirect(`${base}${DESTINATIONS[from]}&instagram=no-configurado`);

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(authorizeUrl(`${base}/api/instagram/callback`, state));
  response.cookies.set("ig_oauth", JSON.stringify({ state, from }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/instagram",
    maxAge: 600,
  });
  return response;
}
