import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/app-url";
import { authorizeUrl, tiktokConfigured } from "@/lib/tiktok";

export async function GET(request: NextRequest) {
  const base = appUrl(request);
  if (!tiktokConfigured()) return NextResponse.redirect(`${base}/marca?tiktok=no-configurado`);

  const state = crypto.randomUUID();
  const redirectUri = `${base}/api/tiktok/callback`;
  const response = NextResponse.redirect(authorizeUrl(redirectUri, state));
  // Se guarda la dirección exacta: el cambio del código exige la misma.
  response.cookies.set("tt_oauth", JSON.stringify({ state, redirectUri }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/tiktok",
    maxAge: 600,
  });
  return response;
}
