import type { AlcanceRateLimit, FilaRateLimit } from "./tipos";

export const MAX_INTENTOS_FALLIDOS = 5;
export const VENTANA_FALLOS_MS = 900000;
export const DURACION_BLOQUEO_MS = 900000;

export interface EvaluacionIntento {
  readonly permitido: boolean;
  readonly reiniciarVentana: boolean;
}

export interface ContextoSujeto {
  readonly usernameNorm?: string;
  readonly usuarioId?: string;
  readonly ip?: string;
}

export function estaBloqueado(fila: FilaRateLimit | null, ahora: Date): boolean {
  if (fila === null) {
    return false;
  }
  if (fila.bloqueadoHasta === null) {
    return false;
  }
  return ahora.getTime() < fila.bloqueadoHasta.getTime();
}

export function evaluarIntento(
  fila: FilaRateLimit | null,
  ahora: Date,
): EvaluacionIntento {
  if (fila === null) {
    return { permitido: true, reiniciarVentana: true };
  }
  if (fila.bloqueadoHasta !== null) {
    if (ahora.getTime() < fila.bloqueadoHasta.getTime()) {
      return { permitido: false, reiniciarVentana: false };
    }
    return { permitido: true, reiniciarVentana: true };
  }
  if (ahora.getTime() - fila.primerFalloAt.getTime() > VENTANA_FALLOS_MS) {
    return { permitido: true, reiniciarVentana: true };
  }
  return { permitido: true, reiniciarVentana: false };
}

export interface SiguienteFila {
  readonly intentos: number;
  readonly primerFalloAt: Date;
  readonly bloqueadoHasta: Date | null;
}

export function siguienteFilaTrasFallo(
  fila: FilaRateLimit | null,
  ahora: Date,
): SiguienteFila {
  if (fila !== null && fila.bloqueadoHasta !== null) {
    if (ahora.getTime() < fila.bloqueadoHasta.getTime()) {
      return {
        intentos: fila.intentos,
        primerFalloAt: fila.primerFalloAt,
        bloqueadoHasta: fila.bloqueadoHasta,
      };
    }
  }
  if (
    fila === null ||
    fila.bloqueadoHasta !== null ||
    ahora.getTime() - fila.primerFalloAt.getTime() > VENTANA_FALLOS_MS
  ) {
    return { intentos: 1, primerFalloAt: ahora, bloqueadoHasta: null };
  }
  const siguientes = fila.intentos + 1;
  if (siguientes >= MAX_INTENTOS_FALLIDOS) {
    return {
      intentos: siguientes,
      primerFalloAt: fila.primerFalloAt,
      bloqueadoHasta: new Date(ahora.getTime() + DURACION_BLOQUEO_MS),
    };
  }
  return {
    intentos: siguientes,
    primerFalloAt: fila.primerFalloAt,
    bloqueadoHasta: null,
  };
}

export function sujetoPara(
  alcance: AlcanceRateLimit,
  contexto: ContextoSujeto,
): string {
  if (alcance === "login") {
    const norm = contexto.usernameNorm;
    if (typeof norm === "string" && norm.length > 0) {
      return norm;
    }
    return "desconocido";
  }
  if (alcance === "cambiar_password") {
    const id = contexto.usuarioId;
    if (typeof id === "string" && id.length > 0) {
      return id;
    }
    return "desconocido";
  }
  const ip = contexto.ip;
  if (typeof ip === "string" && ip.length > 0) {
    return ip;
  }
  return "127.0.0.1";
}
