// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import {
  eliminarFilaRateLimit,
  obtenerClienteService,
  revocarTodasDeUsuarioDB,
} from "@/src/lib/supabase/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UsuarioRow } from "@/src/lib/supabase/tipos";

export interface UsuarioAdminVista {
  readonly id: string;
  readonly username: string;
  readonly esTemporal: boolean;
  readonly rol: string;
  readonly creadoAt: Date | null;
  readonly bloqueadoLogin: boolean;
}

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

export async function listarUsuariosAdmin(
  cliente?: SupabaseClient,
): Promise<UsuarioRow[]> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db.from("usuario").select("*")) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[admin usuarios] listar: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<UsuarioRow>).filter(
    (u) => u.rol !== "admin",
  );
}

export async function aplicarTemporalDB(
  usuarioId: string,
  usernameNormalizado: string,
  passwordHash: string,
  ahora: Date,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = (await db
    .from("usuario")
    .update({ passwordHash, esTemporal: true })
    .eq("id", usuarioId)) as unknown as {
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[admin usuarios] temporal: ${error.message}`);
  }
  await revocarTodasDeUsuarioDB(usuarioId, ahora, db).catch(() => undefined);
  await eliminarFilaRateLimit("login", usernameNormalizado, db).catch(
    () => undefined,
  );
  await eliminarFilaRateLimit("cambiar_password", usuarioId, db).catch(
    () => undefined,
  );
}

export async function leerInvitacionVigenteDB(
  cliente?: SupabaseClient,
): Promise<{ readonly id: string; readonly codigo: string } | null> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = (await db
    .from("invitacion_liga")
    .select("id,codigo")
    .eq("vigente", true)
    .maybeSingle()) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error) {
    throw new Error(`[admin invitacion] leer: ${error.message}`);
  }
  if (data === null || data === undefined) {
    return null;
  }
  const fila = data as { readonly id: unknown; readonly codigo: unknown };
  if (typeof fila.id !== "string" || typeof fila.codigo !== "string") {
    return null;
  }
  return { id: fila.id, codigo: fila.codigo };
}

export async function rotarInvitacionDB(
  nuevoCodigo: string,
  cliente?: SupabaseClient,
): Promise<{ readonly codigo: string }> {
  const db = cliente ?? obtenerClienteService();
  await db.from("invitacion_liga").update({ vigente: false }).eq("vigente", true);
  const { data, error } = (await db
    .from("invitacion_liga")
    .insert({ codigo: nuevoCodigo, vigente: true })
    .select("codigo")
    .single()) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (error || data === null || data === undefined) {
    throw new Error(
      `[admin invitacion] rotar: ${error?.message ?? "sin datos"}`,
    );
  }
  void aFecha;
  return { codigo: (data as { readonly codigo: string }).codigo };
}
