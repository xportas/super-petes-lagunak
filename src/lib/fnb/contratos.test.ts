import { describe, expect, expectTypeOf, test } from "vitest";
import {
  sincronizarCalendarioFNB,
  sincronizarResultadosFNB,
} from "./index";

describe("fnb placeholder", () => {
  test("sincronizarCalendarioFNB lanza pendiente de spec-10 (E-10)", () => {
    expect(() => sincronizarCalendarioFNB()).toThrow(/spec-10/);
  });

  test("sincronizarResultadosFNB lanza pendiente de spec-10 (E-10)", () => {
    expect(() => sincronizarResultadosFNB()).toThrow(/spec-10/);
  });

  test("firmas: nunca retornan", () => {
    expectTypeOf(sincronizarCalendarioFNB).returns.toEqualTypeOf<never>();
    expectTypeOf(sincronizarResultadosFNB).returns.toEqualTypeOf<never>();
  });
});
