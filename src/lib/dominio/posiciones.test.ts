import { describe, expect, test } from "vitest";
import {
  sonMismaCasilla,
  tieneBonusPosicion,
  validarPosicionesValidas,
} from "./posiciones";

describe("posiciones E==A (RF-06, RF-15, E-06, E-21)", () => {
  test('["E","A"] alineado en E da bonus', () => {
    expect(tieneBonusPosicion("E", ["E", "A"], 10)).toBe(true);
  });

  test('["E","A"] alineado en A da bonus', () => {
    expect(tieneBonusPosicion("A", ["E", "A"], 10)).toBe(true);
  });

  test("letra no incluida no da bonus", () => {
    expect(tieneBonusPosicion("B", ["E", "A"], 10)).toBe(false);
    expect(tieneBonusPosicion("P", ["B", "AP"], 10)).toBe(false);
  });

  test("coincidencia exacta da bonus", () => {
    expect(tieneBonusPosicion("B", ["B", "AP"], 8)).toBe(true);
    expect(tieneBonusPosicion("AP", ["B", "AP"], 8)).toBe(true);
  });

  test("BASE 0 bloquea el bonus aunque coincida", () => {
    expect(tieneBonusPosicion("E", ["E", "A"], 0)).toBe(false);
  });

  test("E y A son la misma casilla", () => {
    expect(sonMismaCasilla("E", "A")).toBe(true);
    expect(sonMismaCasilla("A", "E")).toBe(true);
    expect(sonMismaCasilla("E", "E")).toBe(true);
    expect(sonMismaCasilla("B", "B")).toBe(true);
    expect(sonMismaCasilla("B", "E")).toBe(false);
    expect(sonMismaCasilla("B", "P")).toBe(false);
    expect(sonMismaCasilla("AP", "P")).toBe(false);
  });

  test("longitud != 2 es inválido", () => {
    expect(validarPosicionesValidas(["B"])).toBe(false);
    expect(validarPosicionesValidas(["B", "E", "A"])).toBe(false);
    expect(validarPosicionesValidas([])).toBe(false);
  });

  test("null (Pendientes) es inválido", () => {
    expect(validarPosicionesValidas(null)).toBe(false);
    expect(validarPosicionesValidas(undefined)).toBe(false);
  });

  test("no array es inválido", () => {
    expect(validarPosicionesValidas("B")).toBe(false);
    expect(validarPosicionesValidas(42)).toBe(false);
  });

  test("letras fuera de B|E|A|AP|P son inválidas", () => {
    expect(validarPosicionesValidas(["X", "B"])).toBe(false);
    expect(validarPosicionesValidas(["B", "X"])).toBe(false);
  });

  test('["E","A"] es pareja válida', () => {
    expect(validarPosicionesValidas(["E", "A"])).toBe(true);
  });

  test("pareja normal válida", () => {
    expect(validarPosicionesValidas(["B", "AP"])).toBe(true);
  });
});
