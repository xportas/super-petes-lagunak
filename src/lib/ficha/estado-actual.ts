import { penalizacionPara } from "@/src/lib/dominio/rachas";
import type { EstadoActualDosLineas } from "./tipos";

export interface EntradaEstadoJugador {
  readonly activo: boolean;
  readonly estadoSanitario: "disponible" | "lesionado";
}

export function resolverEstadoActual(
  jugador: EntradaEstadoJugador,
  rachaActual: number | null,
): EstadoActualDosLineas {
  const lineaSanitaria = !jugador.activo
    ? ("baja" as const)
    : jugador.estadoSanitario === "lesionado"
      ? ("lesionado" as const)
      : ("disponible" as const);
  if (rachaActual === null) {
    return { lineaSanitaria, lineaRacha: { tipo: "no_aplica" } };
  }
  const apariciones = Math.max(0, Math.floor(rachaActual));
  const penalizacion = penalizacionPara(apariciones + 1);
  return { lineaSanitaria, lineaRacha: { tipo: "valor", penalizacion } };
}
