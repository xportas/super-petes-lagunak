// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JornadaRow } from "@/src/lib/supabase/tipos";

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

function campo(
  fila: Record<string, unknown>,
  snake: string,
  camel: string,
): unknown {
  const porSnake = fila[snake];
  return porSnake !== undefined ? porSnake : fila[camel];
}

function aJornada(fila: Record<string, unknown>): JornadaRow | null {
  const hora = aFecha(campo(fila, "hora_partido", "horaPartido"));
  if (hora === null) {
    return null;
  }
  if (typeof fila["id"] !== "string") {
    return null;
  }
  const numeroJornada = campo(fila, "numero_jornada", "numeroJornada");
  if (typeof numeroJornada !== "number") {
    return null;
  }
  if (typeof fila["rival"] !== "string") {
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
  const numeroJornadaFnb = campo(
    fila,
    "numero_jornada_fnb",
    "numeroJornadaFnb",
  );
  const esLocal = campo(fila, "es_local", "esLocal");
  const fnbMatchId = campo(fila, "fnb_match_id", "fnbMatchId");
  const fnbUniversallyId = campo(
    fila,
    "fnb_universally_id",
    "fnbUniversallyId",
  );
  const marcadorLocal = campo(fila, "marcador_local", "marcadorLocal");
  const marcadorVisitante = campo(
    fila,
    "marcador_visitante",
    "marcadorVisitante",
  );
  const origenResultado = campo(fila, "origen_resultado", "origenResultado");
  const lastCalendarSync = campo(
    fila,
    "last_calendar_sync",
    "lastCalendarSync",
  );
  const lastResultSync = campo(fila, "last_result_sync", "lastResultSync");
  return {
    id: fila["id"] as string,
    numeroJornada: numeroJornada as number,
    numeroJornadaFnb:
      typeof numeroJornadaFnb === "number"
        ? (numeroJornadaFnb as number)
        : null,
    rival: fila["rival"] as string,
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
    lastCalendarSync: aFecha(lastCalendarSync),
    lastResultSync: aFecha(lastResultSync),
  };
}

export async function listarJornadasAdmin(
  cliente?: SupabaseClient,
): Promise<JornadaRow[]> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db.from("jornada").select("*")) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[admin jornadas] listar: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((f) => aJornada(f))
    .filter((j): j is JornadaRow => j !== null);
}

export async function obtenerJornadaAdmin(
  id: string,
  cliente?: SupabaseClient,
): Promise<JornadaRow | null> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db
    .from("jornada")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[admin jornadas] obtener: ${error.message}`);
  }
  if (data === null || data === undefined) {
    return null;
  }
  return aJornada(data as Record<string, unknown>);
}

export interface CrearJornadaArgs {
  readonly numeroJornada: number;
  readonly numeroJornadaFnb: number | null;
  readonly rival: string;
  readonly esLocal: boolean;
  readonly campo: string | null;
  readonly municipio: string | null;
  readonly horaPartido: Date;
  readonly marcadorLocal: number | null;
  readonly marcadorVisitante: number | null;
}

export async function crearJornadaDB(
  args: CrearJornadaArgs,
  cliente?: SupabaseClient,
): Promise<JornadaRow> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db
    .from("jornada")
    .insert({
      numero_jornada: args.numeroJornada,
      numero_jornada_fnb: args.numeroJornadaFnb,
      rival: args.rival,
      es_local: args.esLocal,
      campo: args.campo,
      municipio: args.municipio,
      hora_partido: args.horaPartido.toISOString(),
      estado: "pendiente",
      marcador_local: args.marcadorLocal,
      marcador_visitante: args.marcadorVisitante,
      origen_resultado: null,
    })
    .select("*")
    .single()) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error || data === null || data === undefined) {
    throw new Error(
      `[admin jornadas] crear: ${error?.message ?? "sin datos"}`,
    );
  }
  const j = aJornada(data as Record<string, unknown>);
  if (j === null) {
    throw new Error("[admin jornadas] crear: fila inválida");
  }
  return j;
}

export async function actualizarJornadaDB(
  id: string,
  patch: Partial<CrearJornadaArgs> & { readonly estado?: JornadaRow["estado"]; readonly origenResultado?: "manual" | "fnb" | null },
  cliente?: SupabaseClient,
): Promise<JornadaRow> {
  const db = cliente ?? obtenerClienteService();
  const fila: Record<string, unknown> = {};
  if (patch.numeroJornada !== undefined) {
    fila["numero_jornada"] = patch.numeroJornada;
  }
  if (patch.numeroJornadaFnb !== undefined) {
    fila["numero_jornada_fnb"] = patch.numeroJornadaFnb;
  }
  if (patch.rival !== undefined) {
    fila["rival"] = patch.rival;
  }
  if (patch.esLocal !== undefined) {
    fila["es_local"] = patch.esLocal;
  }
  if (patch.campo !== undefined) {
    fila["campo"] = patch.campo;
  }
  if (patch.municipio !== undefined) {
    fila["municipio"] = patch.municipio;
  }
  if (patch.horaPartido !== undefined) {
    fila["hora_partido"] = patch.horaPartido.toISOString();
  }
  if (patch.marcadorLocal !== undefined) {
    fila["marcador_local"] = patch.marcadorLocal;
  }
  if (patch.marcadorVisitante !== undefined) {
    fila["marcador_visitante"] = patch.marcadorVisitante;
  }
  if (patch.estado !== undefined) {
    fila["estado"] = patch.estado;
  }
  if (patch.origenResultado !== undefined) {
    fila["origen_resultado"] = patch.origenResultado;
  }
  const { data, error } = (await db
    .from("jornada")
    .update(fila)
    .eq("id", id)
    .select("*")
    .single()) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error || data === null || data === undefined) {
    throw new Error(
      `[admin jornadas] actualizar: ${error?.message ?? "sin datos"}`,
    );
  }
  const j = aJornada(data as Record<string, unknown>);
  if (j === null) {
    throw new Error("[admin jornadas] actualizar: fila inválida");
  }
  return j;
}

export async function eliminarJornadaDB(
  id: string,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = (await db
    .from("jornada")
    .delete()
    .eq("id", id)) as unknown as {
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[admin jornadas] eliminar: ${error.message}`);
  }
}
