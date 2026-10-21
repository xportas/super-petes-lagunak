import { describe, expect, test } from "vitest";
import { calcularRachas, penalizacionPara } from "./rachas";
import type { EventoAparicion } from "./tipos";

function evento(
  jugadorId: string,
  jornadaId: string,
  numeroJornada: number,
  hora: string,
  over: Partial<EventoAparicion> = {},
): EventoAparicion {
  return {
    jugadorId,
    jornadaId,
    horaPartido: new Date(hora),
    numeroJornada,
    estadoJornada: "calculada",
    alineado: true,
    quintetoValido: true,
    ...over,
  };
}

describe("rachas (RF-08, RF-09, E-07, E-08)", () => {
  test("penalización 1ª–4ª y siguientes: 0,-1,-2,-3 sin tope", () => {
    expect(penalizacionPara(1)).toBe(0);
    expect(penalizacionPara(2)).toBe(-1);
    expect(penalizacionPara(3)).toBe(-2);
    expect(penalizacionPara(4)).toBe(-3);
    expect(penalizacionPara(10)).toBe(-9);
  });

  test("racha cuenta apariciones consecutivas en orden canónico", () => {
    const h = [
      evento("a", "J2", 2, "2026-10-11T18:00:00+02:00"),
      evento("a", "J1", 1, "2026-10-04T18:00:00+02:00"),
      evento("a", "J3", 3, "2026-10-18T18:00:00+02:00"),
    ];
    expect(calcularRachas(h).get("a")).toBe(3);
  });

  test("ruptura por no alinear: la siguiente cuenta como 1ª", () => {
    const h = [
      evento("a", "J1", 1, "2026-10-04T18:00:00+02:00"),
      evento("a", "J2", 2, "2026-10-11T18:00:00+02:00", {
        alineado: false,
      }),
      evento("a", "J3", 3, "2026-10-18T18:00:00+02:00"),
    ];
    expect(calcularRachas(h).get("a")).toBe(1);
  });

  test("ruptura por sin envío válido", () => {
    const h = [
      evento("a", "J1", 1, "2026-10-04T18:00:00+02:00"),
      evento("a", "J2", 2, "2026-10-11T18:00:00+02:00", {
        quintetoValido: false,
        alineado: false,
      }),
      evento("a", "J3", 3, "2026-10-18T18:00:00+02:00"),
    ];
    expect(calcularRachas(h).get("a")).toBe(1);
  });

  test("lesionado alineado cuenta para racha futura", () => {
    const h = [
      evento("a", "J1", 1, "2026-10-04T18:00:00+02:00"),
      evento("a", "J2", 2, "2026-10-11T18:00:00+02:00"),
    ];
    expect(calcularRachas(h).get("a")).toBe(2);
  });

  test("calculada e invalidada cuentan; papel rompe a 0", () => {
    const h = [
      evento("a", "J1", 1, "2026-10-04T18:00:00+02:00", {
        estadoJornada: "calculada",
      }),
      evento("a", "J2", 2, "2026-10-11T18:00:00+02:00", {
        estadoJornada: "invalidada",
      }),
      evento("a", "J3", 3, "2026-10-18T18:00:00+02:00", {
        estadoJornada: "papel",
      }),
      evento("a", "J4", 4, "2026-10-25T18:00:00+02:00", {
        estadoJornada: "calculada",
      }),
    ];
    expect(calcularRachas(h).get("a")).toBe(1);
  });

  test("pendiente no cuenta ni rompe", () => {
    const h = [
      evento("a", "J1", 1, "2026-10-04T18:00:00+02:00"),
      evento("a", "J2", 2, "2026-10-11T18:00:00+02:00", {
        estadoJornada: "pendiente",
      }),
      evento("a", "J3", 3, "2026-10-18T18:00:00+02:00"),
    ];
    expect(calcularRachas(h).get("a")).toBe(2);
  });

  test("J1 y alta mid-season cuentan como 1ª", () => {
    const h = [evento("nuevo", "J5", 5, "2026-11-01T18:00:00+01:00")];
    expect(calcularRachas(h).get("nuevo")).toBe(1);
  });

  test("desempate por numero_jornada con misma hora", () => {
    const h = [
      evento("a", "JB", 2, "2026-10-11T18:00:00+02:00"),
      evento("a", "JA", 1, "2026-10-11T18:00:00+02:00"),
    ];
    const r = calcularRachas(h);
    expect(r.get("a")).toBe(2);
  });
});
