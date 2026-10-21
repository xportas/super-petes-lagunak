import { describe, expect, test } from "vitest";
import {
  estadoOnboardingPara,
  necesitaQuinteto,
  puedeConfirmarPaso2,
} from "./onboarding";

describe("onboarding 2 pasos reanudable (RF-11/12/13 E-06)", () => {
  test("sin jornada muestra informativo", () => {
    const r = estadoOnboardingPara(
      1,
      null,
      new Date("2026-10-11T10:00:00+02:00"),
      false,
    );
    expect(r).toEqual({ estado: "sin_jornada" });
    expect(necesitaQuinteto(r)).toBe(false);
  });

  test("jornada no pendiente muestra informativo", () => {
    const r = estadoOnboardingPara(
      1,
      {
        jornadaId: "j1",
        horaPartido: new Date("2026-10-11T18:00:00+02:00"),
        estado: "calculada",
      },
      new Date("2026-10-11T10:00:00+02:00"),
      false,
    );
    expect(r).toEqual({ estado: "sin_jornada" });
  });

  test("cierre pasado muestra informativo sin -10", () => {
    const hora = new Date("2026-10-11T18:00:00+02:00");
    const cierre = new Date(hora.getTime() - 3 * 3600 * 1000);
    const r = estadoOnboardingPara(
      1,
      { jornadaId: "j1", horaPartido: hora, estado: "pendiente" },
      cierre,
      false,
    );
    expect(r).toEqual({ estado: "cierre_pasado" });
  });

  test("con jornada abierta exige quinteto y luego paso 2", () => {
    const hora = new Date("2026-10-11T18:00:00+02:00");
    const antes = new Date(hora.getTime() - 3 * 3600 * 1000 - 1000);
    const r1 = estadoOnboardingPara(
      1,
      { jornadaId: "j1", horaPartido: hora, estado: "pendiente" },
      antes,
      false,
    );
    expect(r1).toEqual({ estado: "quinteto_requerido", jornadaId: "j1" });
    expect(necesitaQuinteto(r1)).toBe(true);
    const r2 = estadoOnboardingPara(
      1,
      { jornadaId: "j1", horaPartido: hora, estado: "pendiente" },
      antes,
      true,
    );
    expect(r2).toEqual({ estado: "listo_paso_2" });
  });

  test("completado nunca vuelve a paso 1", () => {
    const r = estadoOnboardingPara(
      "completado",
      null,
      new Date("2026-10-11T10:00:00+02:00"),
      false,
    );
    expect(r).toEqual({ estado: "listo_paso_2" });
  });

  test("confirmar paso 2 exige entendido y no completado", () => {
    expect(puedeConfirmarPaso2(2, true)).toBe(true);
    expect(puedeConfirmarPaso2(2, false)).toBe(false);
    expect(puedeConfirmarPaso2("completado", true)).toBe(false);
  });

  test("hora nula es sin_jornada", () => {
    const r = estadoOnboardingPara(
      1,
      { jornadaId: "j1", horaPartido: null, estado: "pendiente" },
      new Date("2026-10-11T10:00:00+02:00"),
      false,
    );
    expect(r).toEqual({ estado: "sin_jornada" });
  });
});
