import { describe, expect, expectTypeOf, test } from "vitest";
import { crearClienteSupabase } from "./index";

describe("supabase placeholder", () => {
  test("crearClienteSupabase lanza pendiente de spec-03 (E-10)", () => {
    expect(() => crearClienteSupabase()).toThrow(/spec-03/);
  });

  test("firma: nunca retorna", () => {
    expectTypeOf(crearClienteSupabase).returns.toEqualTypeOf<never>();
  });
});
