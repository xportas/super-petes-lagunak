"use server";

import { cookies } from "next/headers";
import {
  NOMBRE_COOKIE_SESION,
  buscarSesionPorId,
  buscarUsuarioPorNorm,
  crearSesionDB,
  eliminarFilaRateLimit,
  guardarFilaRateLimit,
  leerFilaRateLimit,
  parsearCookieSesion,
  revocarSesionDB,
} from "@/src/lib/supabase/auth";
import {
  evaluarIntento,
  siguienteFilaTrasFallo,
  sujetoPara,
} from "@/src/lib/auth/rate-limit";
import { normalizarUsername } from "@/src/lib/auth/normalizacion";
import { hashearTokenSesion, generarTokenSesion } from "@/src/lib/auth/sesion";
import { nuevaExpiracion } from "@/src/lib/auth/sesion";
import { validarLogin } from "@/src/lib/auth/esquemas";
import { verificarPassword } from "@/src/lib/auth/password";

interface ResultadoAccion {
  readonly ok: boolean;
  readonly codigo?: string;
}

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

export async function iniciarSesion(
  entrada: unknown,
): Promise<ResultadoAccion> {
  const ahora = new Date();
  const parsed = validarLogin(entrada);
  if (!parsed.ok) {
    return { ok: false, codigo: "CREDENCIALES" };
  }
  let norm: string;
  try {
    norm = normalizarUsername(parsed.username);
  } catch {
    return { ok: false, codigo: "CREDENCIALES" };
  }
  const sujeto = sujetoPara("login", { usernameNorm: norm });
  const fila = await leerFilaRateLimit("login", sujeto).catch(() => null);
  const evalPrevia =
    fila === null
      ? { permitido: true, reiniciarVentana: true }
      : evaluarIntento(
          {
            alcance: "login",
            sujeto,
            intentos: fila.intentos,
            primerFalloAt: aFecha(fila.primerFalloAt) ?? ahora,
            bloqueadoHasta: aFecha(fila.bloqueadoHasta),
          },
          ahora,
        );
  if (!evalPrevia.permitido) {
    return { ok: false, codigo: "BLOQUEADO" };
  }
  const usuario = await buscarUsuarioPorNorm(norm).catch(() => null);
  if (usuario === null) {
    const siguiente = siguienteFilaTrasFallo(
      fila === null
        ? null
        : {
            alcance: "login",
            sujeto,
            intentos: fila.intentos,
            primerFalloAt: aFecha(fila.primerFalloAt) ?? ahora,
            bloqueadoHasta: aFecha(fila.bloqueadoHasta),
          },
      ahora,
    );
    await guardarFilaRateLimit({
      alcance: "login",
      sujeto,
      intentos: siguiente.intentos,
      primerFalloAt: siguiente.primerFalloAt,
      bloqueadoHasta: siguiente.bloqueadoHasta,
    }).catch(() => undefined);
    return { ok: false, codigo: "CREDENCIALES" };
  }
  const coincide = await verificarPassword(
    parsed.password,
    usuario.passwordHash,
  );
  if (!coincide) {
    const siguiente = siguienteFilaTrasFallo(
      fila === null
        ? null
        : {
            alcance: "login",
            sujeto,
            intentos: fila.intentos,
            primerFalloAt: aFecha(fila.primerFalloAt) ?? ahora,
            bloqueadoHasta: aFecha(fila.bloqueadoHasta),
          },
      ahora,
    );
    await guardarFilaRateLimit({
      alcance: "login",
      sujeto,
      intentos: siguiente.intentos,
      primerFalloAt: siguiente.primerFalloAt,
      bloqueadoHasta: siguiente.bloqueadoHasta,
    }).catch(() => undefined);
    return { ok: false, codigo: "CREDENCIALES" };
  }
  await eliminarFilaRateLimit("login", sujeto).catch(() => undefined);
  const token = generarTokenSesion();
  const tokenHash = hashearTokenSesion(token);
  const expira = nuevaExpiracion(ahora);
  const sesion = await crearSesionDB({
    usuarioId: usuario.id,
    tokenHash,
    expiraAt: expira,
    ultimaRenovacionAt: ahora,
  }).catch(() => null);
  if (sesion === null) {
    return { ok: false, codigo: "CREDENCIALES" };
  }
  const jar = await cookies();
  jar.set(NOMBRE_COOKIE_SESION, `${sesion.id}.${token}`, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
  return { ok: true };
}

export async function cerrarSesion(): Promise<ResultadoAccion> {
  const jar = await cookies();
  const crudo = jar.get(NOMBRE_COOKIE_SESION)?.value ?? null;
  const par = parsearCookieSesion(crudo);
  if (par !== null) {
    const sesion = await buscarSesionPorId(par.id).catch(() => null);
    if (
      sesion !== null &&
      sesion.tokenHash === hashearTokenSesion(par.token)
    ) {
      await revocarSesionDB(sesion.id, new Date()).catch(() => undefined);
    }
  }
  jar.delete(NOMBRE_COOKIE_SESION);
  return { ok: true };
}
