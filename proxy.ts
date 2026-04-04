import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(_req: NextRequest) {

   const { pathname} = _req.nextUrl;

   const proto = _req.headers.get("x-forwarded-proto") ?? "http";
const host = _req.headers.get("host") ?? "localhost:3000";
const baseUrl = `${proto}://${host}`;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
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

   const estadoRes = await fetch(`${baseUrl}/api/estado-cuenta`, {
    headers: { cookie },
    cache: "no-store",
  });

  if (estadoRes.status === 401) {
    return NextResponse.redirect(new URL("/auth", _req.url));
  }

  const estadoJson = await estadoRes.json().catch(() => null);

  if (estadoJson?.blocked) {
    return NextResponse.redirect(new URL("/morosidad", _req.url));
  }

// revisar error pendiente de resumen diario
  // evita loop cuando ya está en /tareasporhacer
  if (!pathname.startsWith("/tareasporhacer")) {
const resumenErrorRes = await fetch(`${baseUrl}/api/colaboradores/resumen-error`, {
  headers: { cookie },
  cache: "no-store",
});


if (resumenErrorRes.ok) {
  const resumenErrorJson = await resumenErrorRes.json().catch(() => null);

  if (resumenErrorJson?.hasError) {
    return NextResponse.redirect(new URL("/tareasporhacer", _req.url));
  }
}
  }


  return NextResponse.next();
}
