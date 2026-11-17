import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/crypto";
import { exchangeCode } from "@/lib/meta";

/** Meta vuelve aquí después de que el administrador da permiso. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const rawState = req.nextUrl.searchParams.get("state") ?? "";
  let state: { c: string; u: string; t: number };
  try {
    state = JSON.parse(decrypt(rawState));
  } catch {
    return NextResponse.redirect(new URL("/?meta=error", req.url));
  }
  const back = new URL(`/clientes/${state.c}`, req.url);
  const user = await getCurrentUser();
  if (!user || user.id !== state.u || user.role !== "admin" || Date.now() - state.t > 15 * 60_000 || !code) {
    back.searchParams.set("meta", "cancelado");
    return NextResponse.redirect(back);
  }
  try {
    const { access_token } = await exchangeCode(code, `${process.env.NEXT_PUBLIC_SITE_URL}/api/meta/callback`);
    const res = NextResponse.redirect(new URL(`/clientes/${state.c}/conectar-meta`, req.url));
    // Guardamos el token temporalmente (cifrado, 15 min) para elegir la página
    res.cookies.set("meta_pending", encrypt(JSON.stringify({ token: access_token, c: state.c })), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 900,
      path: "/",
    });
    return res;
  } catch (e) {
    back.searchParams.set("meta", "error");
    back.searchParams.set("detalle", (e as Error).message.slice(0, 200));
    return NextResponse.redirect(back);
  }
}
