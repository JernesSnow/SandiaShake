import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(_req: NextRequest) {

   const { pathname,origin } = _req.nextUrl;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/verify-email-mfa") ||
    pathname.startsWith("/morosidad") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api");

  if (isPublic) return NextResponse.next();

//esto lo estoy poniendo aqui para poder acceder al landingpage, ya que de lo contrario me redirige a morosidad aunque no este logueado, porque el middleware se ejecuta antes de que se pueda verificar el auth

const cookie = _req.headers.get("cookie") ?? "";

  // SIN COOKIE = SIN SESIÓN → auth (no morosidad)
  if (!cookie) {
    return NextResponse.redirect(new URL("/auth", _req.url));
  }

  const res = await fetch(`${origin}/api/estado-cuenta`, {
    headers: { cookie: _req.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  if (res.status === 401) {
    
    return NextResponse.redirect(new URL("/auth", _req.url));
  }

  const json = await res.json().catch(() => null);

 if (json?.blocked) {
  return NextResponse.redirect(new URL("/morosidad", _req.url));
}

  return NextResponse.next();
}
