import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  InvitacionRow,
  RateLimitRow,
  SesionRow,
  UsuarioRow,
} from "./tipos";

export const NOMBRE_COOKIE_SESION = "spl_sesion" as const;

function comoRegistro(valor: unknown): Record<string, unknown> | null {
  if (typeof valor === "object" && valor !== null) {
    return valor as Record<string, unknown>;
  }
  return null;
}

function leerTexto(
  fila: Record<string, unknown>,
  snake: string,
  camel: string,
): string | null {
  const v = fila[snake] ?? fila[camel];
  return typeof v === "string" ? v : null;
}

function leerFecha(
  fila: Record<string, unknown>,
  snake: string,
  camel: string,
): Date | null {
  const v = fila[snake] ?? fila[camel];
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function leerFechaNula(
  fila: Record<string, unknown>,
  snake: string,
  camel: string,
): Date | null {
  const v = fila[snake] ?? fila[camel] ?? null;
  if (v === null) {
    return null;
  }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function mapearUsuarioRow(fila: unknown): UsuarioRow | null {
  const r = comoRegistro(fila);
  if (r === null) {
    return null;
  }
  const id = leerTexto(r, "id", "id");
  const username = leerTexto(r, "username", "username");
  const usernameNormalizado = leerTexto(
    r,
    "username_normalizado",
    "usernameNormalizado",
  );
  const passwordHash = leerTexto(r, "password_hash", "passwordHash");
  const creadoAt = leerFecha(r, "creado_at", "creadoAt");
  if (
    id === null ||
    username === null ||
    usernameNormalizado === null ||
    passwordHash === null ||
    creadoAt === null
  ) {
    return null;
  }
  const rol = r["rol"];
  if (rol !== "manager" && rol !== "admin") {
    return null;
  }
  const esTemporal = (r["es_temporal"] ?? r["esTemporal"]) === true;
  const paso = r["onboarding_paso"] ?? r["onboardingPaso"];
  return {
    id,
    username,
    usernameNormalizado,
    passwordHash,
    esTemporal,
    onboardingPaso: typeof paso === "number" ? paso : 0,
    onboardingCompletadoAt: leerFechaNula(
      r,
      "onboarding_completado_at",
      "onboardingCompletadoAt",
    ),
    rol,
    creadoAt,
  };
}

function mapearSesionRow(fila: unknown): SesionRow | null {
  const r = comoRegistro(fila);
  if (r === null) {
    return null;
  }
  const id = leerTexto(r, "id", "id");
  const usuarioId = leerTexto(r, "usuario_id", "usuarioId");
  const tokenHash = leerTexto(r, "token_hash", "tokenHash");
  const expiraAt = leerFecha(r, "expira_at", "expiraAt");
  const ultimaRenovacionAt = leerFecha(
    r,
    "ultima_renovacion_at",
    "ultimaRenovacionAt",
  );
  if (
    id === null ||
    usuarioId === null ||
    tokenHash === null ||
    expiraAt === null ||
    ultimaRenovacionAt === null
  ) {
    return null;
  }
  return {
    id,
    usuarioId,
    tokenHash,
    expiraAt,
    ultimaRenovacionAt,
    revocadaAt: leerFechaNula(r, "revocada_at", "revocadaAt"),
  };
}

function mapearRateLimitRow(fila: unknown): RateLimitRow | null {
  const r = comoRegistro(fila);
  if (r === null) {
    return null;
  }
  const alcance = leerTexto(r, "alcance", "alcance");
  const sujeto = leerTexto(r, "sujeto", "sujeto");
  const intentos = r["intentos"];
  const primerFalloAt = leerFecha(r, "primer_fallo_at", "primerFalloAt");
  if (
    alcance === null ||
    sujeto === null ||
    typeof intentos !== "number" ||
    primerFalloAt === null
  ) {
    return null;
  }
  return {
    alcance,
    sujeto,
    intentos,
    primerFalloAt,
    bloqueadoHasta: leerFechaNula(r, "bloqueado_hasta", "bloqueadoHasta"),
  };
}

function mapearInvitacionRow(fila: unknown): InvitacionRow | null {
  const r = comoRegistro(fila);
  if (r === null) {
    return null;
  }
  const id = leerTexto(r, "id", "id");
  const codigo = leerTexto(r, "codigo", "codigo");
  const creadaAt = leerFecha(r, "creada_at", "creadaAt");
  if (id === null || codigo === null || creadaAt === null) {
    return null;
  }
  return { id, codigo, vigente: r["vigente"] === true, creadaAt };
}

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
    .eq("username_normalizado", norm)
    .maybeSingle();
  if (error) {
    throw new Error(`[supabase] buscarUsuarioPorNorm: ${error.message}`);
  }
  if (data === null) {
    return null;
  }
  const fila = mapearUsuarioRow(data);
  if (fila === null) {
    throw new Error("[supabase] buscarUsuarioPorNorm: fila inválida");
  }
  return fila;
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
  const fila = mapearUsuarioRow(data);
  if (fila === null) {
    throw new Error("[supabase] buscarUsuarioPorId: fila inválida");
  }
  return fila;
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
      username_normalizado: entrada.usernameNorm,
      password_hash: entrada.hashPassword,
      es_temporal: false,
      onboarding_paso: 1,
      onboarding_completado_at: null,
      rol: "manager",
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(`[supabase] crearUsuario: ${error.message}`);
  }
  const fila = mapearUsuarioRow(data);
  if (fila === null) {
    throw new Error("[supabase] crearUsuario: fila inválida");
  }
  return fila;
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
  const filas = ((data ?? []) as unknown as Array<unknown>)
    .map(mapearInvitacionRow)
    .filter((f): f is InvitacionRow => f !== null);
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
  const fila = mapearRateLimitRow(data);
  if (fila === null) {
    throw new Error("[supabase] leerFilaRateLimit: fila inválida");
  }
  return fila;
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
      primer_fallo_at: fila.primerFalloAt.toISOString(),
      bloqueado_hasta: fila.bloqueadoHasta
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
      usuario_id: entrada.usuarioId,
      token_hash: entrada.tokenHash,
      expira_at: entrada.expiraAt.toISOString(),
      ultima_renovacion_at: entrada.ultimaRenovacionAt.toISOString(),
      revocada_at: null,
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(`[supabase] crearSesionDB: ${error.message}`);
  }
  const fila = mapearSesionRow(data);
  if (fila === null) {
    throw new Error("[supabase] crearSesionDB: fila inválida");
  }
  return fila;
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
  const fila = mapearSesionRow(data);
  if (fila === null) {
    throw new Error("[supabase] buscarSesionPorId: fila inválida");
  }
  return fila;
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
      expira_at: expiraAt.toISOString(),
      ultima_renovacion_at: ultimaRenovacionAt.toISOString(),
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
    .update({ revocada_at: ahora.toISOString() })
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
    .update({ revocada_at: ahora.toISOString() })
    .eq("usuario_id", usuarioId)
    .neq("id", exceptoId)
    .is("revocada_at", null);
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
    .update({ revocada_at: ahora.toISOString() })
    .eq("usuario_id", usuarioId)
    .is("revocada_at", null);
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
    .update({ es_temporal: esTemporal })
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
    .update({ password_hash: hashPassword, es_temporal: esTemporal })
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
      onboarding_paso: paso,
      onboarding_completado_at: completadoAt
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
