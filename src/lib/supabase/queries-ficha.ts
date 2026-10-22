// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  JornadaRow,
  JugadorRow,
  ResultadoJugadorRow,
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

function esEntrenadorNombre(nombre: string): boolean {
  const n = nombre.trim().toLowerCase();
  return n === "maider" || n === "pater";
}

function aJugador(fila: Record<string, unknown>): JugadorRow | null {
  const id = fila["id"];
  const nombre = fila["nombre"];
  const nombreFnb = v(fila, "nombre_fnb", "nombreFnb");
  if (typeof id !== "string" || typeof nombre !== "string") {
    return null;
  }
  const fechaAlta = aFecha(v(fila, "fecha_alta", "fechaAlta"));
  if (fechaAlta === null) {
    return null;
  }
  const pos = v(fila, "posiciones_validas", "posicionesValidas");
  const posicionesValidas =
    Array.isArray(pos) &&
    pos.length === 2 &&
    typeof pos[0] === "string" &&
    typeof pos[1] === "string"
      ? (pos as unknown as JugadorRow["posicionesValidas"])
      : null;
  const nombrePete = v(fila, "nombre_pete", "nombrePete");
  const imgPete = v(fila, "img_pete", "imgPete");
  const fnbUuid = v(fila, "fnb_uuid", "fnbUuid");
  const estadoSanitario = v(fila, "estado_sanitario", "estadoSanitario");
  const fechaBaja = v(fila, "fecha_baja", "fechaBaja");
  return {
    id,
    nombre,
    nombreFnb: typeof nombreFnb === "string" ? nombreFnb : nombre,
    dorsal: typeof fila["dorsal"] === "number" ? (fila["dorsal"] as number) : null,
    posicionesValidas,
    nombrePete: typeof nombrePete === "string" ? (nombrePete as string) : null,
    img: typeof fila["img"] === "string" ? (fila["img"] as string) : "",
    imgPete: typeof imgPete === "string" ? (imgPete as string) : "",
    descripcion:
      typeof fila["descripcion"] === "string"
        ? (fila["descripcion"] as string)
        : "",
    fnbUuid: typeof fnbUuid === "string" ? (fnbUuid as string) : null,
    estadoSanitario: estadoSanitario === "lesionado" ? "lesionado" : "disponible",
    activo: fila["activo"] === true,
    fechaAlta,
    fechaBaja: aFecha(fechaBaja),
  };
}

export function ordenarPlantillaActiva(
  jugadores: readonly JugadorRow[],
): JugadorRow[] {
  return [...jugadores]
    .filter((j) => j.activo && !esEntrenadorNombre(j.nombre))
    .sort((a, b) => {
      if (a.dorsal === null && b.dorsal !== null) {
        return 1;
      }
      if (a.dorsal !== null && b.dorsal === null) {
        return -1;
      }
      if (a.dorsal !== null && b.dorsal !== null && a.dorsal !== b.dorsal) {
        return a.dorsal - b.dorsal;
      }
      if (a.nombre < b.nombre) {
        return -1;
      }
      if (a.nombre > b.nombre) {
        return 1;
      }
      return 0;
    });
}

export async function listarPlantillaActiva(
  cliente?: SupabaseClient,
): Promise<JugadorRow[]> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db
    .from("jugador")
    .select("*")
    .eq("activo", true)) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[ficha] jugador: ${error.message}`);
  }
  const filas = ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((f) => aJugador(f))
    .filter((j): j is JugadorRow => j !== null);
  return ordenarPlantillaActiva(filas);
}

export type ResultadoFicha =
  | { readonly tipo: "jugador"; readonly jugador: JugadorRow }
  | { readonly tipo: "entrenador" }
  | { readonly tipo: "no_encontrado" };

export async function leerJugadorPorId(
  id: string,
  cliente?: SupabaseClient,
): Promise<ResultadoFicha> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db
    .from("jugador")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[ficha] jugador por id: ${error.message}`);
  }
  if (data === null || data === undefined) {
    const { data: ent } = (await db
      .from("entrenador")
      .select("slug")
      .eq("slug", id)) as unknown as {
      readonly data: unknown;
      readonly error: { readonly message: string } | null;
    };
    if (Array.isArray(ent) && ent.length > 0) {
      return { tipo: "entrenador" };
    }
    return { tipo: "no_encontrado" };
  }
  const jugador = aJugador(data as Record<string, unknown>);
  if (jugador === null) {
    return { tipo: "no_encontrado" };
  }
  if (esEntrenadorNombre(jugador.nombre)) {
    return { tipo: "entrenador" };
  }
  return { tipo: "jugador", jugador };
}

export interface ActaFicha {
  readonly jornada: JornadaRow;
  readonly resultado: ResultadoJugadorRow;
}

export async function leerActasJugador(
  jugadorId: string,
  cliente?: SupabaseClient,
): Promise<readonly ActaFicha[]> {
  const db = cliente ?? obtenerClienteService();
  const { data: filasResultados, error } = (await db
    .from("resultado_jugador")
    .select("*")
    .eq("jugador_id", jugadorId)) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[ficha] actas: ${error.message}`);
  }
  const resultados = ((filasResultados ?? []) as unknown as Array<
    Record<string, unknown>
  >)
    .filter(
      (r) =>
        typeof (r["jornada_id"] ?? r["jornadaId"]) === "string" &&
        typeof r["valoracion"] === "number",
    )
    .map(
      (r) =>
        ({
          jornadaId: (r["jornada_id"] ?? r["jornadaId"]) as string,
          jugadorId: jugadorId,
          valoracion: r["valoracion"] as number,
          estado:
            r["estado"] === "jugo" ||
            r["estado"] === "lesionado" ||
            r["estado"] === "no_convocado" ||
            r["estado"] === "dnp"
              ? (r["estado"] as ResultadoJugadorRow["estado"])
              : "no_convocado",
          expulsado: r["expulsado"] === true,
        }) as ResultadoJugadorRow,
    );
  if (resultados.length === 0) {
    return [];
  }
  const ids = [...new Set(resultados.map((r) => r.jornadaId))];
  const { data: filasJornadas, error: errorJ } = (await db
    .from("jornada")
    .select("*")
    .in("id", ids)) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (errorJ) {
    throw new Error(`[ficha] jornadas acta: ${errorJ.message}`);
  }
  const porId = new Map<string, JornadaRow>();
  for (const f of ((filasJornadas ?? []) as unknown as Array<
    Record<string, unknown>
  >)) {
    const hora = aFecha(v(f, "hora_partido", "horaPartido"));
    const numeroJornada = v(f, "numero_jornada", "numeroJornada");
    if (
      hora === null ||
      typeof f["id"] !== "string" ||
      typeof numeroJornada !== "number"
    ) {
      continue;
    }
    const estado = f["estado"];
    if (
      estado !== "pendiente" &&
      estado !== "calculada" &&
      estado !== "papel" &&
      estado !== "invalidada"
    ) {
      continue;
    }
    const numeroJornadaFnb = v(f, "numero_jornada_fnb", "numeroJornadaFnb");
    const esLocal = v(f, "es_local", "esLocal");
    const fnbMatchId = v(f, "fnb_match_id", "fnbMatchId");
    const fnbUniversallyId = v(f, "fnb_universally_id", "fnbUniversallyId");
    const marcadorLocal = v(f, "marcador_local", "marcadorLocal");
    const marcadorVisitante = v(f, "marcador_visitante", "marcadorVisitante");
    const origenResultado = v(f, "origen_resultado", "origenResultado");
    porId.set(f["id"] as string, {
      id: f["id"] as string,
      numeroJornada: numeroJornada as number,
      numeroJornadaFnb:
        typeof numeroJornadaFnb === "number"
          ? (numeroJornadaFnb as number)
          : null,
      rival: typeof f["rival"] === "string" ? (f["rival"] as string) : "",
      esLocal: esLocal === true,
      campo: typeof f["campo"] === "string" ? (f["campo"] as string) : null,
      municipio:
        typeof f["municipio"] === "string" ? (f["municipio"] as string) : null,
      horaPartido: hora,
      estado,
      fnbMatchId:
        typeof fnbMatchId === "string" ? (fnbMatchId as string) : null,
      fnbUniversallyId:
        typeof fnbUniversallyId === "string"
          ? (fnbUniversallyId as string)
          : null,
      marcadorLocal:
        typeof marcadorLocal === "number"
          ? (marcadorLocal as number)
          : null,
      marcadorVisitante:
        typeof marcadorVisitante === "number"
          ? (marcadorVisitante as number)
          : null,
      origenResultado:
        origenResultado === "manual" || origenResultado === "fnb"
          ? (origenResultado as "manual" | "fnb")
          : null,
      lastCalendarSync: aFecha(v(f, "last_calendar_sync", "lastCalendarSync")),
      lastResultSync: aFecha(v(f, "last_result_sync", "lastResultSync")),
    });
  }
  const salida: ActaFicha[] = [];
  for (const r of resultados) {
    const jornada = porId.get(r.jornadaId);
    if (jornada !== undefined) {
      salida.push({ jornada, resultado: r });
    }
  }
  return salida;
}
