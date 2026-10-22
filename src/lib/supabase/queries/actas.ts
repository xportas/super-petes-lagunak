// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultadoJugadorRow } from "@/src/lib/supabase/tipos";

export async function leerActaAdmin(
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
    throw new Error(`[admin actas] leer: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<ResultadoJugadorRow>).filter(
    (r) => r.jornadaId === jornadaId,
  );
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
  await db.from("resultado_jugador").delete().eq("jornadaId", jornadaId);
  if (filas.length === 0) {
    return;
  }
  const { error } = (await db.from("resultado_jugador").insert(
    filas.map((f) => ({
      jornadaId,
      jugadorId: f.jugadorId,
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
    .eq("jornadaId", jornadaId)) as unknown as {
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
    .select("jugadorId")
    .in("alineacionId", ids)) as unknown as {
    readonly data: unknown;
  };
  return ((sels ?? []) as unknown as Array<{ readonly jugadorId: string }>)
    .map((s) => s.jugadorId)
    .filter((id): id is string => typeof id === "string");
}
