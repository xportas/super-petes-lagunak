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

function aJornada(fila: Record<string, unknown>): JornadaRow | null {
  const hora = aFecha(fila["horaPartido"]);
  if (hora === null) {
    return null;
  }
  if (typeof fila["id"] !== "string") {
    return null;
  }
  if (typeof fila["numeroJornada"] !== "number") {
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
  return {
    id: fila["id"] as string,
    numeroJornada: fila["numeroJornada"] as number,
    numeroJornadaFnb:
      typeof fila["numeroJornadaFnb"] === "number"
        ? (fila["numeroJornadaFnb"] as number)
        : null,
    rival: fila["rival"] as string,
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
      numeroJornada: args.numeroJornada,
      numeroJornadaFnb: args.numeroJornadaFnb,
      rival: args.rival,
      esLocal: args.esLocal,
      campo: args.campo,
      municipio: args.municipio,
      horaPartido: args.horaPartido.toISOString(),
      estado: "pendiente",
      marcadorLocal: args.marcadorLocal,
      marcadorVisitante: args.marcadorVisitante,
      origenResultado: null,
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
    fila["numeroJornada"] = patch.numeroJornada;
  }
  if (patch.numeroJornadaFnb !== undefined) {
    fila["numeroJornadaFnb"] = patch.numeroJornadaFnb;
  }
  if (patch.rival !== undefined) {
    fila["rival"] = patch.rival;
  }
  if (patch.esLocal !== undefined) {
    fila["esLocal"] = patch.esLocal;
  }
  if (patch.campo !== undefined) {
    fila["campo"] = patch.campo;
  }
  if (patch.municipio !== undefined) {
    fila["municipio"] = patch.municipio;
  }
  if (patch.horaPartido !== undefined) {
    fila["horaPartido"] = patch.horaPartido.toISOString();
  }
  if (patch.marcadorLocal !== undefined) {
    fila["marcadorLocal"] = patch.marcadorLocal;
  }
  if (patch.marcadorVisitante !== undefined) {
    fila["marcadorVisitante"] = patch.marcadorVisitante;
  }
  if (patch.estado !== undefined) {
    fila["estado"] = patch.estado;
  }
  if (patch.origenResultado !== undefined) {
    fila["origenResultado"] = patch.origenResultado;
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
