import { describe, expect, test } from "vitest";
import { esPapel } from "./papel";

describe("admin esPapel (E-05)", () => {
  const hora = new Date("2026-10-03T18:00:00+02:00");

  test("hora+24h con state=1 y null → papel", () => {
    const ahora = new Date(hora.getTime() + 24 * 3600 * 1000);
    expect(esPapel("1", null, hora, ahora)).toBe(true);
  });

  test("dentro de gracia sigue pendiente (no papel)", () => {
    const ahora = new Date(hora.getTime() + 23 * 3600 * 1000);
    expect(esPapel("1", null, hora, ahora)).toBe(false);
  });

  test("con universallyId no es papel", () => {
    const ahora = new Date(hora.getTime() + 48 * 3600 * 1000);
    expect(esPapel("1", "uuid-1", hora, ahora)).toBe(false);
  });

  test("state=0 no es papel", () => {
    const ahora = new Date(hora.getTime() + 48 * 3600 * 1000);
    expect(esPapel("0", null, hora, ahora)).toBe(false);
  });
});
