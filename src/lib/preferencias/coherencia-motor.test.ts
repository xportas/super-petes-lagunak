import { describe, expect, test } from "vitest";
import { penalizacionPara } from "@/src/lib/dominio/rachas";
import { calcularJugador } from "@/src/lib/scoring/calcular-jugador";
import {
  BONUS_MVP,
  BONUS_POSICION,
  FACTOR_CAPITAN_DEN,
  FACTOR_CAPITAN_NUM,
  HORAS_CIERRE,
  PENALIZACION_POR_EXPULSADO,
  PENALIZACION_SIN_QUINTETO,
} from "@/src/lib/scoring/constantes";
import type { Posicion } from "@/src/lib/scoring/tipos";

describe("coherencia motor para /normas (E-04, E-05)", () => {
  test("penalizacionPara 1..4 progresiva", () => {
    expect([
      penalizacionPara(1),
      penalizacionPara(2),
      penalizacionPara(3),
      penalizacionPara(4),
    ]).toEqual([0, -1, -2, -3]);
  });
  test("constantes vigentes", () => {
    expect(BONUS_POSICION).toBe(5);
    expect(BONUS_MVP).toBe(3);
    expect(PENALIZACION_POR_EXPULSADO).toBe(5);
    expect(FACTOR_CAPITAN_NUM).toBe(3);
    expect(FACTOR_CAPITAN_DEN).toBe(2);
    expect(HORAS_CIERRE).toBe(3);
    expect(PENALIZACION_SIN_QUINTETO).toBe(-10);
  });
  test("capitan 13 con maider llega a 20", () => {
    const r = calcularJugador(
      {
        jugadorId: "ejemplo",
        valoracionFNB: 13,
        estado: "jugo",
        expulsado: false,
        posicionesValidas: ["B", "E"] as readonly [Posicion, Posicion],
        posicionAlineada: "P",
        esCapitan: true,
      },
      1,
      "maider",
    );
    if ("error" in r) {
      throw new Error("no deberia dar error");
    }
    expect(r.base).toBe(13);
    expect(r.trasEntrenador).toBe(20);
  });
  test("base cero con pater llega a 2", () => {
    const r = calcularJugador(
      {
        jugadorId: "ejemplo",
        valoracionFNB: 12,
        estado: "lesionado",
        expulsado: false,
        posicionesValidas: ["B", "E"] as readonly [Posicion, Posicion],
        posicionAlineada: "B",
        esCapitan: false,
      },
      1,
      "pater",
    );
    if ("error" in r) {
      throw new Error("no deberia dar error");
    }
    expect(r.base).toBe(0);
    expect(r.trasEntrenador).toBe(2);
    expect(r.subtotal).toBe(2);
  });
  test("desglose 12 mas bonus menos racha es 16", () => {
    const r = calcularJugador(
      {
        jugadorId: "ejemplo",
        valoracionFNB: 12,
        estado: "jugo",
        expulsado: false,
        posicionesValidas: ["B", "E"] as readonly [Posicion, Posicion],
        posicionAlineada: "B",
        esCapitan: false,
      },
      2,
      "maider",
    );
    if ("error" in r) {
      throw new Error("no deberia dar error");
    }
    expect(r.base).toBe(12);
    expect(r.bonusPosicion).toBe(BONUS_POSICION);
    expect(r.penalizacionRacha).toBe(-1);
    expect(r.subtotal).toBe(16);
  });
});
