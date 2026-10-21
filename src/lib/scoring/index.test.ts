import { describe, expect, test } from "vitest";
import { agregarTemporada } from "./agregador-temporada";
import { calcularJornada } from "./calcular-jornada";
import { calcularJugador } from "./calcular-jugador";
import {
  BONUS_MVP,
  BONUS_POSICION,
  FACTOR_CAPITAN_DEN,
  FACTOR_CAPITAN_NUM,
  GRACIA_PAPEL_HORAS,
  HORAS_CIERRE,
  PENALIZACION_POR_EXPULSADO,
  PENALIZACION_SIN_QUINTETO,
} from "./constantes";
import { esExpulsion } from "./expulsion";
import * as barrel from "./index";
import { esMvpCapitan } from "./mvp";
import { redondearHalfUp } from "./redondeo";

describe("barrel scoring", () => {
  test("reexporta constantes, motor y tipos", () => {
    expect(barrel.BONUS_POSICION).toBe(BONUS_POSICION);
    expect(barrel.BONUS_MVP).toBe(BONUS_MVP);
    expect(barrel.PENALIZACION_SIN_QUINTETO).toBe(PENALIZACION_SIN_QUINTETO);
    expect(barrel.PENALIZACION_POR_EXPULSADO).toBe(
      PENALIZACION_POR_EXPULSADO,
    );
    expect(barrel.FACTOR_CAPITAN_NUM).toBe(FACTOR_CAPITAN_NUM);
    expect(barrel.FACTOR_CAPITAN_DEN).toBe(FACTOR_CAPITAN_DEN);
    expect(barrel.HORAS_CIERRE).toBe(HORAS_CIERRE);
    expect(barrel.GRACIA_PAPEL_HORAS).toBe(GRACIA_PAPEL_HORAS);
    expect(barrel.calcularJugador).toBe(calcularJugador);
    expect(barrel.calcularJornada).toBe(calcularJornada);
    expect(barrel.agregarTemporada).toBe(agregarTemporada);
    expect(barrel.esExpulsion).toBe(esExpulsion);
    expect(barrel.esMvpCapitan).toBe(esMvpCapitan);
    expect(barrel.redondearHalfUp).toBe(redondearHalfUp);
  });
});
