// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function insertarIgnoradoDB(
  fnbMatchId: string,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = (await db.from("fnb_partidos_ignorados").upsert(
    { fnbMatchId, eliminadoAt: new Date().toISOString() },
    { onConflict: "fnbMatchId" },
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
    .select("fnbMatchId")) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[admin ignorados] listar: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<{ readonly fnbMatchId: string }>);
}
