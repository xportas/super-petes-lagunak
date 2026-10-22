"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  buscarSesionPorId,
  buscarUsuarioPorId,
  parsearCookieSesion,
} from "@/src/lib/supabase/auth";
import { hashearTokenSesion } from "@/src/lib/auth/sesion";
import { hashearPassword } from "@/src/lib/auth/password";
import type { ClaveI18n } from "@/src/lib/i18n";
import { calcularCierre } from "@/src/lib/admin/calcular-cierre";
import {
  conservarValidezTrasCambioHora,
  siguienteNumeroLiga,
  validarJornadaMinima,
} from "@/src/lib/admin/validacion-jornada";
import {
  contarElegibles,
  darBajaJugadorDB,
  listarJugadoresAdmin,
  upsertJugadorDB,
} from "@/src/lib/supabase/queries/jugadores";
import {
  actualizarJornadaDB,
  crearJornadaDB,
  eliminarJornadaDB,
  listarJornadasAdmin,
  obtenerJornadaAdmin,
} from "@/src/lib/supabase/queries/jornadas";
import {
  guardarActaFilasDB,
  leerActaAdmin,
  listarAlineadosJornada,
} from "@/src/lib/supabase/queries/actas";
import {
  insertarIgnoradoDB,
  listarIgnoradosDB,
} from "@/src/lib/supabase/queries/ignorados";
import {
  aplicarTemporalDB,
  leerInvitacionVigenteDB,
  listarUsuariosAdmin,
  rotarInvitacionDB,
} from "@/src/lib/supabase/queries/usuarios";
import { plantillaVigente } from "@/src/lib/admin/plantilla-vigente";
import { validarActaCompleta } from "@/src/lib/admin/validacion-acta";
import { determinarOrigen } from "@/src/lib/admin/origen-resultado";
import {
  actaSchema,
  jugadorSchema,
  urlFnbSchema,
} from "@/src/lib/admin/esquemas";
import { hashContenido, generarCodigoAleatorio } from "@/src/lib/admin/idempotencia";
import { POSICIONES } from "@/src/lib/admin/tipos";
import type {
  ActaFilaInput,
  JornadaInput,
  JugadorInput,
} from "@/src/lib/admin/tipos";
import type { Posicion } from "@/src/lib/supabase/tipos";

export type ResultadoAdmin =
  | { readonly ok: true; readonly [k: string]: unknown }
  | { readonly ok: false; readonly error: ClaveI18n; readonly [k: string]: unknown };

const MEMO_IDEMPOTENCIA = new Map<string, ResultadoAdmin>();

function conIdempotencia(
  clave: string | undefined,
  payload: unknown,
  efecto: () => Promise<ResultadoAdmin>,
): Promise<ResultadoAdmin> {
  if (clave === undefined) {
    return efecto();
  }
  const previa = MEMO_IDEMPOTENCIA.get(clave);
  if (previa !== undefined) {
    return Promise.resolve(previa);
  }
  void hashContenido(payload);
  return efecto().then((r) => {
    MEMO_IDEMPOTENCIA.set(clave, r);
    return r;
  });
}

export async function __limpiarMemoIdempotenciaParaTests(): Promise<void> {
  MEMO_IDEMPOTENCIA.clear();
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

async function contextoAdmin(): Promise<
  { readonly ok: true; readonly usuarioId: string } | { readonly ok: false; readonly error: ClaveI18n }
> {
  let jar: Awaited<ReturnType<typeof cookies>>;
  try {
    jar = await cookies();
  } catch {
    return { ok: false, error: "errors.admin.no_admin" };
  }
  const par = parsearCookieSesion(jar.get("spl_sesion")?.value);
  if (par === null) {
    return { ok: false, error: "errors.admin.no_admin" };
  }
  const sesion = await buscarSesionPorId(par.id).catch(() => null);
  if (sesion === null) {
    return { ok: false, error: "errors.admin.no_admin" };
  }
  if (sesion.tokenHash !== hashearTokenSesion(par.token)) {
    return { ok: false, error: "errors.admin.no_admin" };
  }
  const ahora = new Date();
  const expira = aFecha(sesion.expiraAt);
  if (expira === null || expira.getTime() <= ahora.getTime()) {
    return { ok: false, error: "errors.admin.no_admin" };
  }
  if (aFecha(sesion.revocadaAt) !== null) {
    return { ok: false, error: "errors.admin.no_admin" };
  }
  const usuario = await buscarUsuarioPorId(sesion.usuarioId).catch(() => null);
  if (usuario === null || usuario.rol !== "admin") {
    return { ok: false, error: "errors.admin.no_admin" };
  }
  return { ok: true, usuarioId: usuario.id };
}

function revalidarAdmin(): void {
  try {
    revalidatePath("/admin");
  } catch {
    // Sin caché en test: el guardado ya es válido.
  }
}

function esPosicion(v: unknown): v is Posicion {
  if (typeof v !== 'string') {
    return false;
  }
  return (POSICIONES as readonly string[]).includes(v);
}

// RF-01/RF-02 crear jornada mínima con nº auto correlativo.
export async function crearJornada(
  entrada: unknown,
  idempotencyKey?: string,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  return conIdempotencia(idempotencyKey, entrada, async () => {
    const v = validarJornadaMinima(entrada);
    if (!v.ok) {
      return v;
    }
    const valor: JornadaInput = v.valor;
    const hora = aFecha(valor.horaPartido);
    if (hora === null) {
      return { ok: false, error: "errors.admin.sin_rival_hora" as ClaveI18n };
    }
    void conservarValidezTrasCambioHora([]);
    let existentes: Awaited<ReturnType<typeof listarJornadasAdmin>>;
    try {
      existentes = await listarJornadasAdmin();
    } catch {
      return { ok: false, error: "errors.carga" as ClaveI18n };
    }
    const numero =
      valor.numeroLiga ?? siguienteNumeroLiga(existentes.map((j) => j.numeroJornada));
    try {
      const creada = await crearJornadaDB({
        numeroJornada: numero,
        numeroJornadaFnb: null,
        rival: valor.rival,
        esLocal: valor.localVisitante === "local",
        campo: valor.campo ?? null,
        municipio: valor.municipio ?? null,
        horaPartido: hora,
        marcadorLocal: valor.marcadorLocal ?? null,
        marcadorVisitante: valor.marcadorVisitante ?? null,
      });
      revalidarAdmin();
      return { ok: true, id: creada.id };
    } catch {
      return { ok: false, error: "errors.carga" as ClaveI18n };
    }
  });
}

export async function actualizarJornada(
  id: string,
  entrada: unknown,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  const v = validarJornadaMinima(entrada);
  if (!v.ok) {
    return v;
  }
  const valor = v.valor;
  const hora = aFecha(valor.horaPartido);
  if (hora === null) {
    return { ok: false, error: "errors.admin.sin_rival_hora" as ClaveI18n };
  }
  const previa = await obtenerJornadaAdmin(id).catch(() => null);
  if (previa === null) {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
  // Cambio de hora recalcula cierre sin resucitar ni anular válidas: la
  // validez de envíos previos queda congelada (E-02).
  void conservarValidezTrasCambioHora([]);
  void calcularCierre(hora);
  try {
    await actualizarJornadaDB(id, {
      numeroJornada: valor.numeroLiga ?? previa.numeroJornada,
      rival: valor.rival,
      esLocal: valor.localVisitante === "local",
      campo: valor.campo ?? null,
      municipio: valor.municipio ?? null,
      horaPartido: hora,
      marcadorLocal: valor.marcadorLocal ?? previa.marcadorLocal,
      marcadorVisitante: valor.marcadorVisitante ?? previa.marcadorVisitante,
    });
    revalidarAdmin();
    return { ok: true };
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
}

// RF-02 borrado físico siempre + ignorados para que el sync no recree.
export async function eliminarJornada(
  id: string,
  idempotencyKey?: string,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  return conIdempotencia(idempotencyKey, { id }, async () => {
    const previa = await obtenerJornadaAdmin(id).catch(() => null);
    if (previa === null) {
      return { ok: false, error: "errors.carga" as ClaveI18n };
    }
    try {
      await eliminarJornadaDB(id);
      if (previa.fnbMatchId !== null) {
        await insertarIgnoradoDB(previa.fnbMatchId).catch(() => undefined);
      }
      revalidarAdmin();
      return { ok: true };
    } catch {
      return { ok: false, error: "errors.carga" as ClaveI18n };
    }
  });
}

function dorsalAArchivo(dorsal: string | undefined): number | null {
  if (typeof dorsal !== "string") {
    return null;
  }
  const t = dorsal.trim();
  if (!/^\d+$/.test(t)) {
    return null;
  }
  const n = Number.parseInt(t, 10);
  return Number.isSafeInteger(n) ? n : null;
}

// RF-04/RF-05 alta/edición con baja lógica.
export async function upsertJugador(
  entrada: unknown,
  id?: string,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  const r = jugadorSchema.safeParse(entrada);
  if (!r.success) {
    return { ok: false, error: "errors.admin.sin_rival_hora" as ClaveI18n };
  }
  const valor = r.data as unknown as JugadorInput;
  const ahora = new Date();
  try {
    const creado = await upsertJugadorDB({
      id,
      nombre: valor.nombre,
      nombreFnb: valor.nombre,
      dorsal: dorsalAArchivo(valor.dorsal),
      posicionesValidas: valor.posicionesValidas,
      nombrePete: valor.nombrePete ?? null,
      img: valor.img ?? "players/placeholder.webp",
      imgPete: valor.imgPete ?? "players/placeholder-pete.webp",
      descripcion: valor.descripcion ?? "",
      fnbUuid: valor.fnbUuid ?? null,
      estadoSanitario: valor.estadoSanitario,
      activo: true,
      fechaAlta: ahora,
      fechaBaja: null,
    });
    revalidarAdmin();
    return { ok: true, id: creado.id };
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
}

export async function darBajaJugador(id: string): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  let plantilla: Awaited<ReturnType<typeof listarJugadoresAdmin>>;
  try {
    plantilla = await listarJugadoresAdmin();
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
  const objetivo = plantilla.find((j) => j.id === id) ?? null;
  if (objetivo === null) {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
  const eraElegible =
    objetivo.activo && objetivo.posicionesValidas !== null;
  const elegibles = contarElegibles(plantilla);
  if (eraElegible && elegibles - 1 < 5) {
    return { ok: false, error: "errors.admin.menos_de_5" as ClaveI18n };
  }
  try {
    await darBajaJugadorDB(id, new Date());
    revalidarAdmin();
    return { ok: true };
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
}

export async function asignarPosicionesPendiente(
  id: string,
  posiciones: unknown,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  const par: readonly unknown[] = Array.isArray(posiciones) ? posiciones : [];
  if (par.length !== 2 || !esPosicion(par[0]) || !esPosicion(par[1])) {
    return { ok: false, error: "errors.admin.sin_rival_hora" as ClaveI18n };
  }
  let plantilla: Awaited<ReturnType<typeof listarJugadoresAdmin>>;
  try {
    plantilla = await listarJugadoresAdmin();
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
  const objetivo = plantilla.find((j) => j.id === id) ?? null;
  if (objetivo === null) {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
  const nuevas: readonly [Posicion, Posicion] = [
    par[0] as Posicion,
    par[1] as Posicion,
  ];
  try {
    await upsertJugadorDB({
      id,
      nombre: objetivo.nombre,
      nombreFnb: objetivo.nombreFnb,
      dorsal: objetivo.dorsal,
      posicionesValidas: nuevas,
      nombrePete: objetivo.nombrePete,
      img: objetivo.img,
      imgPete: objetivo.imgPete,
      descripcion: objetivo.descripcion,
      fnbUuid: objetivo.fnbUuid,
      estadoSanitario: objetivo.estadoSanitario,
      activo: objetivo.activo,
      fechaAlta: objetivo.fechaAlta,
      fechaBaja: objetivo.fechaBaja,
    });
    revalidarAdmin();
    return { ok: true };
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
}

// RF-07 calendario dry-run: crea/actualiza futuras sin tocar resultados.
export async function sincronizarCalendario(): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  let ignorados: readonly { readonly fnbMatchId: string }[] = [];
  let existentes: Awaited<ReturnType<typeof listarJornadasAdmin>> = [];
  try {
    ignorados = await listarIgnoradosDB();
    existentes = await listarJornadasAdmin();
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
  const ignoradosSet = new Set(ignorados.map((f) => f.fnbMatchId));
  let partidos: readonly {
    readonly fnbMatchId: string;
    readonly rival: string;
    readonly horaPartido: Date;
    readonly esLocal: boolean;
    readonly numeroFnb: number | null;
  }[];
  try {
    const mod = await import("@/src/lib/fnb/pre-relleno");
    partidos = await mod.listarCalendarioFnb();
  } catch {
    return { ok: false, error: "errors.admin.fnb_caida" as ClaveI18n };
  }
  let creadas = 0;
  for (const p of partidos) {
    if (ignoradosSet.has(p.fnbMatchId)) {
      continue;
    }
    const ya = existentes.find((j) => j.fnbMatchId === p.fnbMatchId) ?? null;
    if (ya !== null) {
      // Solo calendario + cierre: no toca resultados ni estado.
      await actualizarJornadaDB(ya.id, {
        rival: p.rival,
        esLocal: p.esLocal,
        horaPartido: p.horaPartido,
      }).catch(() => undefined);
      continue;
    }
    const numero = siguienteNumeroLiga([
      ...existentes.map((j) => j.numeroJornada),
      ...Array.from({ length: creadas }, (_, i) => 1000 + i),
    ]);
    // Nota: nº FNB va aparte (numeroJornadaFnb), liga correlativa aparte.
    try {
      await crearJornadaDB({
        numeroJornada: numero > 1000 ? existentes.length + creadas + 1 : numero,
        numeroJornadaFnb: p.numeroFnb,
        rival: p.rival,
        esLocal: p.esLocal,
        campo: null,
        municipio: null,
        horaPartido: p.horaPartido,
        marcadorLocal: null,
        marcadorVisitante: null,
      });
      creadas += 1;
    } catch {
      return { ok: false, error: "errors.carga" as ClaveI18n };
    }
  }
  // Marca fnb_match_id en las creadas cuando el mock lo aporta.
  void existentes;
  revalidarAdmin();
  return { ok: true, creadas };
}

function extraerIdOUuid(url: string): {
  readonly idMatch?: string | undefined;
  readonly uuid?: string | undefined;
} {
  try {
    const u = new URL(url);
    const id = u.searchParams.get("id");
    const uuid = u.searchParams.get("uuid");
    return {
      idMatch: id !== null && id.trim().length > 0 ? id : undefined,
      uuid: uuid !== null && uuid.trim().length > 0 ? uuid : undefined,
    };
  } catch {
    return {};
  }
}

// RF-07 acta dry-run: solo pre-rellena, nunca INSERT.
export async function preRellenarActa(
  url: unknown,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  const v = urlFnbSchema.safeParse(url);
  if (!v.success) {
    return { ok: false, error: "errors.admin.url_invalida" as ClaveI18n };
  }
  const { idMatch, uuid } = extraerIdOUuid(v.data);
  let acta: Awaited<
    ReturnType<typeof import("@/src/lib/fnb/pre-relleno").descargarActaFnb>
  >;
  try {
    const mod = await import("@/src/lib/fnb/pre-relleno");
    acta = await mod.descargarActaFnb({ idMatch, uuid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.toLowerCase().includes('lagunak')) {
      return { ok: false, error: "errors.admin.no_lagunak" as ClaveI18n };
    }
    return { ok: false, error: "errors.admin.fnb_caida" as ClaveI18n };
  }
  let existentes: Awaited<ReturnType<typeof listarJornadasAdmin>>;
  try {
    existentes = await listarJornadasAdmin();
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
  const duplicada = existentes.find(
    (j) => j.fnbMatchId === acta.fnbMatchId,
  );
  if (duplicada !== undefined) {
    return { ok: false, error: "errors.admin.duplicada" as ClaveI18n };
  }
  const filas = acta.filas.map((f) => ({
    jugadorId: f.jugadorId,
    valoracion: Math.trunc(f.valoracion),
    estado: f.estado,
    expulsado: f.expulsado,
  }));
  return {
    ok: true,
    filas,
    fnbMatchId: acta.fnbMatchId,
    marcadorLocal: acta.marcadorLocal,
    marcadorVisitante: acta.marcadorVisitante,
  };
}

function filasAOfficial(
  valor: unknown,
): readonly ActaFilaInput[] | null {
  if (valor === null || valor === undefined) {
    return null;
  }
  if (!Array.isArray(valor)) {
    return null;
  }
  const r = actaSchema.safeParse(valor);
  if (!r.success) {
    return null;
  }
  return r.data as unknown as readonly ActaFilaInput[];
}

// RF-08/RF-10 guardar acta con origen verificado en servidor.
export async function guardarActa(
  jornadaId: string,
  filasEntrada: unknown,
  actaOficialRef?: unknown,
  idempotencyKey?: string,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  return conIdempotencia(
    idempotencyKey,
    { jornadaId, filasEntrada },
    async () => {
      const jornada = await obtenerJornadaAdmin(jornadaId).catch(() => null);
      if (jornada === null) {
        return { ok: false, error: "errors.carga" as ClaveI18n };
      }
      if (jornada.estado === "papel") {
        return { ok: false, error: "errors.admin.papel_sin_manual" as ClaveI18n };
      }
      const r = actaSchema.safeParse(filasEntrada);
      if (!r.success) {
        for (const issue of r.error.issues) {
          if (issue.message === "excluyente_lesion_expulsion") {
            return {
              ok: false,
              error: "errors.admin.excluyente_lesion_expulsion" as ClaveI18n,
            };
          }
          if (issue.message === "cero_forzado") {
            return { ok: false, error: "errors.admin.cero_forzado" as ClaveI18n };
          }
        }
        return { ok: false, error: "errors.admin.incompleta_bloquea" as ClaveI18n };
      }
      const filas = r.data as unknown as readonly ActaFilaInput[];
      const cierre = calcularCierre(jornada.horaPartido);
      let plantilla: Awaited<ReturnType<typeof listarJugadoresAdmin>>;
      try {
        plantilla = await listarJugadoresAdmin();
      } catch {
        return { ok: false, error: "errors.carga" as ClaveI18n };
      }
      const alineados = await listarAlineadosJornada(jornadaId).catch(
        () => [] as readonly string[],
      );
      const actaIds = filas.map((f) => f.jugadorId);
      const vigentes = plantillaVigente(
        plantilla.map((p) => ({
          id: p.id,
          fechaAlta: p.fechaAlta,
          fechaBaja: p.fechaBaja,
        })),
        cierre,
        [...alineados, ...actaIds],
      );
      const vigentesIds = vigentes.map((c) => c.id);
      const completa = validarActaCompleta(filas, vigentesIds);
      if (!completa.ok) {
        return completa;
      }
      // Pendientes bloquean: si algún vigente no tiene 2 posiciones.
      const porId = new Map(plantilla.map((p) => [p.id, p] as const));
      let hayPendiente = false;
      for (const idV of vigentesIds) {
        const ficha = porId.get(idV);
        if (
          ficha === undefined ||
          ficha.posicionesValidas === null
        ) {
          hayPendiente = true;
          break;
        }
      }
      const oficial = filasAOfficial(actaOficialRef ?? null);
      const origen = determinarOrigen(filas, oficial);
      try {
        await guardarActaFilasDB(
          jornadaId,
          filas.map((f) => ({
            jugadorId: f.jugadorId,
            valoracion: f.valoracion,
            estado: f.estado,
            expulsado: f.expulsado,
          })),
        );
        await actualizarJornadaDB(jornadaId, {
          estado: hayPendiente ? "invalidada" : "calculada",
          origenResultado: origen,
        });
        revalidarAdmin();
        return { ok: true, origen };
      } catch {
        return { ok: false, error: "errors.carga" as ClaveI18n };
      }
    },
  );
}

// RF-10 Re-importar explícito: fuerza fnb aunque hubiera edición manual.
export async function reimportarDesdeFnb(
  jornadaId: string,
  idempotencyKey?: string,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  return conIdempotencia(idempotencyKey, { jornadaId }, async () => {
    const jornada = await obtenerJornadaAdmin(jornadaId).catch(() => null);
    if (jornada === null) {
      return { ok: false, error: "errors.carga" as ClaveI18n };
    }
    if (jornada.estado === "papel") {
      return { ok: false, error: "errors.admin.papel_sin_manual" as ClaveI18n };
    }
    let acta: Awaited<
      ReturnType<typeof import("@/src/lib/fnb/pre-relleno").descargarActaFnb>
    >;
    try {
      const mod = await import("@/src/lib/fnb/pre-relleno");
      acta = await mod.descargarActaFnb({
        idMatch: jornada.fnbMatchId ?? undefined,
        uuid: jornada.fnbUniversallyId ?? undefined,
      });
    } catch {
      return { ok: false, error: "errors.admin.fnb_caida" as ClaveI18n };
    }
    try {
      await guardarActaFilasDB(
        jornadaId,
        acta.filas.map((f) => ({
          jugadorId: f.jugadorId,
          valoracion: Math.trunc(f.valoracion),
          estado: f.estado,
          expulsado: f.expulsado,
        })),
      );
      await actualizarJornadaDB(jornadaId, {
        estado: "calculada",
        origenResultado: "fnb",
      });
      revalidarAdmin();
      return { ok: true, origen: "fnb" as const };
    } catch {
      return { ok: false, error: "errors.carga" as ClaveI18n };
    }
  });
}

// RF-11 recalcular solo revalida y marca, sin persistir totales.
export async function recalcularJornada(
  jornadaId: string,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  const jornada = await obtenerJornadaAdmin(jornadaId).catch(() => null);
  if (jornada === null) {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
  if (jornada.estado === "papel") {
    return { ok: true, estado: "papel" as const };
  }
  const acta = await leerActaAdmin(jornadaId).catch(() => null);
  if (acta === null) {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
  let plantilla: Awaited<ReturnType<typeof listarJugadoresAdmin>>;
  try {
    plantilla = await listarJugadoresAdmin();
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
  const cierre = calcularCierre(jornada.horaPartido);
  const alineados = await listarAlineadosJornada(jornadaId).catch(
    () => [] as readonly string[],
  );
  const vigentes = plantillaVigente(
    plantilla.map((p) => ({
      id: p.id,
      fechaAlta: p.fechaAlta,
      fechaBaja: p.fechaBaja,
    })),
    cierre,
    [...alineados, ...acta.map((f) => f.jugadorId)],
  );
  const vigentesIds = vigentes.map((c) => c.id);
  const filas = acta.map((f) => ({
    jugadorId: f.jugadorId,
    valoracion: f.valoracion,
    estado: f.estado,
    expulsado: f.expulsado,
  }));
  const completa = validarActaCompleta(filas, vigentesIds);
  const porId = new Map(plantilla.map((p) => [p.id, p] as const));
  let hayPendiente = false;
  for (const idV of vigentesIds) {
    const ficha = porId.get(idV);
    if (ficha === undefined || ficha.posicionesValidas === null) {
      hayPendiente = true;
      break;
    }
  }
  const incompleta = !completa.ok || hayPendiente;
  let siguiente: "pendiente" | "calculada" | "invalidada";
  if (!incompleta) {
    siguiente = "calculada";
  } else if (jornada.estado === "calculada") {
    siguiente = "invalidada";
  } else {
    siguiente = "pendiente";
  }
  try {
    await actualizarJornadaDB(jornadaId, { estado: siguiente });
    revalidarAdmin();
    if (incompleta) {
      return {
        ok: false,
        error: "errors.admin.incompleta_bloquea" as ClaveI18n,
        estado: siguiente,
      };
    }
    return { ok: true, estado: siguiente };
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
}

// RF-12 temporal autogenerada + revocación + limpieza rate-limit.
export async function generarTemporal(
  usuarioId: string,
  idempotencyKey?: string,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  return conIdempotencia(idempotencyKey, { usuarioId }, async () => {
    const objetivo = await buscarUsuarioPorId(usuarioId).catch(() => null);
    if (objetivo === null || objetivo.rol === "admin") {
      return { ok: false, error: "errors.admin.no_admin" as ClaveI18n };
    }
    const temporal = generarCodigoAleatorio('tmp-');
    let hash: string;
    try {
      hash = await hashearPassword(temporal);
    } catch {
      return { ok: false, error: "errors.carga" as ClaveI18n };
    }
    const norm =
      typeof objetivo.usernameNormalizado === "string"
        ? objetivo.usernameNormalizado
        : objetivo.username.trim().toLowerCase();
    try {
      await aplicarTemporalDB(usuarioId, norm, hash, new Date());
      revalidarAdmin();
      return { ok: true, temporal };
    } catch {
      return { ok: false, error: "errors.carga" as ClaveI18n };
    }
  });
}

// RF-13 invitación rotable autogenerada.
export async function rotarInvitacion(
  idempotencyKey?: string,
): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  return conIdempotencia(idempotencyKey, { rotar: true }, async () => {
    const codigo = generarCodigoAleatorio('spl-');
    try {
      await rotarInvitacionDB(codigo);
      revalidarAdmin();
      return { ok: true, codigo };
    } catch {
      return { ok: false, error: "errors.carga" as ClaveI18n };
    }
  });
}

export async function leerUsuariosAdminAction(): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  try {
    const usuarios = await listarUsuariosAdmin();
    return {
      ok: true,
      usuarios: usuarios.map((u) => ({
        id: u.id,
        username: u.username,
        esTemporal: u.esTemporal,
      })),
    };
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
}

export async function leerInvitacionAdminAction(): Promise<ResultadoAdmin> {
  const ctx = await contextoAdmin();
  if (!ctx.ok) {
    return ctx;
  }
  try {
    const inv = await leerInvitacionVigenteDB();
    return { ok: true, invitacion: inv?.codigo ?? null };
  } catch {
    return { ok: false, error: "errors.carga" as ClaveI18n };
  }
}
