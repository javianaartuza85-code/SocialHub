import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { metaConfigured, oauthUrl } from "@/lib/meta";

/** Inicia la conexión con Meta para un cliente (solo administradores). */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("cliente") ?? "";
  const back = new URL(`/clientes/${clientId}`, req.url);
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  if (!metaConfigured()) {
    back.searchParams.set("meta", "sin-configurar");
    return NextResponse.redirect(back);
  }
  const state = encrypt(JSON.stringify({ c: clientId, u: user.id, t: Date.now() }));
  return NextResponse.redirect(oauthUrl(`${process.env.NEXT_PUBLIC_SITE_URL}/api/meta/callback`, state));
}
