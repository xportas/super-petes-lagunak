// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

function leerFnbMatchId(fila: unknown): string | null {
  if (typeof fila !== "object" || fila === null) {
    return null;
  }
  const r = fila as Record<string, unknown>;
  const v = r["fnb_match_id"] ?? r["fnbMatchId"];
  return typeof v === "string" ? v : null;
}

export async function insertarIgnoradoDB(
  fnbMatchId: string,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = (await db.from("fnb_partidos_ignorados").upsert(
    { fnb_match_id: fnbMatchId, eliminado_at: new Date().toISOString() },
    { onConflict: "fnb_match_id" },
  )) as unknown as { readonly error: { readonly message: string } | null };
  if (error) {
    throw new Error(`[admin ignorados] insertar: ${error.message}`);
  }
}

export async function listarIgnoradosDB(
  cliente?: SupabaseClient,
): Promise<readonly { readonly fnbMatchId: string }[]> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db
    .from("fnb_partidos_ignorados")
    .select("fnb_match_id")) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[admin ignorados] listar: ${error.message}`);
  }
  const salida: Array<{ readonly fnbMatchId: string }> = [];
  for (const fila of (data ?? []) as unknown as Array<unknown>) {
    const id = leerFnbMatchId(fila);
    if (id !== null) {
      salida.push({ fnbMatchId: id });
    }
  }
  return salida;
}
