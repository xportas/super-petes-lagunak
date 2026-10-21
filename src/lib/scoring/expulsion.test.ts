import { describe, expect, test } from "vitest";
import { esExpulsion } from "./expulsion";
import type { ConteosFaltas } from "./tipos";

function base(over: Partial<ConteosFaltas> = {}): ConteosFaltas {
  return {
    descalificacion: 0,
    pelea: 0,
    antideportivas: 0,
    tecnicas: 0,
    tecnicaEntrenador: 0,
    personales: 0,
    ...over,
  };
}

describe("esExpulsion por conteos (RF-11, E-14, E-22)", () => {
  test("descalificante > 0 expulsa", () => {
    expect(esExpulsion(base({ descalificacion: 1 }))).toBe(true);
  });

  test("pelea > 0 expulsa", () => {
    expect(esExpulsion(base({ pelea: 1 }))).toBe(true);
  });

  test("2 entre antideportivas + tecnicas + tecnicaEntrenador expulsa", () => {
    expect(
      esExpulsion(base({ antideportivas: 1, tecnicas: 1 })),
    ).toBe(true);
    expect(
      esExpulsion(base({ antideportivas: 2 })),
    ).toBe(true);
    expect(
      esExpulsion(base({ tecnicas: 1, tecnicaEntrenador: 1 })),
    ).toBe(true);
  });

  test("1 sola entre antideportivas/tecnicas no expulsa", () => {
    expect(esExpulsion(base({ antideportivas: 1 }))).toBe(false);
    expect(esExpulsion(base({ tecnicas: 1 }))).toBe(false);
    expect(esExpulsion(base({ tecnicaEntrenador: 1 }))).toBe(false);
  });

  test("5 personales expulsa (E-14 incluye 5 faltas)", () => {
    expect(esExpulsion(base({ personales: 5 }))).toBe(true);
  });

  test("4 personales no expulsa", () => {
    expect(esExpulsion(base({ personales: 4 }))).toBe(false);
  });

  test("todo a cero no expulsa", () => {
    expect(esExpulsion(base())).toBe(false);
  });

  test("no lee flag externo: solo cuentan los conteos", () => {
    const conteos = base();
    expect(esExpulsion(conteos)).toBe(false);
    expect(esExpulsion(base({ personales: 5 }))).toBe(true);
  });
});
