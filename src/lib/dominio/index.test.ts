import { describe, expect, test } from "vitest";
import {
  calcularCierre,
  ordenarJornadasCanonico,
  validarCierre,
} from "./cierre";
import {
  esquemaActaJugador,
  esquemaConteosFaltas,
  esquemaEntrenador,
  esquemaPosicion,
  esquemaPosicionesValidas,
  esquemaQuintetoInput,
} from "./esquemas";
import * as barrel from "./index";
import {
  sonMismaCasilla,
  tieneBonusPosicion,
  validarPosicionesValidas,
} from "./posiciones";
import { calcularRachas, penalizacionPara } from "./rachas";
import { validarQuinteto } from "./validar-quinteto";

describe("barrel dominio", () => {
  test("reexporta cierre, esquemas, posiciones, rachas y validación", () => {
    expect(barrel.calcularCierre).toBe(calcularCierre);
    expect(barrel.validarCierre).toBe(validarCierre);
    expect(barrel.ordenarJornadasCanonico).toBe(ordenarJornadasCanonico);
    expect(barrel.esquemaPosicion).toBe(esquemaPosicion);
    expect(barrel.esquemaPosicionesValidas).toBe(esquemaPosicionesValidas);
    expect(barrel.esquemaEntrenador).toBe(esquemaEntrenador);
    expect(barrel.esquemaConteosFaltas).toBe(esquemaConteosFaltas);
    expect(barrel.esquemaQuintetoInput).toBe(esquemaQuintetoInput);
    expect(barrel.esquemaActaJugador).toBe(esquemaActaJugador);
    expect(barrel.sonMismaCasilla).toBe(sonMismaCasilla);
    expect(barrel.validarPosicionesValidas).toBe(validarPosicionesValidas);
    expect(barrel.tieneBonusPosicion).toBe(tieneBonusPosicion);
    expect(barrel.calcularRachas).toBe(calcularRachas);
    expect(barrel.penalizacionPara).toBe(penalizacionPara);
    expect(barrel.validarQuinteto).toBe(validarQuinteto);
  });
});
