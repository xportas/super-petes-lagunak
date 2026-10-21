"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  buscarSesionPorId,
  buscarUsuarioPorId,
  parsearCookieSesion,
} from "@/src/lib/supabase/auth";
import { hashearTokenSesion } from "@/src/lib/auth/sesion";
import { calcularCierre } from "@/src/lib/dominio/cierre";
import {
  getJornadaPorId,
  getPlantillaPorIds,
  upsertAlineacion,
} from "@/src/lib/supabase/queries/alineaciones";
import {
  GuardarAlineacionSchema,
  SLOTS_FIJOS,
} from "./_lib/validacion-equipo";

export type ResultadoGuardar =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

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

async function usuarioDeSesion(): Promise<
  { readonly id: string; readonly rol: string } | null
> {
  const jar = await cookies();
  const par = parsearCookieSesion(jar.get("spl_sesion")?.value);
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
  if (expira === null || expira.getTime() <= ahora.getTime()) {
    return null;
  }
  if (aFecha(sesion.revocadaAt) !== null) {
    return null;
  }
  const usuario = await buscarUsuarioPorId(sesion.usuarioId).catch(() => null);
  if (usuario === null) {
    return null;
  }
  return { id: usuario.id, rol: usuario.rol };
}

export async function guardarAlineacion(
  entrada: unknown,
): Promise<ResultadoGuardar> {
  const ahora = new Date();
  const ctx = await usuarioDeSesion();
  if (ctx === null) {
    return { ok: false, error: "SESION" };
  }
  if (ctx.rol === "admin") {
    return { ok: false, error: "errors.admin.no_juega" };
  }
  const parsed = GuardarAlineacionSchema.safeParse(entrada);
  if (!parsed.success) {
    for (const problema of parsed.error.issues) {
      if (problema.message === "duplicado") {
        return { ok: false, error: "errors.equipo.duplicado" };
      }
      if (problema.message === "capitan_fuera") {
        return { ok: false, error: "errors.equipo.capitan_fuera" };
      }
    }
    return { ok: false, error: "errors.equipo.incompleto" };
  }
  const valor = parsed.data;
  let jornada = null;
  try {
    jornada = await getJornadaPorId(valor.jornadaId);
  } catch {
    return { ok: false, error: "errors.equipo.red" };
  }
  if (jornada === null) {
    return { ok: false, error: "errors.equipo.incompleto" };
  }
  const cierre = calcularCierre(jornada.horaPartido);
  if (!(ahora.getTime() < cierre.getTime())) {
    return { ok: false, error: "errors.close.passed" };
  }
  const ids = SLOTS_FIJOS.map((slot) => valor.slots[slot]);
  let plantilla = null;
  try {
    plantilla = await getPlantillaPorIds(ids);
  } catch {
    return { ok: false, error: "errors.equipo.red" };
  }
  for (const id of ids) {
    const ficha = plantilla.get(id);
    if (
      ficha === undefined ||
      !ficha.activo ||
      ficha.posicionesValidas === null ||
      ficha.posicionesValidas.length !== 2
    ) {
      return { ok: false, error: "errors.equipo.no_elegible" };
    }
  }
  if (!(new Date().getTime() < calcularCierre(jornada.horaPartido).getTime())) {
    return { ok: false, error: "errors.close.passed" };
  }
  try {
    await upsertAlineacion({
      managerId: ctx.id,
      jornadaId: valor.jornadaId,
      entrenador: valor.entrenadorId,
      capitanId: valor.capitanId,
      slots: valor.slots,
      instanteInicio: ahora,
    });
  } catch {
    return { ok: false, error: "errors.equipo.red" };
  }
  try {
    revalidatePath("/equipo");
  } catch {
    // Sin caché disponible en test: el guardado ya es válido.
  }
  return { ok: true };
}
