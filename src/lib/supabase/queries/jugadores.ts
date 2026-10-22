// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JugadorRow, Posicion } from "@/src/lib/supabase/tipos";

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

function aJugador(fila: Record<string, unknown>): JugadorRow | null {
  if (typeof fila["id"] !== "string") {
    return null;
  }
  if (typeof fila["nombre"] !== "string") {
    return null;
  }
  const fechaAlta = aFecha(campo(fila, "fecha_alta", "fechaAlta"));
  if (fechaAlta === null) {
    return null;
  }
  const pos = campo(fila, "posiciones_validas", "posicionesValidas");
  const posiciones =
    Array.isArray(pos) && pos.length === 2
      ? (pos as unknown as readonly [Posicion, Posicion])
      : null;
  const nombreFnbRaw = campo(fila, "nombre_fnb", "nombreFnb");
  const nombrePeteRaw = campo(fila, "nombre_pete", "nombrePete");
  const imgPeteRaw = campo(fila, "img_pete", "imgPete");
  const fnbUuidRaw = campo(fila, "fnb_uuid", "fnbUuid");
  const estadoSanitarioRaw = campo(
    fila,
    "estado_sanitario",
    "estadoSanitario",
  );
  const fechaBajaRaw = campo(fila, "fecha_baja", "fechaBaja");
  return {
    id: fila["id"] as string,
    nombre: fila["nombre"] as string,
    nombreFnb:
      typeof nombreFnbRaw === "string"
        ? (nombreFnbRaw as string)
        : (fila["nombre"] as string),
    dorsal:
      typeof fila["dorsal"] === "number" ? (fila["dorsal"] as number) : null,
    posicionesValidas: posiciones,
    nombrePete:
      typeof nombrePeteRaw === "string" ? (nombrePeteRaw as string) : null,
    img: typeof fila["img"] === "string" ? (fila["img"] as string) : "",
    imgPete: typeof imgPeteRaw === "string" ? (imgPeteRaw as string) : "",
    descripcion:
      typeof fila["descripcion"] === "string"
        ? (fila["descripcion"] as string)
        : "",
    fnbUuid: typeof fnbUuidRaw === "string" ? (fnbUuidRaw as string) : null,
    estadoSanitario:
      estadoSanitarioRaw === "lesionado" ? "lesionado" : "disponible",
    activo: fila["activo"] === true,
    fechaAlta,
    fechaBaja: aFecha(fechaBajaRaw),
  };
}

export async function listarJugadoresAdmin(
  cliente?: SupabaseClient,
): Promise<JugadorRow[]> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db.from("jugador").select("*")) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[admin jugadores] listar: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((f) => aJugador(f))
    .filter((j): j is JugadorRow => j !== null);
}

export interface UpsertJugadorArgs {
  readonly id?: string | undefined;
  readonly nombre: string;
  readonly nombreFnb: string;
  readonly dorsal: number | null;
  readonly posicionesValidas: readonly [Posicion, Posicion] | null;
  readonly nombrePete: string | null;
  readonly img: string;
  readonly imgPete: string;
  readonly descripcion: string;
  readonly fnbUuid: string | null;
  readonly estadoSanitario: "disponible" | "lesionado";
  readonly activo: boolean;
  readonly fechaAlta: Date;
  readonly fechaBaja: Date | null;
}

export async function upsertJugadorDB(
  args: UpsertJugadorArgs,
  cliente?: SupabaseClient,
): Promise<JugadorRow> {
  const db = cliente ?? obtenerClienteService();
  const fila = {
    nombre: args.nombre,
    nombre_fnb: args.nombreFnb,
    dorsal: args.dorsal,
    posiciones_validas: args.posicionesValidas,
    nombre_pete: args.nombrePete,
    img: args.img,
    img_pete: args.imgPete,
    descripcion: args.descripcion,
    fnb_uuid: args.fnbUuid,
    estado_sanitario: args.estadoSanitario,
    activo: args.activo,
    fecha_alta: args.fechaAlta.toISOString(),
    fecha_baja: args.fechaBaja ? args.fechaBaja.toISOString() : null,
  };
  if (args.id !== undefined) {
    const { data, error } = (await db
      .from("jugador")
      .update(fila)
      .eq("id", args.id)
      .select("*")
      .single()) as unknown as {
      readonly data: unknown;
      readonly error: { readonly message: string } | null;
    };
    if (error || data === null || data === undefined) {
      throw new Error(
        `[admin jugadores] actualizar: ${error?.message ?? "sin datos"}`,
      );
    }
    const j = aJugador(data as Record<string, unknown>);
    if (j === null) {
      throw new Error("[admin jugadores] actualizar: fila inválida");
    }
    return j;
  }
  const { data, error } = (await db
    .from("jugador")
    .insert(fila)
    .select("*")
    .single()) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error || data === null || data === undefined) {
    throw new Error(
      `[admin jugadores] crear: ${error?.message ?? "sin datos"}`,
    );
  }
  const j = aJugador(data as Record<string, unknown>);
  if (j === null) {
    throw new Error("[admin jugadores] crear: fila inválida");
  }
  return j;
}

export async function darBajaJugadorDB(
  id: string,
  fechaBaja: Date,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = (await db
    .from("jugador")
    .update({ activo: false, fecha_baja: fechaBaja.toISOString() })
    .eq("id", id)) as unknown as {
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[admin jugadores] baja: ${error.message}`);
  }
}

export function contarElegibles(
  jugadores: readonly JugadorRow[],
): number {
  let n = 0;
  for (const j of jugadores) {
    if (j.activo && j.posicionesValidas !== null) {
      n += 1;
    }
  }
  return n;
}
