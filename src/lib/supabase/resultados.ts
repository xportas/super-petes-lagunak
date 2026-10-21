// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import { ordenarJornadasCanonico } from "@/src/lib/dominio/cierre";
import { esVigenteEn } from "@/src/lib/supabase/mapeo";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AlineacionRow,
  AlineacionSeleccionRow,
  JornadaRow,
  JugadorRow,
  ResultadoJugadorRow,
  UsuarioRow,
} from "./tipos";

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

function aJornada(fila: Record<string, unknown>): JornadaRow | null {
  const hora = aFecha(fila["horaPartido"]);
  if (hora === null) {
    return null;
  }
  const estado = fila["estado"];
  if (
    estado !== "pendiente" &&
    estado !== "calculada" &&
    estado !== "papel" &&
    estado !== "invalidada"
  ) {
    return null;
  }
  const id = fila["id"];
  const numeroJornada = fila["numeroJornada"];
  if (typeof id !== "string" || typeof numeroJornada !== "number") {
    return null;
  }
  return {
    id,
    numeroJornada,
    numeroJornadaFnb:
      typeof fila["numeroJornadaFnb"] === "number"
        ? (fila["numeroJornadaFnb"] as number)
        : null,
    rival: typeof fila["rival"] === "string" ? (fila["rival"] as string) : "",
    esLocal: fila["esLocal"] === true,
    campo: typeof fila["campo"] === "string" ? (fila["campo"] as string) : null,
    municipio:
      typeof fila["municipio"] === "string"
        ? (fila["municipio"] as string)
        : null,
    horaPartido: hora,
    estado,
    fnbMatchId:
      typeof fila["fnbMatchId"] === "string"
        ? (fila["fnbMatchId"] as string)
        : null,
    fnbUniversallyId:
      typeof fila["fnbUniversallyId"] === "string"
        ? (fila["fnbUniversallyId"] as string)
        : null,
    marcadorLocal:
      typeof fila["marcadorLocal"] === "number"
        ? (fila["marcadorLocal"] as number)
        : null,
    marcadorVisitante:
      typeof fila["marcadorVisitante"] === "number"
        ? (fila["marcadorVisitante"] as number)
        : null,
    origenResultado:
      fila["origenResultado"] === "manual" || fila["origenResultado"] === "fnb"
        ? (fila["origenResultado"] as "manual" | "fnb")
        : null,
    lastCalendarSync: aFecha(fila["lastCalendarSync"]),
    lastResultSync: aFecha(fila["lastResultSync"]),
  };
}

function aUsuario(fila: Record<string, unknown>): UsuarioRow | null {
  if (typeof fila["id"] !== "string") {
    return null;
  }
  if (typeof fila["username"] !== "string") {
    return null;
  }
  return fila as unknown as UsuarioRow;
}

function aJugador(fila: Record<string, unknown>): JugadorRow | null {
  if (typeof fila["id"] !== "string") {
    return null;
  }
  const fechaAlta = aFecha(fila["fechaAlta"]);
  if (fechaAlta === null) {
    return null;
  }
  return { ...(fila as unknown as JugadorRow), fechaAlta };
}

/**
 * Jornadas en orden cronológico canónico (hora_partido ASC, numero_jornada ASC).
 * Solo lectura; sin scoring dentro.
 */
export async function leerJornadasOrdenadas(
  cliente?: SupabaseClient,
): Promise<JornadaRow[]> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db.from("jornada").select("*")) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[resultados] jornada: ${error.message}`);
  }
  const filas = ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((f) => aJornada(f))
    .filter((j): j is JornadaRow => j !== null);
  const claves = filas.map((j) => ({
    jornadaId: j.id,
    numeroJornada: j.numeroJornada,
    horaPartido: j.horaPartido,
    estado: j.estado,
  }));
  const ordenadas = ordenarJornadasCanonico(claves);
  const porId = new Map(filas.map((j) => [j.id, j] as const));
  return ordenadas.map((o) => porId.get(o.jornadaId) as JornadaRow);
}

export interface AlineacionDe {
  readonly alineacion: AlineacionRow;
  readonly selecciones: readonly AlineacionSeleccionRow[];
}

/**
 * Alineación guardada de un manager en una jornada, o null si no envió.
 * Sin scoring dentro; la interpretación (−10, rachas) la hace la capa pura.
 */
export async function leerAlineacionDe(
  managerId: string,
  jornadaId: string,
  cliente?: SupabaseClient,
): Promise<AlineacionDe | null> {
  const db = cliente ?? obtenerClienteService();
  const { data: aline, error } = (await db
    .from("alineacion")
    .select("*")
    .eq("managerId", managerId)
    .eq("jornadaId", jornadaId)
    .maybeSingle()) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[resultados] alineacion: ${error.message}`);
  }
  if (aline === null || aline === undefined) {
    return null;
  }
  const { data: sels, error: errorSel } = (await db
    .from("alineacion_seleccion")
    .select("*")
    .eq("alineacionId", (aline as AlineacionRow).id)) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (errorSel) {
    throw new Error(`[resultados] alineacion_seleccion: ${errorSel.message}`);
  }
  return {
    alineacion: aline as AlineacionRow,
    selecciones: ((sels ?? []) as unknown as Array<AlineacionSeleccionRow>),
  };
}

/**
 * Acta cruda de una jornada (valoraciones por jugador). Null ausente se
 * representa con filas vacías: el dato ausente lo detecta el motor §0.
 */
export async function leerActaDe(
  jornadaId: string,
  cliente?: SupabaseClient,
): Promise<ResultadoJugadorRow[]> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db
    .from("resultado_jugador")
    .select("*")
    .eq("jornadaId", jornadaId)) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[resultados] resultado_jugador: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .filter((r) => typeof r["jornadaId"] === "string")
    .map((r) => r as unknown as ResultadoJugadorRow);
}

/**
 * Managers elegibles para la General (excluye Admin semilla, que no juega).
 */
export async function leerManagersElegibles(
  cliente?: SupabaseClient,
): Promise<UsuarioRow[]> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db.from("usuario").select("*")) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[resultados] usuario: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((f) => aUsuario(f))
    .filter((u): u is UsuarioRow => u !== null && u.rol !== "admin");
}

/**
 * Plantilla vigente en un cierre (alta <= cierre < baja).
 * Reusa esVigenteEn sin duplicar la regla.
 */
export async function leerPlantillaVigenteEn(
  cierre: Date,
  cliente?: SupabaseClient,
): Promise<JugadorRow[]> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db.from("jugador").select("*")) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[resultados] jugador: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((f) => aJugador(f))
    .filter(
      (j): j is JugadorRow =>
        j !== null && esVigenteEn(j.fechaAlta, j.fechaBaja, cierre),
    );
}
