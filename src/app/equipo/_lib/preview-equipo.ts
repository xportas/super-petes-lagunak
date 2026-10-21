import { tieneBonusPosicion } from "@/src/lib/dominio/posiciones";
import { penalizacionPara as penalizacionRacha } from "@/src/lib/dominio/rachas";
import type { Posicion } from "@/src/lib/scoring/tipos";
import type { SlotPos } from "./validacion-equipo";

export type { SlotPos };

export type EstadoSanitarioPre = "disponible" | "lesionado";

export interface JugadorElegibleEquipo {
  readonly id: string;
  readonly nombre: string;
  readonly nombrePete: string | null;
  readonly img: string;
  readonly imgPete: string;
  readonly posicionesValidas: readonly [Posicion, Posicion] | null;
  readonly estadoSanitario: EstadoSanitarioPre;
  readonly activo: boolean;
}

export interface PreviewSlot {
  readonly muestraMas5: boolean;
  readonly penalizacionRacha: number | null;
  readonly baseCero: "ninguno" | "lesionado" | "inactivo";
  readonly avisoRachaFutura: boolean;
}

function esPosicionValida(
  valor: unknown,
): valor is readonly [Posicion, Posicion] {
  return (
    Array.isArray(valor) &&
    valor.length === 2 &&
    (valor[0] === "B" ||
      valor[0] === "E" ||
      valor[0] === "A" ||
      valor[0] === "AP" ||
      valor[0] === "P") &&
    (valor[1] === "B" ||
      valor[1] === "E" ||
      valor[1] === "A" ||
      valor[1] === "AP" ||
      valor[1] === "P")
  );
}

export function previewSlot(
  slot: SlotPos,
  jugador: JugadorElegibleEquipo | null,
  rachaPrevia: number | null,
): PreviewSlot {
  if (jugador === null) {
    return {
      muestraMas5: false,
      penalizacionRacha: null,
      baseCero: "ninguno",
      avisoRachaFutura: false,
    };
  }
  if (!jugador.activo) {
    return {
      muestraMas5: false,
      penalizacionRacha: null,
      baseCero: "inactivo",
      avisoRachaFutura: true,
    };
  }
  if (jugador.estadoSanitario === "lesionado") {
    return {
      muestraMas5: false,
      penalizacionRacha: null,
      baseCero: "lesionado",
      avisoRachaFutura: true,
    };
  }
  const validas = jugador.posicionesValidas;
  const muestraMas5 =
    validas !== null &&
    esPosicionValida(validas) &&
    tieneBonusPosicion(slot, validas, 1);
  const previa = rachaPrevia ?? 0;
  if (previa <= 0) {
    return {
      muestraMas5,
      penalizacionRacha: null,
      baseCero: "ninguno",
      avisoRachaFutura: false,
    };
  }
  const penalizacion = penalizacionRacha(previa + 1);
  return {
    muestraMas5,
    penalizacionRacha: penalizacion,
    baseCero: "ninguno",
    avisoRachaFutura: false,
  };
}
