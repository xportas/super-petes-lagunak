"use server";

import { cookies, headers } from "next/headers";
import {
  NOMBRE_COOKIE_SESION,
  buscarInvitacionActiva,
  buscarUsuarioPorNorm,
  crearSesionDB,
  crearUsuario,
  eliminarFilaRateLimit,
  guardarFilaRateLimit,
  leerFilaRateLimit,
} from "@/src/lib/supabase/auth";
import {
  evaluarIntento,
  siguienteFilaTrasFallo,
  sujetoPara,
} from "@/src/lib/auth/rate-limit";
import {
  esFormatoUsernameValido,
  esPasswordValida,
  extraerIP,
  normalizarCodigoInvitacion,
  normalizarUsername,
} from "@/src/lib/auth/normalizacion";
import {
  generarTokenSesion,
  hashearTokenSesion,
  nuevaExpiracion,
} from "@/src/lib/auth/sesion";
import { hashearPassword } from "@/src/lib/auth/password";

interface ResultadoRegistro {
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

function leerCampo(entrada: unknown, clave: string): unknown {
  if (typeof entrada === "object" && entrada !== null) {
    if (typeof (entrada as { get?: unknown }).get === "function") {
      try {
        return (entrada as unknown as FormData).get(clave);
      } catch {
        return undefined;
      }
    }
    return (entrada as Record<string, unknown>)[clave];
  }
  return undefined;
}

export async function registrar(
  entrada: unknown,
): Promise<ResultadoRegistro> {
  const ahora = new Date();
  const h = await headers();
  const ip = extraerIP(h);
  const sujeto = sujetoPara("registro", { ip });
  const fila = await leerFilaRateLimit("registro", sujeto).catch(() => null);
  const filaDominio =
    fila === null
      ? null
      : {
          alcance: "registro" as const,
          sujeto,
          intentos: fila.intentos,
          primerFalloAt: aFecha(fila.primerFalloAt) ?? ahora,
          bloqueadoHasta: aFecha(fila.bloqueadoHasta),
        };
  if (filaDominio !== null && !evaluarIntento(filaDominio, ahora).permitido) {
    return { ok: false, codigo: "BLOQUEADO" };
  }
  const codigoCrudo = leerCampo(entrada, "codigo");
  let codigoNorm = "";
  try {
    codigoNorm =
      typeof codigoCrudo === "string"
        ? normalizarCodigoInvitacion(codigoCrudo)
        : "";
  } catch {
    codigoNorm = "";
  }
  if (codigoNorm.length === 0) {
    const siguiente = siguienteFilaTrasFallo(filaDominio, ahora);
    await guardarFilaRateLimit({
      alcance: "registro",
      sujeto,
      intentos: siguiente.intentos,
      primerFalloAt: siguiente.primerFalloAt,
      bloqueadoHasta: siguiente.bloqueadoHasta,
    }).catch(() => undefined);
    return { ok: false, codigo: "INVITACION" };
  }
  const invitacion = await buscarInvitacionActiva(codigoNorm).catch(
    () => null,
  );
  if (invitacion === null) {
    const siguiente = siguienteFilaTrasFallo(filaDominio, ahora);
    await guardarFilaRateLimit({
      alcance: "registro",
      sujeto,
      intentos: siguiente.intentos,
      primerFalloAt: siguiente.primerFalloAt,
      bloqueadoHasta: siguiente.bloqueadoHasta,
    }).catch(() => undefined);
    return { ok: false, codigo: "INVITACION" };
  }
  const usernameCrudo = leerCampo(entrada, "username");
  if (!esFormatoUsernameValido(usernameCrudo)) {
    return { ok: false, codigo: "USERNAME" };
  }
  const passwordCruda = leerCampo(entrada, "password");
  if (!esPasswordValida(passwordCruda)) {
    return { ok: false, codigo: "PASSWORD" };
  }
  const norm = normalizarUsername(usernameCrudo);
  const display =
    typeof usernameCrudo === "string" ? usernameCrudo.trim() : norm;
  const existente = await buscarUsuarioPorNorm(norm).catch(() => null);
  if (existente !== null) {
    return { ok: false, codigo: "USERNAME" };
  }
  const hash = await hashearPassword(passwordCruda as string);
  let creado = null;
  try {
    creado = await crearUsuario({
      usernameDisplay: display,
      usernameNorm: norm,
      hashPassword: hash,
    });
  } catch {
    return { ok: false, codigo: "USERNAME" };
  }
  await eliminarFilaRateLimit("registro", sujeto).catch(() => undefined);
  const token = generarTokenSesion();
  const tokenHash = hashearTokenSesion(token);
  const expira = nuevaExpiracion(ahora);
  const sesion = await crearSesionDB({
    usuarioId: creado.id,
    tokenHash,
    expiraAt: expira,
    ultimaRenovacionAt: ahora,
  }).catch(() => null);
  if (sesion === null) {
    return { ok: false, codigo: "USERNAME" };
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
