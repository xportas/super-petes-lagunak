import { sonMismaCasilla } from "../dominio/posiciones";
import {
  BONUS_POSICION,
  FACTOR_CAPITAN_DEN,
  FACTOR_CAPITAN_NUM,
} from "./constantes";
import { redondearHalfUp } from "./redondeo";
import type {
  DesgloseJugador,
  EntradaJugador,
  Entrenador,
  ErrorCalculo,
  Posicion,
} from "./tipos";

const POSICIONES_PERMITIDAS: readonly Posicion[] = [
  "B",
  "E",
  "A",
  "AP",
  "P",
];

function esPosicion(valor: unknown): valor is Posicion {
  return (
    typeof valor === "string" &&
    (POSICIONES_PERMITIDAS as readonly string[]).includes(valor)
  );
}

function esNoJugo(
  estado: EntradaJugador["estado"],
): estado is "lesionado" | "no_convocado" | "dnp" {
  return (
    estado === "lesionado" ||
    estado === "no_convocado" ||
    estado === "dnp"
  );
}

export function calcularJugador(
  entrada: EntradaJugador,
  rachaN: number,
  entrenador: Entrenador,
): DesgloseJugador | { readonly error: ErrorCalculo } {
  if (entrada.valoracionFNB === null || entrada.valoracionFNB === undefined) {
    return {
      error: { codigo: "DATO_AUSENTE", jugadorId: entrada.jugadorId },
    };
  }
  if (!esPosicion(entrada.posicionAlineada)) {
    return {
      error: { codigo: "POSICIONES_INVALIDAS", jugadorId: entrada.jugadorId },
    };
  }
  const validas: unknown = entrada.posicionesValidas;
  if (!Array.isArray(validas) || validas.length !== 2) {
    return {
      error: { codigo: "POSICIONES_INVALIDAS", jugadorId: entrada.jugadorId },
    };
  }
  const primera: unknown = validas[0];
  const segunda: unknown = validas[1];
  if (!esPosicion(primera) || !esPosicion(segunda)) {
    return {
      error: { codigo: "POSICIONES_INVALIDAS", jugadorId: entrada.jugadorId },
    };
  }
  if (esNoJugo(entrada.estado) && entrada.expulsado) {
    return {
      error: {
        codigo: "LESION_EXPULSION_EXCLUYENTES",
        jugadorId: entrada.jugadorId,
      },
    };
  }
  const base = esNoJugo(entrada.estado) ? 0 : entrada.valoracionFNB;
  let trasEntrenador: number;
  if (entrenador === "maider") {
    trasEntrenador = entrada.esCapitan
      ? redondearHalfUp((base * FACTOR_CAPITAN_NUM) / FACTOR_CAPITAN_DEN)
      : base;
  } else {
    const suelo = Math.max(base, 1);
    trasEntrenador = suelo + 1;
  }
  let bonusPosicion: 0 | 5 = 0;
  if (base !== 0) {
    const coincide =
      sonMismaCasilla(entrada.posicionAlineada, primera) ||
      sonMismaCasilla(entrada.posicionAlineada, segunda);
    if (coincide) {
      bonusPosicion = BONUS_POSICION;
    }
  }
  const aparicion = Math.max(1, Math.floor(rachaN));
  const penalizacionRacha = base === 0 ? 0 : 1 - aparicion;
  const subtotal = trasEntrenador + bonusPosicion + penalizacionRacha;
  return {
    jugadorId: entrada.jugadorId,
    base,
    trasEntrenador,
    bonusPosicion,
    penalizacionRacha,
    subtotal,
  };
}
