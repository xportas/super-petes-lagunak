import { describe, expect, test } from "vitest";
import {
  debeColorear,
  esZonaRoja,
  medallaPorPuesto,
} from "./colores";
import {
  debeColorear as debeDesdeIndice,
  esZonaRoja as zonaDesdeIndice,
  medallaPorPuesto as medallaDesdeIndice,
} from "./index";

describe("barrel (index)", () => {
  test("reexporta las puras de colores", () => {
    expect(medallaDesdeIndice).toBe(medallaPorPuesto);
    expect(debeDesdeIndice).toBe(debeColorear);
    expect(zonaDesdeIndice).toBe(esZonaRoja);
  });
});

describe("medallaPorPuesto (RF-17)", () => {
  test("1/2/3 => oro/plata/bronce, 4+ => null", () => {
    expect(medallaPorPuesto(1)).toBe("oro");
    expect(medallaPorPuesto(2)).toBe("plata");
    expect(medallaPorPuesto(3)).toBe("bronce");
    expect(medallaPorPuesto(4)).toBeNull();
    expect(medallaPorPuesto(10)).toBeNull();
    expect(medallaPorPuesto(0)).toBeNull();
  });

  test("empate triple en 3º: los tres comparten bronce por nº de puesto", () => {
    const puestos = [3, 3, 3];
    for (const p of puestos) {
      expect(medallaPorPuesto(p)).toBe("bronce");
    }
  });
});

describe("debeColorear (E-01, E-02)", () => {
  test("false si no hay calculada", () => {
    expect(debeColorear({ hayCalculada: false, todosCero: false })).toBe(
      false,
    );
    expect(debeColorear({ hayCalculada: false, todosCero: true })).toBe(false);
  });

  test("false si todos a cero aunque haya calculada", () => {
    expect(debeColorear({ hayCalculada: true, todosCero: true })).toBe(false);
  });

  test("true solo con calculada y diferencias", () => {
    expect(debeColorear({ hayCalculada: true, todosCero: false })).toBe(true);
  });
});

describe("esZonaRoja (RF-17, E-03, E-04)", () => {
  test("N<=6 nunca rojo aunque vaya último", () => {
    expect(esZonaRoja({ acumulado: -10, umbralRojo: 0, totalN: 6 })).toBe(
      false,
    );
    expect(esZonaRoja({ acumulado: 0, umbralRojo: 0, totalN: 3 })).toBe(false);
    expect(esZonaRoja({ acumulado: 5, umbralRojo: 10, totalN: 1 })).toBe(false);
  });

  test("N>6: rojo si acumulado <= umbral de la fila N-2", () => {
    // N=7, umbral = puntos de la fila 5 (N-2). Últimas 3 + empatados.
    expect(esZonaRoja({ acumulado: 60, umbralRojo: 60, totalN: 7 })).toBe(true);
    expect(esZonaRoja({ acumulado: 50, umbralRojo: 60, totalN: 7 })).toBe(true);
    expect(esZonaRoja({ acumulado: 70, umbralRojo: 60, totalN: 7 })).toBe(
      false,
    );
  });

  test("empate en N-2 incluye a todos los empatados", () => {
    // Totales: 100,90,80,70,60,50,50 -> fila N-2 (5ª) = 60, los dos 50 empatados van en rojo.
    const umbral = 60;
    expect(esZonaRoja({ acumulado: 50, umbralRojo: umbral, totalN: 7 })).toBe(
      true,
    );
    expect(esZonaRoja({ acumulado: 60, umbralRojo: umbral, totalN: 7 })).toBe(
      true,
    );
    expect(esZonaRoja({ acumulado: 61, umbralRojo: umbral, totalN: 7 })).toBe(
      false,
    );
  });
});
