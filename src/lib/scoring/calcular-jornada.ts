import {
  BONUS_MVP,
  PENALIZACION_POR_EXPULSADO,
  PENALIZACION_SIN_QUINTETO,
} from "./constantes";
import { calcularJugador } from "./calcular-jugador";
import { esMvpCapitan } from "./mvp";
import type {
  DesgloseJugador,
  EntradaJornada,
  EntradaJugador,
  ErrorCalculo,
  ResultadoJornada,
} from "./tipos";

export type EntradaJornadaSinQuinteto = {
  readonly sinQuinteto: true;
};

export type EntradaJornadaPapel = {
  readonly papel: true;
};

export type EntradaCalculoJornada =
  | EntradaJornada
  | EntradaJornadaSinQuinteto
  | EntradaJornadaPapel;

function esSinQuinteto(
  entrada: EntradaCalculoJornada,
): entrada is EntradaJornadaSinQuinteto {
  return "sinQuinteto" in entrada;
}

function esPapel(
  entrada: EntradaCalculoJornada,
): entrada is EntradaJornadaPapel {
  return "papel" in entrada;
}

export function calcularJornada(
  entrada: EntradaCalculoJornada,
): ResultadoJornada | { readonly error: ErrorCalculo } {
  if (esSinQuinteto(entrada)) {
    return {
      porJugador: [],
      esMvp: false,
      bonusMvp: 0,
      expulsiones: 0,
      penalizacionExpulsion: 0,
      total: PENALIZACION_SIN_QUINTETO,
    };
  }
  if (esPapel(entrada)) {
    return {
      porJugador: [],
      esMvp: false,
      bonusMvp: 0,
      expulsiones: 0,
      penalizacionExpulsion: 0,
      total: 0,
    };
  }
  if (entrada.quinteto.length !== 5) {
    return { error: { codigo: "DATO_AUSENTE" } };
  }
  const porJugador: DesgloseJugador[] = [];
  let baseCapitan = 0;
  let capitanJugo = false;
  let hayCapitan = false;
  for (const jugador of entrada.quinteto) {
    const entradaJugador: EntradaJugador = jugador;
    const penalizacionGuardada =
      entrada.penalizacionRachaPorJugador[entradaJugador.jugadorId] ?? 0;
    const rachaN = 1 - penalizacionGuardada;
    const calculado = calcularJugador(
      entradaJugador,
      rachaN,
      entrada.entrenador,
    );
    if ("error" in calculado) {
      return calculado;
    }
    porJugador.push(calculado);
    if (jugador.esCapitan) {
      hayCapitan = true;
      baseCapitan = calculado.base;
      capitanJugo = jugador.estado === "jugo";
    }
  }
  let expulsiones = 0;
  for (const jugador of entrada.quinteto) {
    if (jugador.expulsado) {
      expulsiones += 1;
    }
  }
  const penalizacionExpulsion =
    0 - PENALIZACION_POR_EXPULSADO * expulsiones;
  let esMvp = false;
  if (hayCapitan) {
    const candidato = esMvpCapitan({
      capitanJugo,
      baseCapitan,
      maxBaseJugo: entrada.plantillaBaseMax.maxBase,
    });
    esMvp =
      entrada.plantillaBaseMax.jugoAlguno &&
      entrada.plantillaBaseMax.capitanEsMaximo &&
      candidato;
  }
  const bonusMvp: 0 | 3 = esMvp ? BONUS_MVP : 0;
  let suma = 0;
  for (const d of porJugador) {
    suma += d.subtotal;
  }
  const total = suma + bonusMvp + penalizacionExpulsion;
  return {
    porJugador,
    esMvp,
    bonusMvp,
    expulsiones,
    penalizacionExpulsion,
    total,
  };
}
