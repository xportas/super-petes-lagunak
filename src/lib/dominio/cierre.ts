import { HORAS_CIERRE } from "../scoring/constantes";
import type { JornadaOrdenable } from "./tipos";

export type CodigoCierre = "PASADO" | "SIN_HORA";

export type ResultadoCierre =
  | { readonly abierto: true; readonly cierre: Date }
  | { readonly abierto: false; readonly codigo: CodigoCierre };

export function calcularCierre(horaPartido: Date): Date {
  return new Date(horaPartido.getTime() - HORAS_CIERRE * 3600 * 1000);
}

export function validarCierre(
  horaPartido: Date | null,
  instanteInicio: Date,
): ResultadoCierre {
  if (horaPartido === null) {
    return { abierto: false, codigo: "SIN_HORA" };
  }
  if (!(horaPartido instanceof Date) || Number.isNaN(horaPartido.getTime())) {
    return { abierto: false, codigo: "SIN_HORA" };
  }
  if (!(instanteInicio instanceof Date) || Number.isNaN(instanteInicio.getTime())) {
    return { abierto: false, codigo: "SIN_HORA" };
  }
  const cierre = calcularCierre(horaPartido);
  if (instanteInicio.getTime() < cierre.getTime()) {
    return { abierto: true, cierre };
  }
  return { abierto: false, codigo: "PASADO" };
}

export function ordenarJornadasCanonico<T extends JornadaOrdenable>(
  jornadas: readonly T[],
): T[] {
  return [...jornadas].sort((a, b) => {
    const porHora = a.horaPartido.getTime() - b.horaPartido.getTime();
    if (porHora !== 0) {
      return porHora;
    }
    return a.numeroJornada - b.numeroJornada;
  });
}
