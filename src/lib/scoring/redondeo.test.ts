import { describe, expect, test } from "vitest";
import { redondearHalfUp } from "./redondeo";

describe("redondearHalfUp (RF-04, E-02)", () => {
  test("13 * 1.5 = 19.5 sube a 20", () => {
    expect(redondearHalfUp(13 * 1.5)).toBe(20);
  });

  test("-1 * 1.5 = -1.5 sube a -1 (half-up hacia +inf)", () => {
    expect(redondearHalfUp(-1 * 1.5)).toBe(-1);
  });

  test("0 se mantiene en 0", () => {
    expect(redondearHalfUp(0)).toBe(0);
  });

  test("2.5 sube a 3", () => {
    expect(redondearHalfUp(2.5)).toBe(3);
  });
});
