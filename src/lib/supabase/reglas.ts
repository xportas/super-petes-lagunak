import {
  GRACIA_PAPEL_HORAS,
  PENALIZACION_SIN_QUINTETO,
} from "@/src/lib/scoring/constantes";
import { validarCierre } from "@/src/lib/dominio/cierre";
import type { EstadoActa, EstadoJornada } from "./tipos";

const MS_POR_HORA = 3600 * 1000;

export function esEnvioEnPlazo(
  instanteInicio: Date,
  horaPartido: Date | null,
): boolean {
  const r = validarCierre(horaPartido, instanteInicio);
  return r.abierto;
}

export function debeMarcarPapel(
  horaPartido: Date,
  fnbUniversallyId: string | null,
  ahora: Date,
  finalizado: boolean,
): boolean {
  if (!finalizado) {
    return false;
  }
  if (fnbUniversallyId !== null) {
    return false;
  }
  return (
    ahora.getTime() >= horaPartido.getTime() + GRACIA_PAPEL_HORAS * MS_POR_HORA
  );
}

export function estadoTrasGracia(
  horaPartido: Date,
  fnbUniversallyId: string | null,
  ahora: Date,
  finalizado: boolean,
): Extract<EstadoJornada, "pendiente" | "papel"> {
  return debeMarcarPapel(horaPartido, fnbUniversallyId, ahora, finalizado)
    ? "papel"
    : "pendiente";
}

export function totalJornadaPapel(): 0 {
  return 0;
}

export function totalAusenciaSinQuinteto(): -10 {
  return PENALIZACION_SIN_QUINTETO;
}

export function esManagerActivoParaJornada(
  onboardingCompletadoAt: Date | null,
  cierre: Date,
): boolean {
  if (onboardingCompletadoAt === null) {
    return false;
  }
  if (
    !(onboardingCompletadoAt instanceof Date) ||
    Number.isNaN(onboardingCompletadoAt.getTime())
  ) {
    return false;
  }
  return onboardingCompletadoAt.getTime() < cierre.getTime();
}

export function resolverEstadoConLesionadoPrevio(
  estadoSanitarioPrevio: "disponible" | "lesionado",
  timePlayed: number | null,
  presenteEnActa: boolean,
): EstadoActa {
  if (!presenteEnActa || timePlayed === null) {
    if (estadoSanitarioPrevio === "lesionado") {
      return "lesionado";
    }
    return "no_convocado";
  }
  if (timePlayed > 0) {
    return "jugo";
  }
  if (presenteEnActa && timePlayed === 0) {
    if (estadoSanitarioPrevio === "lesionado") {
      return "lesionado";
    }
    return "dnp";
  }
  if (estadoSanitarioPrevio === "lesionado") {
    return "lesionado";
  }
  return "no_convocado";
}

export function bloqueaCalculoPorPendientes(
  posicionesPorJugador: readonly (readonly [string, string] | null | undefined)[],
  estadoJornada: EstadoJornada,
): boolean {
  if (estadoJornada === "papel") {
    return false;
  }
  for (const p of posicionesPorJugador) {
    if (p === null || p === undefined) {
      return true;
    }
  }
  return false;
}

export function rompeRachaPapel(): 0 {
  return 0;
}
