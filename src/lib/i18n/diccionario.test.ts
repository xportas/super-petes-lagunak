import { describe, expect, test, vi } from "vitest";
import { cargarDiccionario } from "./index";

describe("cargarDiccionario", () => {
  test("es resuelve el diccionario mínimo (RF-10)", () => {
    const dict = cargarDiccionario("es");
    const ui = dict["ui"];
    if (typeof ui !== "object" || ui === null) {
      throw new Error("Se esperaba el grupo ui en el diccionario es");
    }
    const home = ui["home"];
    if (typeof home !== "object" || home === null) {
      throw new Error("Se esperaba el grupo ui.home en el diccionario es");
    }
    expect(home["countdown"]).toBe("Cierre en {time}");

    const errors = dict["errors"];
    if (typeof errors !== "object" || errors === null) {
      throw new Error("Se esperaba el grupo errors en el diccionario es");
    }
    const close = errors["close"];
    if (typeof close !== "object" || close === null) {
      throw new Error("Se esperaba el grupo errors.close en el diccionario es");
    }
    expect(close["passed"]).toBe("Cierre pasado");

    const ejemplo = ui["ejemplo"];
    if (typeof ejemplo !== "object" || ejemplo === null) {
      throw new Error("Se esperaba el grupo ui.ejemplo en el diccionario es");
    }
    expect(ejemplo["saludo"]).toBe("Hola, {nombre}");
  });

  test("locale sin diccionario avisa y usa es (E-07)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const es = cargarDiccionario("es");
      const eu = cargarDiccionario("eu");
      expect(eu).toEqual(es);
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  test("es ausente o inválido lanza (E-06)", async () => {
    vi.resetModules();
    vi.doMock("@/es/strings.json", () => ({ default: 123 }));
    try {
      const mod = await import("./diccionario");
      expect(() => mod.cargarDiccionario("es")).toThrow();
    } finally {
      vi.unmock("@/es/strings.json");
      vi.resetModules();
    }
  });
});
