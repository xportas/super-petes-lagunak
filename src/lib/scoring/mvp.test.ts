import { describe, expect, test } from "vitest";
import { esMvpCapitan } from "./mvp";

describe("esMvpCapitan (RF-10, E-10–E-13, E-15, E-03)", () => {
  test("simple sobre BASE forzada: capitán máximo que jugó", () => {
    expect(
      esMvpCapitan({ capitanJugo: true, baseCapitan: 18, maxBaseJugo: 18 }),
    ).toBe(true);
  });

  test("si el capitán no es el máximo, no hay MVP", () => {
    expect(
      esMvpCapitan({ capitanJugo: true, baseCapitan: 10, maxBaseJugo: 18 }),
    ).toBe(false);
  });

  test("empate habilita a todos (E-10)", () => {
    expect(
      esMvpCapitan({ capitanJugo: true, baseCapitan: 15, maxBaseJugo: 15 }),
    ).toBe(true);
  });

  test("exige haber jugado: DNP con BASE 0 no compite (E-11)", () => {
    expect(
      esMvpCapitan({ capitanJugo: false, baseCapitan: 0, maxBaseJugo: 12 }),
    ).toBe(false);
  });

  test("capitán lesionado nunca es MVP aunque empate en lo alto (E-03)", () => {
    expect(
      esMvpCapitan({ capitanJugo: false, baseCapitan: 0, maxBaseJugo: 0 }),
    ).toBe(false);
  });

  test("máxima 0 con alguien que jugó sí da MVP", () => {
    expect(
      esMvpCapitan({ capitanJugo: true, baseCapitan: 0, maxBaseJugo: 0 }),
    ).toBe(true);
  });

  test("máxima negativa con alguien que jugó sí da MVP", () => {
    expect(
      esMvpCapitan({ capitanJugo: true, baseCapitan: -2, maxBaseJugo: -2 }),
    ).toBe(true);
  });

  test("si nadie jugó (max null) no hay MVP", () => {
    expect(
      esMvpCapitan({ capitanJugo: false, baseCapitan: 0, maxBaseJugo: null }),
    ).toBe(false);
    expect(
      esMvpCapitan({ capitanJugo: true, baseCapitan: 5, maxBaseJugo: null }),
    ).toBe(false);
  });

  test("con Maider el +3 no se multiplica: el predicado solo mira BASE", () => {
    expect(
      esMvpCapitan({ capitanJugo: true, baseCapitan: 13, maxBaseJugo: 13 }),
    ).toBe(true);
  });

  test("con Páter el +3 es independiente del suelo+1", () => {
    expect(
      esMvpCapitan({ capitanJugo: true, baseCapitan: 0, maxBaseJugo: 0 }),
    ).toBe(true);
  });

  test("expulsado puede ser MVP (E-15): el predicado ignora la expulsión", () => {
    expect(
      esMvpCapitan({ capitanJugo: true, baseCapitan: 20, maxBaseJugo: 20 }),
    ).toBe(true);
  });
});
