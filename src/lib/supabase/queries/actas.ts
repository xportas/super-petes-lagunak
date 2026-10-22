// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultadoJugadorRow } from "@/src/lib/supabase/tipos";

function campo(
  fila: Record<string, unknown>,
  snake: string,
  camel: string,
): unknown {
  const porSnake = fila[snake];
  return porSnake !== undefined ? porSnake : fila[camel];
}

function filaAResultado(fila: Record<string, unknown>): ResultadoJugadorRow | null {
  const jornadaId = campo(fila, "jornada_id", "jornadaId");
  const jugadorId = campo(fila, "jugador_id", "jugadorId");
  const valoracion = fila["valoracion"];
  const estado = fila["estado"];
  const expulsado = fila["expulsado"];
  if (typeof jornadaId !== "string" || typeof jugadorId !== "string") {
    return null;
  }
  if (typeof valoracion !== "number") {
    return null;
  }
  if (
    estado !== "jugo" &&
    estado !== "lesionado" &&
    estado !== "no_convocado" &&
    estado !== "dnp"
  ) {
    return null;
  }
  if (typeof expulsado !== "boolean") {
    return null;
  }
  return {
    jornadaId,
    jugadorId,
    valoracion,
    estado,
    expulsado,
  };
}

export async function leerActaAdmin(
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
    throw new Error(`[admin actas] leer: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((f) => filaAResultado(f))
    .filter((r): r is ResultadoJugadorRow => r !== null)
    .filter((r) => r.jornadaId === jornadaId);
}

export async function guardarActaFilasDB(
  jornadaId: string,
  filas: readonly {
    readonly jugadorId: string;
    readonly valoracion: number;
    readonly estado: ResultadoJugadorRow["estado"];
    readonly expulsado: boolean;
  }[],
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  await db.from("resultado_jugador").delete().eq("jornada_id", jornadaId);
  if (filas.length === 0) {
    return;
  }
  const { error } = (await db.from("resultado_jugador").insert(
    filas.map((f) => ({
      jornada_id: jornadaId,
      jugador_id: f.jugadorId,
      valoracion: f.valoracion,
      estado: f.estado,
      expulsado: f.expulsado,
    })),
  )) as unknown as { readonly error: { readonly message: string } | null };
  if (error) {
    throw new Error(`[admin actas] guardar: ${error.message}`);
  }
}

export async function listarAlineadosJornada(
  jornadaId: string,
  cliente?: SupabaseClient,
): Promise<readonly string[]> {
  const db = cliente ?? obtenerClienteService();
  const { data: alineaciones } = (await db
    .from("alineacion")
    .select("id")
    .eq("jornada_id", jornadaId)) as unknown as {
    readonly data: unknown;
  };
  const ids = ((alineaciones ?? []) as unknown as Array<{ readonly id: string }>)
    .map((a) => a.id)
    .filter((id): id is string => typeof id === "string");
  if (ids.length === 0) {
    return [];
  }
  const { data: sels } = (await db
    .from("alineacion_seleccion")
    .select("jugador_id")
    .in("alineacion_id", ids)) as unknown as {
    readonly data: unknown;
  };
  return ((sels ?? []) as unknown as Array<Record<string, unknown>>)
    .map((s) => campo(s, "jugador_id", "jugadorId"))
    .filter((id): id is string => typeof id === "string");
}
