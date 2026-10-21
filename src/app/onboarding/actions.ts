"use server";

import { cookies } from "next/headers";
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import {
  NOMBRE_COOKIE_SESION,
  actualizarOnboarding,
  buscarSesionPorId,
  buscarUsuarioPorId,
  parsearCookieSesion,
} from "@/src/lib/supabase/auth";
import { hashearTokenSesion } from "@/src/lib/auth/sesion";
import { validarCierre, ordenarJornadasCanonico } from "@/src/lib/dominio/cierre";
import { validarQuinteto } from "@/src/lib/dominio/validar-quinteto";
import { esquemaConfirmarPaso2 } from "@/src/lib/auth/esquemas";
import type { Posicion } from "@/src/lib/scoring/tipos";

interface ResultadoOnboarding {
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

async function usuarioDeSesion(): Promise<
  { readonly id: string; readonly rol: string } | null
> {
  const jar = await cookies();
  const par = parsearCookieSesion(jar.get(NOMBRE_COOKIE_SESION)?.value);
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

export async function guardarQuintetoOnboarding(
  entrada: unknown,
): Promise<ResultadoOnboarding> {
  const ahora = new Date();
  const ctx = await usuarioDeSesion();
  if (ctx === null) {
    return { ok: false, codigo: "SESION" };
  }
  if (ctx.rol === "admin") {
    return { ok: false, codigo: "ADMIN" };
  }
  const db = obtenerClienteService();
  const { data: jornadas } = await db.from("jornada").select("*");
  const lista = ((jornadas ?? []) as Array<{
    readonly id: string;
    readonly numeroJornada: number;
    readonly horaPartido: string | Date;
    readonly estado: string;
  }>)
    .map((j) => ({
      jornadaId: j.id,
      numeroJornada: j.numeroJornada,
      horaPartido: aFecha(j.horaPartido),
      estado: j.estado as "pendiente" | "calculada" | "papel" | "invalidada",
    }))
    .filter((j) => j.horaPartido !== null);
  const ordenadas = ordenarJornadasCanonico(
    lista as Array<{
      readonly jornadaId: string;
      readonly numeroJornada: number;
      readonly horaPartido: Date;
      readonly estado: "pendiente" | "calculada" | "papel" | "invalidada";
    }>,
  );
  const proxima = ordenadas.find(
    (j) =>
      j.estado === "pendiente" &&
      validarCierre(j.horaPartido, ahora).abierto,
  );
  if (proxima === undefined) {
    return { ok: false, codigo: "SIN_JORNADA" };
  }
  if (!validarCierre(proxima.horaPartido, ahora).abierto) {
    return { ok: false, codigo: "CIERRE" };
  }
  const { data: jugadores } = await db
    .from("jugador")
    .select("id,activo,posicionesValidas")
    .eq("activo", true);
  const plantilla = new Map<
    string,
    { readonly activo: boolean; readonly posicionesValidas: readonly [Posicion, Posicion] | null }
  >();
  for (const j of (jugadores ?? []) as Array<{
    readonly id: string;
    readonly activo: boolean;
    readonly posicionesValidas: readonly [Posicion, Posicion] | null;
  }>) {
    plantilla.set(j.id, {
      activo: j.activo,
      posicionesValidas: j.posicionesValidas,
    });
  }
  const validado = validarQuinteto(entrada, plantilla);
  if (!validado.ok) {
    return { ok: false, codigo: "ALINEACION" };
  }
  if (!validarCierre(proxima.horaPartido, new Date()).abierto) {
    return { ok: false, codigo: "CIERRE" };
  }
  const quinteto = validado.valor;
  await db
    .from("alineacion")
    .delete()
    .eq("managerId", ctx.id)
    .eq("jornadaId", proxima.jornadaId);
  const { data: creada, error } = await db
    .from("alineacion")
    .insert({
      managerId: ctx.id,
      jornadaId: proxima.jornadaId,
      entrenador: quinteto.entrenador,
      capitanJugadorId: quinteto.capitanId,
      instanteInicio: ahora.toISOString(),
    })
    .select("id")
    .single();
  if (error || creada === null) {
    return { ok: false, codigo: "ALINEACION" };
  }
  const id = (creada as { readonly id: string }).id;
  const filas = quinteto.jugadorIds.map((jugadorId) => ({
    alineacionId: id,
    jugadorId,
    posicionAlineada: quinteto.posicionPorJugador[jugadorId],
  }));
  const { error: errorSel } = await db
    .from("alineacion_seleccion")
    .insert(filas);
  if (errorSel) {
    await db.from("alineacion").delete().eq("id", id);
    return { ok: false, codigo: "ALINEACION" };
  }
  await actualizarOnboarding(ctx.id, 2, null).catch(() => undefined);
  return { ok: true };
}

export async function confirmarPaso2(
  entrada: unknown,
): Promise<ResultadoOnboarding> {
  const ctx = await usuarioDeSesion();
  if (ctx === null) {
    return { ok: false, codigo: "SESION" };
  }
  const parsed = esquemaConfirmarPaso2.safeParse(entrada);
  if (!parsed.success) {
    return { ok: false, codigo: "FORMATO" };
  }
  const usuario = await buscarUsuarioPorId(ctx.id).catch(() => null);
  if (usuario === null) {
    return { ok: false, codigo: "SESION" };
  }
  if (aFecha(usuario.onboardingCompletadoAt) !== null) {
    return { ok: true };
  }
  await actualizarOnboarding(ctx.id, 2, new Date()).catch(() => undefined);
  return { ok: true };
}
