import { describe, expect, test } from "vitest";
import {
  calcularCierre,
  ordenarJornadasCanonico,
  validarCierre,
} from "./cierre";

describe("cierre en servidor (RF-16, E-18, E-19)", () => {
  test("cierre = hora - 3h", () => {
    const hora = new Date("2026-10-11T18:00:00+02:00");
    expect(calcularCierre(hora).getTime()).toBe(
      hora.getTime() - 3 * 3600 * 1000,
    );
  });

  test("instante estrictamente anterior abre", () => {
    const hora = new Date("2026-10-11T18:00:00+02:00");
    const cierre = calcularCierre(hora);
    const antes = new Date(cierre.getTime() - 1);
    const r = validarCierre(hora, antes);
    expect(r.abierto).toBe(true);
  });

  test("segundo exacto rechaza (E-18)", () => {
    const hora = new Date("2026-10-11T18:00:00+02:00");
    const cierre = calcularCierre(hora);
    expect(validarCierre(hora, cierre)).toEqual({
      abierto: false,
      codigo: "PASADO",
    });
  });

  test("posterior rechaza", () => {
    const hora = new Date("2026-10-11T18:00:00+02:00");
    const cierre = calcularCierre(hora);
    const despues = new Date(cierre.getTime() + 1000);
    expect(validarCierre(hora, despues)).toEqual({
      abierto: false,
      codigo: "PASADO",
    });
  });

  test("sin hora → SIN_HORA (E-19)", () => {
    expect(
      validarCierre(null, new Date("2026-10-11T12:00:00+02:00")),
    ).toEqual({ abierto: false, codigo: "SIN_HORA" });
  });

  test("hora inválida → SIN_HORA", () => {
    expect(
      validarCierre(
        new Date("no-fecha"),
        new Date("2026-10-11T12:00:00+02:00"),
      ),
    ).toEqual({ abierto: false, codigo: "SIN_HORA" });
  });

  test("hora no-Date → SIN_HORA", () => {
    expect(
      validarCierre(
        "2026-10-11" as unknown as Date,
        new Date("2026-10-11T12:00:00+02:00"),
      ),
    ).toEqual({ abierto: false, codigo: "SIN_HORA" });
  });

  test("instante inválido → SIN_HORA", () => {
    expect(
      validarCierre(
        new Date("2026-10-11T18:00:00+02:00"),
        new Date("no-fecha"),
      ),
    ).toEqual({ abierto: false, codigo: "SIN_HORA" });
  });

  test("instante no-Date → SIN_HORA", () => {
    expect(
      validarCierre(new Date("2026-10-11T18:00:00+02:00"), 123 as unknown as Date),
    ).toEqual({ abierto: false, codigo: "SIN_HORA" });
  });

  test("cambio de hora no invalida lo guardado: el cierre se recalcula", () => {
    const vieja = new Date("2026-10-11T18:00:00+02:00");
    const nueva = new Date("2026-10-11T20:00:00+02:00");
    const instante = new Date("2026-10-11T14:59:59+02:00");
    expect(validarCierre(vieja, instante).abierto).toBe(true);
    const recalculado = validarCierre(nueva, instante);
    expect(recalculado.abierto).toBe(true);
    if (recalculado.abierto) {
      expect(recalculado.cierre.getTime()).toBe(
        nueva.getTime() - 3 * 3600 * 1000,
      );
    }
  });

  test("orden canónico hora ASC, numero ASC", () => {
    const j = [
      {
        jornadaId: "J2",
        numeroJornada: 2,
        horaPartido: new Date("2026-10-11T18:00:00+02:00"),
        estado: "calculada" as const,
      },
      {
        jornadaId: "J1",
        numeroJornada: 1,
        horaPartido: new Date("2026-10-04T18:00:00+02:00"),
        estado: "calculada" as const,
      },
      {
        jornadaId: "J3",
        numeroJornada: 3,
        horaPartido: new Date("2026-10-18T18:00:00+02:00"),
        estado: "pendiente" as const,
      },
    ];
    const ordenadas = ordenarJornadasCanonico(j);
    expect(ordenadas.map((x) => x.jornadaId)).toEqual(["J1", "J2", "J3"]);
  });

  test("misma hora desempata por numero ASC", () => {
    const hora = new Date("2026-10-11T18:00:00+02:00");
    const j = [
      {
        jornadaId: "JB",
        numeroJornada: 2,
        horaPartido: hora,
        estado: "calculada" as const,
      },
      {
        jornadaId: "JA",
        numeroJornada: 1,
        horaPartido: hora,
        estado: "calculada" as const,
      },
    ];
    expect(ordenarJornadasCanonico(j).map((x) => x.jornadaId)).toEqual([
      "JA",
      "JB",
    ]);
  });
});
