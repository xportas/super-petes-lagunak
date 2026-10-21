"use server";

import { cookies } from "next/headers";
import {
  NOMBRE_COOKIE_SESION,
  actualizarPassword,
  buscarSesionPorId,
  buscarUsuarioPorId,
  eliminarFilaRateLimit,
  guardarFilaRateLimit,
  leerFilaRateLimit,
  parsearCookieSesion,
  revocarTodasDeUsuarioDB,
  revocarTodasMenosDB,
} from "@/src/lib/supabase/auth";
import {
  evaluarIntento,
  siguienteFilaTrasFallo,
  sujetoPara,
} from "@/src/lib/auth/rate-limit";
import { hashearTokenSesion } from "@/src/lib/auth/sesion";
import { validarCambioPassword } from "@/src/lib/auth/esquemas";
import { hashearPassword, verificarPassword } from "@/src/lib/auth/password";

interface ResultadoCambio {
  readonly ok: boolean;
  readonly codigo?: string;
  readonly retomarOnboarding?: boolean;
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

async function sesionYUsuarioActual(): Promise<
  | {
      readonly sesionId: string;
      readonly usuario: {
        readonly id: string;
        readonly passwordHash: string;
        readonly esTemporal: boolean;
        readonly onboardingCompletadoAt: unknown;
      };
    }
  | null
> {
  const jar = await cookies();
  const crudo = jar.get(NOMBRE_COOKIE_SESION)?.value ?? null;
  const par = parsearCookieSesion(crudo);
  if (par === null) {
    return null;
  }
  const sesion = await buscarSesionPorId(par.id).catch(() => null);
  if (sesion === null) {
    return null;
  }
  if (sesion.tokenHash !== hashearTokenSesion(par.token)) {
    return null;
  }
  const ahora = new Date();
  const expira = aFecha(sesion.expiraAt);
  const revocada = aFecha(sesion.revocadaAt);
  if (expira === null || revocada !== null || expira.getTime() <= ahora.getTime()) {
    return null;
  }
  const usuario = await buscarUsuarioPorId(sesion.usuarioId).catch(() => null);
  if (usuario === null) {
    return null;
  }
  return { sesionId: sesion.id, usuario };
}

export async function cambiarPassword(
  entrada: unknown,
): Promise<ResultadoCambio> {
  const ahora = new Date();
  const actual = await sesionYUsuarioActual();
  if (actual === null) {
    return { ok: false, codigo: "SESION" };
  }
  const { sesionId, usuario } = actual;
  const sujeto = sujetoPara("cambiar_password", { usuarioId: usuario.id });
  const fila = await leerFilaRateLimit("cambiar_password", sujeto).catch(
    () => null,
  );
  const filaDominio =
    fila === null
      ? null
      : {
          alcance: "cambiar_password" as const,
          sujeto,
          intentos: fila.intentos,
          primerFalloAt: aFecha(fila.primerFalloAt) ?? ahora,
          bloqueadoHasta: aFecha(fila.bloqueadoHasta),
        };
  if (filaDominio !== null && !evaluarIntento(filaDominio, ahora).permitido) {
    return { ok: false, codigo: "BLOQUEADO" };
  }
  const validado = validarCambioPassword(
    {
      actual: leerCampo(entrada, "actual"),
      nueva: leerCampo(entrada, "nueva"),
    },
    usuario.esTemporal,
  );
  if (!validado.ok) {
    if (validado.codigo === "NUEVA_DISTINTA") {
      return {
        ok: false,
        codigo: usuario.esTemporal ? "TEMPORAL_DISTINTA" : "NUEVA_DISTINTA",
      };
    }
    return { ok: false, codigo: "FORMATO" };
  }
  if (!usuario.esTemporal) {
    const coincideActual = await verificarPassword(
      validado.actual,
      usuario.passwordHash,
    );
    if (!coincideActual) {
      const siguiente = siguienteFilaTrasFallo(filaDominio, ahora);
      await guardarFilaRateLimit({
        alcance: "cambiar_password",
        sujeto,
        intentos: siguiente.intentos,
        primerFalloAt: siguiente.primerFalloAt,
        bloqueadoHasta: siguiente.bloqueadoHasta,
      }).catch(() => undefined);
      return { ok: false, codigo: "CREDENCIALES" };
    }
  }
  const esIgualActual = await verificarPassword(
    validado.nueva,
    usuario.passwordHash,
  );
  if (esIgualActual || validado.nueva === validado.actual) {
    return {
      ok: false,
      codigo: usuario.esTemporal ? "TEMPORAL_DISTINTA" : "NUEVA_DISTINTA",
    };
  }
  const hash = await hashearPassword(validado.nueva);
  await actualizarPassword(usuario.id, hash, false).catch(() => undefined);
  await revocarTodasMenosDB(usuario.id, sesionId, ahora).catch(
    () => undefined,
  );
  await eliminarFilaRateLimit("cambiar_password", sujeto).catch(
    () => undefined,
  );
  const retomar = aFecha(usuario.onboardingCompletadoAt) === null;
  return { ok: true, retomarOnboarding: retomar };
}

export async function asignarClaveTemporal(
  usuarioId: string,
  temporal: string,
): Promise<ResultadoCambio> {
  const ahora = new Date();
  const actual = await sesionYUsuarioActual();
  if (actual === null) {
    return { ok: false, codigo: "SESION" };
  }
  const admin = await buscarUsuarioPorId(actual.usuario.id).catch(() => null);
  if (admin === null || admin.rol !== "admin") {
    return { ok: false, codigo: "PERMISO" };
  }
  if (typeof temporal !== "string" || temporal.length < 8) {
    return { ok: false, codigo: "FORMATO" };
  }
  const hash = await hashearPassword(temporal);
  await actualizarPassword(usuarioId, hash, true).catch(() => undefined);
  await revocarTodasDeUsuarioDB(usuarioId, ahora).catch(() => undefined);
  const objetivo = await buscarUsuarioPorId(usuarioId).catch(() => null);
  const norm =
    objetivo !== null && typeof objetivo.usernameNormalizado === "string"
      ? objetivo.usernameNormalizado
      : null;
  if (norm !== null) {
    await eliminarFilaRateLimit("login", norm).catch(() => undefined);
  }
  await eliminarFilaRateLimit("cambiar_password", usuarioId).catch(
    () => undefined,
  );
  return { ok: true };
}
