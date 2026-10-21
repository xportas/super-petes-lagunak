import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  InvitacionRow,
  RateLimitRow,
  SesionRow,
  UsuarioRow,
} from "./tipos";

export const NOMBRE_COOKIE_SESION = "spl_sesion" as const;

function leerEnv(nombre: string): string | null {
  const v = process.env[nombre];
  if (typeof v === "string" && v.length > 0) {
    return v;
  }
  return null;
}

export function obtenerClienteService(): SupabaseClient {
  const url = leerEnv("SUPABASE_URL") ?? leerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = leerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (url === null || key === null) {
    throw new Error(
      "[supabase] Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function buscarUsuarioPorNorm(
  norm: string,
  cliente?: SupabaseClient,
): Promise<UsuarioRow | null> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = await db
    .from("usuario")
    .select("*")
    .eq("usernameNormalizado", norm)
    .maybeSingle();
  if (error) {
    throw new Error(`[supabase] buscarUsuarioPorNorm: ${error.message}`);
  }
  if (data === null) {
    return null;
  }
  return data as UsuarioRow;
}

export async function buscarUsuarioPorId(
  id: string,
  cliente?: SupabaseClient,
): Promise<UsuarioRow | null> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = await db
    .from("usuario")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`[supabase] buscarUsuarioPorId: ${error.message}`);
  }
  if (data === null) {
    return null;
  }
  return data as UsuarioRow;
}

export async function crearUsuario(
  entrada: {
    readonly usernameDisplay: string;
    readonly usernameNorm: string;
    readonly hashPassword: string;
  },
  cliente?: SupabaseClient,
): Promise<UsuarioRow> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = await db
    .from("usuario")
    .insert({
      username: entrada.usernameDisplay,
      usernameNormalizado: entrada.usernameNorm,
      passwordHash: entrada.hashPassword,
      esTemporal: false,
      onboardingPaso: 1,
      onboardingCompletadoAt: null,
      rol: "manager",
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(`[supabase] crearUsuario: ${error.message}`);
  }
  return data as UsuarioRow;
}

export async function buscarInvitacionActiva(
  codigoNorm: string,
  cliente?: SupabaseClient,
): Promise<InvitacionRow | null> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = await db
    .from("invitacion_liga")
    .select("*")
    .eq("vigente", true);
  if (error) {
    throw new Error(`[supabase] buscarInvitacionActiva: ${error.message}`);
  }
  const filas = (data ?? []) as InvitacionRow[];
  for (const fila of filas) {
    if (typeof fila.codigo === "string") {
      if (fila.codigo.trim().toLowerCase() === codigoNorm) {
        return fila;
      }
    }
  }
  return null;
}

export async function leerFilaRateLimit(
  alcance: string,
  sujeto: string,
  cliente?: SupabaseClient,
): Promise<RateLimitRow | null> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = await db
    .from("rate_limit")
    .select("*")
    .eq("alcance", alcance)
    .eq("sujeto", sujeto)
    .maybeSingle();
  if (error) {
    throw new Error(`[supabase] leerFilaRateLimit: ${error.message}`);
  }
  if (data === null) {
    return null;
  }
  return data as RateLimitRow;
}

export async function guardarFilaRateLimit(
  fila: {
    readonly alcance: string;
    readonly sujeto: string;
    readonly intentos: number;
    readonly primerFalloAt: Date;
    readonly bloqueadoHasta: Date | null;
  },
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = await db.from("rate_limit").upsert(
    {
      alcance: fila.alcance,
      sujeto: fila.sujeto,
      intentos: fila.intentos,
      primerFalloAt: fila.primerFalloAt.toISOString(),
      bloqueadoHasta: fila.bloqueadoHasta
        ? fila.bloqueadoHasta.toISOString()
        : null,
    },
    { onConflict: "alcance,sujeto" },
  );
  if (error) {
    throw new Error(`[supabase] guardarFilaRateLimit: ${error.message}`);
  }
}

export async function eliminarFilaRateLimit(
  alcance: string,
  sujeto: string,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = await db
    .from("rate_limit")
    .delete()
    .eq("alcance", alcance)
    .eq("sujeto", sujeto);
  if (error) {
    throw new Error(`[supabase] eliminarFilaRateLimit: ${error.message}`);
  }
}

export async function crearSesionDB(
  entrada: {
    readonly usuarioId: string;
    readonly tokenHash: string;
    readonly expiraAt: Date;
    readonly ultimaRenovacionAt: Date;
  },
  cliente?: SupabaseClient,
): Promise<SesionRow> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = await db
    .from("sesion")
    .insert({
      usuarioId: entrada.usuarioId,
      tokenHash: entrada.tokenHash,
      expiraAt: entrada.expiraAt.toISOString(),
      ultimaRenovacionAt: entrada.ultimaRenovacionAt.toISOString(),
      revocadaAt: null,
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(`[supabase] crearSesionDB: ${error.message}`);
  }
  return data as SesionRow;
}

export async function buscarSesionPorId(
  id: string,
  cliente?: SupabaseClient,
): Promise<SesionRow | null> {
  const db = cliente ?? obtenerClienteService();
  const { data, error } = await db
    .from("sesion")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`[supabase] buscarSesionPorId: ${error.message}`);
  }
  if (data === null) {
    return null;
  }
  return data as SesionRow;
}

export async function renovarSesionDB(
  id: string,
  expiraAt: Date,
  ultimaRenovacionAt: Date,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = await db
    .from("sesion")
    .update({
      expiraAt: expiraAt.toISOString(),
      ultimaRenovacionAt: ultimaRenovacionAt.toISOString(),
    })
    .eq("id", id);
  if (error) {
    throw new Error(`[supabase] renovarSesionDB: ${error.message}`);
  }
}

export async function revocarSesionDB(
  id: string,
  ahora: Date,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = await db
    .from("sesion")
    .update({ revocadaAt: ahora.toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(`[supabase] revocarSesionDB: ${error.message}`);
  }
}

export async function revocarTodasMenosDB(
  usuarioId: string,
  exceptoId: string,
  ahora: Date,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = await db
    .from("sesion")
    .update({ revocadaAt: ahora.toISOString() })
    .eq("usuarioId", usuarioId)
    .neq("id", exceptoId)
    .is("revocadaAt", null);
  if (error) {
    throw new Error(`[supabase] revocarTodasMenosDB: ${error.message}`);
  }
}

export async function revocarTodasDeUsuarioDB(
  usuarioId: string,
  ahora: Date,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = await db
    .from("sesion")
    .update({ revocadaAt: ahora.toISOString() })
    .eq("usuarioId", usuarioId)
    .is("revocadaAt", null);
  if (error) {
    throw new Error(`[supabase] revocarTodasDeUsuarioDB: ${error.message}`);
  }
}

export async function marcarTemporal(
  usuarioId: string,
  esTemporal: boolean,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = await db
    .from("usuario")
    .update({ esTemporal })
    .eq("id", usuarioId);
  if (error) {
    throw new Error(`[supabase] marcarTemporal: ${error.message}`);
  }
}

export async function actualizarPassword(
  usuarioId: string,
  hashPassword: string,
  esTemporal: boolean,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = await db
    .from("usuario")
    .update({ passwordHash: hashPassword, esTemporal })
    .eq("id", usuarioId);
  if (error) {
    throw new Error(`[supabase] actualizarPassword: ${error.message}`);
  }
}

export async function actualizarOnboarding(
  usuarioId: string,
  paso: number,
  completadoAt: Date | null,
  cliente?: SupabaseClient,
): Promise<void> {
  const db = cliente ?? obtenerClienteService();
  const { error } = await db
    .from("usuario")
    .update({
      onboardingPaso: paso,
      onboardingCompletadoAt: completadoAt
        ? completadoAt.toISOString()
        : null,
    })
    .eq("id", usuarioId);
  if (error) {
    throw new Error(`[supabase] actualizarOnboarding: ${error.message}`);
  }
}

export function parsearCookieSesion(
  valor: string | null | undefined,
): { readonly id: string; readonly token: string } | null {
  if (typeof valor !== "string") {
    return null;
  }
  const punto = valor.indexOf(".");
  if (punto <= 0 || punto >= valor.length - 1) {
    return null;
  }
  const id = valor.slice(0, punto);
  const token = valor.slice(punto + 1);
  if (id.length === 0 || token.length === 0) {
    return null;
  }
  return { id, token };
}
