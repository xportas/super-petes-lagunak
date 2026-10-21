import type { PasoOnboarding } from "./tipos";

export interface JornadaOnboarding {
  readonly jornadaId: string;
  readonly horaPartido: Date | null;
  readonly estado: "pendiente" | "calculada" | "papel" | "invalidada";
}

export type EstadoOnboarding =
  | { readonly estado: "sin_jornada" }
  | { readonly estado: "cierre_pasado" }
  | { readonly estado: "quinteto_requerido"; readonly jornadaId: string }
  | { readonly estado: "listo_paso_2" };

export function estadoOnboardingPara(
  onboardingPaso: PasoOnboarding,
  jornada: JornadaOnboarding | null,
  ahora: Date,
  tieneQuinteto: boolean,
): EstadoOnboarding {
  if (onboardingPaso === "completado") {
    return { estado: "listo_paso_2" };
  }
  if (jornada === null) {
    return { estado: "sin_jornada" };
  }
  if (jornada.estado !== "pendiente") {
    return { estado: "sin_jornada" };
  }
  if (jornada.horaPartido === null) {
    return { estado: "sin_jornada" };
  }
  const cierre = new Date(jornada.horaPartido.getTime() - 3 * 3600 * 1000);
  if (ahora.getTime() >= cierre.getTime()) {
    return { estado: "cierre_pasado" };
  }
  if (tieneQuinteto) {
    return { estado: "listo_paso_2" };
  }
  return { estado: "quinteto_requerido", jornadaId: jornada.jornadaId };
}

export function necesitaQuinteto(estado: EstadoOnboarding): boolean {
  return estado.estado === "quinteto_requerido";
}

export function puedeConfirmarPaso2(
  onboardingPaso: PasoOnboarding,
  entendido: boolean,
): boolean {
  if (onboardingPaso === "completado") {
    return false;
  }
  return entendido === true;
}
