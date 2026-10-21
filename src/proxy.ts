import { NextResponse, type NextRequest } from "next/server";
import {
  debeRenovar,
  hashearTokenSesion,
  nuevaExpiracion,
} from "./lib/auth/sesion";
import { resolverDestino } from "./lib/auth/guardas";
import {
  NOMBRE_COOKIE_SESION,
  buscarSesionPorId,
  buscarUsuarioPorId,
  parsearCookieSesion,
  renovarSesionDB,
} from "./lib/supabase/auth";
import type { PasoOnboarding } from "./lib/auth/tipos";

function aFecha(valor: unknown): Date | null {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }
  if (typeof valor === "string") {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function esPublicaSinSesion(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/registro") {
    return true;
  }
  if (pathname === "/normas" || pathname.startsWith("/normas/")) {
    return true;
  }
  if (pathname.startsWith("/normas#")) {
    return true;
  }
  return false;
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname;
  if (pathname === "/home") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }
  const crudo = req.cookies.get(NOMBRE_COOKIE_SESION)?.value ?? null;
  const ahora = new Date();
  if (crudo === null) {
    if (esPublicaSinSesion(pathname)) {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  const par = parsearCookieSesion(crudo);
  if (par === null) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(NOMBRE_COOKIE_SESION);
    return res;
  }
  let sesion = null;
  try {
    sesion = await buscarSesionPorId(par.id);
  } catch {
    sesion = null;
  }
  const expira = sesion === null ? null : aFecha(sesion.expiraAt);
  const ultima = sesion === null ? null : aFecha(sesion.ultimaRenovacionAt);
  const revocada = sesion === null ? null : aFecha(sesion.revocadaAt);
  if (
    sesion === null ||
    expira === null ||
    ultima === null ||
    revocada !== null ||
    hashearTokenSesion(par.token) !== sesion.tokenHash ||
    expira.getTime() <= ahora.getTime()
  ) {
    if (esPublicaSinSesion(pathname)) {
      const res = NextResponse.next();
      res.cookies.delete(NOMBRE_COOKIE_SESION);
      return res;
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(NOMBRE_COOKIE_SESION);
    return res;
  }
  let usuario = null;
  try {
    usuario = await buscarUsuarioPorId(sesion.usuarioId);
  } catch {
    usuario = null;
  }
  if (usuario === null) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(NOMBRE_COOKIE_SESION);
    return res;
  }
  const completado =
    usuario.onboardingCompletadoAt !== null &&
    aFecha(usuario.onboardingCompletadoAt) !== null;
  let paso: PasoOnboarding = 1;
  if (completado) {
    paso = "completado";
  } else if (usuario.onboardingPaso === 2) {
    paso = 2;
  }
  const destino = resolverDestino({
    tieneSesion: true,
    esTemporal: usuario.esTemporal,
    rol: usuario.rol === "admin" ? "admin" : "manager",
    onboardingPaso: paso,
    ruta: pathname,
  });
  const hayQueRenovar = debeRenovar(ultima, ahora);
  const aplicarRenovacion = async (
    res: NextResponse,
  ): Promise<NextResponse> => {
    if (!hayQueRenovar) {
      return res;
    }
    const nueva = nuevaExpiracion(ahora);
    try {
      await renovarSesionDB(sesion.id, nueva, ahora);
    } catch {
      return res;
    }
    res.cookies.set(NOMBRE_COOKIE_SESION, `${sesion.id}.${par.token}`, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 3600,
    });
    return res;
  };
  if (destino.a === "permitir") {
    return aplicarRenovacion(NextResponse.next());
  }
  if (destino.a === "/onboarding") {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    return aplicarRenovacion(NextResponse.redirect(url));
  }
  const url = req.nextUrl.clone();
  url.pathname = destino.a;
  return aplicarRenovacion(NextResponse.redirect(url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
