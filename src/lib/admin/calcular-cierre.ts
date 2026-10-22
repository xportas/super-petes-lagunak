import { HORAS_CIERRE } from "@/src/lib/scoring/constantes";

export function calcularCierre(horaPartido: Date): Date {
  return new Date(horaPartido.getTime() - HORAS_CIERRE * 3600 * 1000);
}
