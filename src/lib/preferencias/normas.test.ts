import { describe, expect, test } from "vitest";
import { anclaDe, ORDEN_BLOQUES } from "./normas";

describe("ORDEN_BLOQUES", () => {
  test("orden canonico fijo", () => {
    expect([...ORDEN_BLOQUES]).toEqual([
      "cierre",
      "base",
      "entrenadores",
      "posicion",
      "racha",
      "mvp",
      "expulsion",
      "orden",
    ]);
  });
  test("anclaDe cubre las ocho", () => {
    expect(ORDEN_BLOQUES.map(anclaDe)).toEqual([
      "#cierre",
      "#base",
      "#entrenadores",
      "#posicion",
      "#racha",
      "#mvp",
      "#expulsion",
      "#orden",
    ]);
  });
  test("hash desconocido no rompe: se muestran los ocho", () => {
    const conocido = new Set(ORDEN_BLOQUES.map(anclaDe));
    expect(conocido.has("#inexistente" as never)).toBe(false);
    expect(ORDEN_BLOQUES.length).toBe(8);
  });
});
