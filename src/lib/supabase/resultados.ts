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

function v(fila: Record<string, unknown>, snake: string, camel: string): unknown {
  const porSnake = fila[snake];
  return porSnake !== undefined ? porSnake : fila[camel];
}

function aJornada(fila: Record<string, unknown>): JornadaRow | null {
  const hora = aFecha(v(fila, "hora_partido", "horaPartido"));
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
  const numeroJornada = v(fila, "numero_jornada", "numeroJornada");
  if (typeof id !== "string" || typeof numeroJornada !== "number") {
    return null;
  }
  const numeroJornadaFnb = v(fila, "numero_jornada_fnb", "numeroJornadaFnb");
  const esLocal = v(fila, "es_local", "esLocal");
  const fnbMatchId = v(fila, "fnb_match_id", "fnbMatchId");
  const fnbUniversallyId = v(fila, "fnb_universally_id", "fnbUniversallyId");
  const marcadorLocal = v(fila, "marcador_local", "marcadorLocal");
  const marcadorVisitante = v(fila, "marcador_visitante", "marcadorVisitante");
  const origenResultado = v(fila, "origen_resultado", "origenResultado");
  return {
    id,
    numeroJornada,
    numeroJornadaFnb:
      typeof numeroJornadaFnb === "number"
        ? (numeroJornadaFnb as number)
        : null,
    rival: typeof fila["rival"] === "string" ? (fila["rival"] as string) : "",
    esLocal: esLocal === true,
    campo: typeof fila["campo"] === "string" ? (fila["campo"] as string) : null,
    municipio:
      typeof fila["municipio"] === "string"
        ? (fila["municipio"] as string)
        : null,
    horaPartido: hora,
    estado,
    fnbMatchId:
      typeof fnbMatchId === "string" ? (fnbMatchId as string) : null,
    fnbUniversallyId:
      typeof fnbUniversallyId === "string"
        ? (fnbUniversallyId as string)
        : null,
    marcadorLocal:
      typeof marcadorLocal === "number" ? (marcadorLocal as number) : null,
    marcadorVisitante:
      typeof marcadorVisitante === "number"
        ? (marcadorVisitante as number)
        : null,
    origenResultado:
      origenResultado === "manual" || origenResultado === "fnb"
        ? (origenResultado as "manual" | "fnb")
        : null,
    lastCalendarSync: aFecha(v(fila, "last_calendar_sync", "lastCalendarSync")),
    lastResultSync: aFecha(v(fila, "last_result_sync", "lastResultSync")),
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
  const fechaAlta = aFecha(v(fila, "fecha_alta", "fechaAlta"));
  if (fechaAlta === null) {
    return null;
  }
  const fechaBaja = aFecha(v(fila, "fecha_baja", "fechaBaja"));
  return {
    ...(fila as unknown as Record<string, unknown>),
    nombreFnb: v(fila, "nombre_fnb", "nombreFnb"),
    posicionesValidas: v(fila, "posiciones_validas", "posicionesValidas"),
    nombrePete: v(fila, "nombre_pete", "nombrePete"),
    imgPete: v(fila, "img_pete", "imgPete"),
    fnbUuid: v(fila, "fnb_uuid", "fnbUuid"),
    estadoSanitario: v(fila, "estado_sanitario", "estadoSanitario"),
    fechaAlta,
    fechaBaja,
  } as unknown as JugadorRow;
}

function aAlineacion(fila: Record<string, unknown>): AlineacionRow | null {
  const id = fila["id"];
  if (typeof id !== "string") {
    return null;
  }
  return {
    ...(fila as unknown as Record<string, unknown>),
    managerId: v(fila, "manager_id", "managerId"),
    jornadaId: v(fila, "jornada_id", "jornadaId"),
    capitanJugadorId: v(fila, "capitan_jugador_id", "capitanJugadorId"),
    instanteInicio: v(fila, "instante_inicio", "instanteInicio"),
  } as unknown as AlineacionRow;
}

function aSeleccion(
  fila: Record<string, unknown>,
): AlineacionSeleccionRow | null {
  const alineacionId = v(fila, "alineacion_id", "alineacionId");
  if (typeof alineacionId !== "string") {
    return null;
  }
  return {
    ...(fila as unknown as Record<string, unknown>),
    alineacionId,
    jugadorId: v(fila, "jugador_id", "jugadorId"),
    posicionAlineada: v(fila, "posicion_alineada", "posicionAlineada"),
  } as unknown as AlineacionSeleccionRow;
}

function aResultado(fila: Record<string, unknown>): ResultadoJugadorRow | null {
  const jornadaId = v(fila, "jornada_id", "jornadaId");
  if (typeof jornadaId !== "string") {
    return null;
  }
  return {
    ...(fila as unknown as Record<string, unknown>),
    jornadaId,
    jugadorId: v(fila, "jugador_id", "jugadorId"),
  } as unknown as ResultadoJugadorRow;
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
    .eq("manager_id", managerId)
    .eq("jornada_id", jornadaId)
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
  const filaAline = aline as Record<string, unknown>;
  const alineId = filaAline["id"];
  if (typeof alineId !== "string") {
    return null;
  }
  const { data: sels, error: errorSel } = (await db
    .from("alineacion_seleccion")
    .select("*")
    .eq("alineacion_id", alineId)) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (errorSel) {
    throw new Error(`[resultados] alineacion_seleccion: ${errorSel.message}`);
  }
  const alineacion = aAlineacion(filaAline);
  if (alineacion === null) {
    // Fila parcial de mocks antiguos: devolver cruda normalizada a camel.
    const fallback = {
      ...(filaAline as unknown as Record<string, unknown>),
      managerId: v(filaAline, "manager_id", "managerId"),
      jornadaId: v(filaAline, "jornada_id", "jornadaId"),
      capitanJugadorId: v(filaAline, "capitan_jugador_id", "capitanJugadorId"),
      instanteInicio: v(filaAline, "instante_inicio", "instanteInicio"),
    } as unknown as AlineacionRow;
    return {
      alineacion: fallback,
      selecciones: ((sels ?? []) as unknown as Array<Record<string, unknown>>)
        .map((f) => aSeleccion(f))
        .filter((s): s is AlineacionSeleccionRow => s !== null),
    };
  }
  return {
    alineacion,
    selecciones: ((sels ?? []) as unknown as Array<Record<string, unknown>>)
      .map((f) => aSeleccion(f))
      .filter((s): s is AlineacionSeleccionRow => s !== null),
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
    .eq("jornada_id", jornadaId)) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[resultados] resultado_jugador: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((r) => aResultado(r))
    .filter((r): r is ResultadoJugadorRow => r !== null);
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
