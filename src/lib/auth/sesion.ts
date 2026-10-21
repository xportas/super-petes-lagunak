import { createHash, randomBytes } from "node:crypto";
import type { Sesion } from "./tipos";

export const SESION_DIAS = 30;
export const UMBRAL_RENOVACION_MS = 3600000;
const SESION_MS = SESION_DIAS * 24 * 3600 * 1000;

export function nuevaExpiracion(ahora: Date): Date {
  return new Date(ahora.getTime() + SESION_MS);
}

export function debeRenovar(
  ultimaRenovacionAt: Date,
  ahora: Date,
): boolean {
  return ahora.getTime() - ultimaRenovacionAt.getTime() > UMBRAL_RENOVACION_MS;
}

export function generarTokenSesion(): string {
  return randomBytes(32).toString("hex");
}

export function hashearTokenSesion(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function revocarUna(
  sesiones: readonly Sesion[],
  id: string,
  ahora: Date,
): Sesion[] {
  return sesiones.map((s) => {
    if (s.id !== id) {
      return s;
    }
    if (s.revocadaAt !== null) {
      return s;
    }
    return { ...s, revocadaAt: ahora };
  });
}

export function revocarTodasMenos(
  sesiones: readonly Sesion[],
  usuarioId: string,
  exceptoId: string,
  ahora: Date,
): Sesion[] {
  return sesiones.map((s) => {
    if (s.usuarioId !== usuarioId) {
      return s;
    }
    if (s.id === exceptoId) {
      return s;
    }
    if (s.revocadaAt !== null) {
      return s;
    }
    return { ...s, revocadaAt: ahora };
  });
}
