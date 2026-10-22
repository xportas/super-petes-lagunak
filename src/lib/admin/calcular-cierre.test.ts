import { describe, expect, test } from "vitest";
import { calcularCierre } from "./calcular-cierre";

describe("admin calcularCierre = hora-3h (RF-03)", () => {
  test("resta exactamente 3h en verano Europe/Madrid", () => {
    const hora = new Date("2026-07-11T18:00:00+02:00");
    expect(calcularCierre(hora).toISOString()).toBe(
      new Date("2026-07-11T15:00:00+02:00").toISOString(),
    );
  });

  test("resta exactamente 3h en invierno CET", () => {
    const hora = new Date("2026-12-13T18:00:00+01:00");
    expect(calcularCierre(hora).toISOString()).toBe(
      new Date("2026-12-13T15:00:00+01:00").toISOString(),
    );
  });

  test("no muta la fecha original", () => {
    const hora = new Date("2026-07-11T18:00:00+02:00");
    const antes = hora.getTime();
    calcularCierre(hora);
    expect(hora.getTime()).toBe(antes);
  });
});
