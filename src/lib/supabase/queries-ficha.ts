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

function esEntrenadorNombre(nombre: string): boolean {
  const n = nombre.trim().toLowerCase();
  return n === "maider" || n === "pater";
}

function aJugador(fila: Record<string, unknown>): JugadorRow | null {
  const id = fila["id"];
  const nombre = fila["nombre"];
  const nombreFnb = fila["nombreFnb"];
  if (typeof id !== "string" || typeof nombre !== "string") {
    return null;
  }
  const fechaAlta = aFecha(fila["fechaAlta"]);
  if (fechaAlta === null) {
    return null;
  }
  const pos = fila["posicionesValidas"];
  const posicionesValidas =
    Array.isArray(pos) &&
    pos.length === 2 &&
    typeof pos[0] === "string" &&
    typeof pos[1] === "string"
      ? (pos as unknown as JugadorRow["posicionesValidas"])
      : null;
  return {
    id,
    nombre,
    nombreFnb: typeof nombreFnb === "string" ? nombreFnb : nombre,
    dorsal: typeof fila["dorsal"] === "number" ? (fila["dorsal"] as number) : null,
    posicionesValidas,
    nombrePete:
      typeof fila["nombrePete"] === "string"
        ? (fila["nombrePete"] as string)
        : null,
    img: typeof fila["img"] === "string" ? (fila["img"] as string) : "",
    imgPete:
      typeof fila["imgPete"] === "string" ? (fila["imgPete"] as string) : "",
    descripcion:
      typeof fila["descripcion"] === "string"
        ? (fila["descripcion"] as string)
        : "",
    fnbUuid:
      typeof fila["fnbUuid"] === "string" ? (fila["fnbUuid"] as string) : null,
    estadoSanitario:
      fila["estadoSanitario"] === "lesionado" ? "lesionado" : "disponible",
    activo: fila["activo"] === true,
    fechaAlta,
    fechaBaja: aFecha(fila["fechaBaja"]),
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
    .eq("jugadorId", jugadorId)) as unknown as {
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
        typeof r["jornadaId"] === "string" &&
        typeof r["valoracion"] === "number",
    )
    .map(
      (r) =>
        ({
          jornadaId: r["jornadaId"] as string,
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
    const hora = aFecha(f["horaPartido"]);
    if (
      hora === null ||
      typeof f["id"] !== "string" ||
      typeof f["numeroJornada"] !== "number"
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
    porId.set(f["id"] as string, {
      id: f["id"] as string,
      numeroJornada: f["numeroJornada"] as number,
      numeroJornadaFnb:
        typeof f["numeroJornadaFnb"] === "number"
          ? (f["numeroJornadaFnb"] as number)
          : null,
      rival: typeof f["rival"] === "string" ? (f["rival"] as string) : "",
      esLocal: f["esLocal"] === true,
      campo: typeof f["campo"] === "string" ? (f["campo"] as string) : null,
      municipio:
        typeof f["municipio"] === "string" ? (f["municipio"] as string) : null,
      horaPartido: hora,
      estado,
      fnbMatchId:
        typeof f["fnbMatchId"] === "string" ? (f["fnbMatchId"] as string) : null,
      fnbUniversallyId:
        typeof f["fnbUniversallyId"] === "string"
          ? (f["fnbUniversallyId"] as string)
          : null,
      marcadorLocal:
        typeof f["marcadorLocal"] === "number"
          ? (f["marcadorLocal"] as number)
          : null,
      marcadorVisitante:
        typeof f["marcadorVisitante"] === "number"
          ? (f["marcadorVisitante"] as number)
          : null,
      origenResultado:
        f["origenResultado"] === "manual" || f["origenResultado"] === "fnb"
          ? (f["origenResultado"] as "manual" | "fnb")
          : null,
      lastCalendarSync: aFecha(f["lastCalendarSync"]),
      lastResultSync: aFecha(f["lastResultSync"]),
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
