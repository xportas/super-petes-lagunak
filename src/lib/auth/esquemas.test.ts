import { describe, expect, test } from "vitest";
import {
  esquemaCambiar,
  esquemaCodigo,
  esquemaConfirmarPaso2,
  esquemaLogin,
  esquemaPassword,
  esquemaRegistro,
  esquemaUsername,
  validarCambioPassword,
  validarLogin,
  validarRegistroOrdenado,
} from "./esquemas";

describe("esquemas Zod borde (RF-01/02/03/10 E-12)", () => {
  test("E-12 codigo invalido devuelve INVITACION sin mirar username", () => {
    const r = validarRegistroOrdenado({
      username: "yaexiste",
      password: "secreta123",
      codigo: "   ",
    });
    expect(r).toEqual({ ok: false, codigo: "INVITACION" });
    const r2 = validarRegistroOrdenado({
      username: "x",
      password: "y",
      codigo: "",
    });
    expect(r2).toEqual({ ok: false, codigo: "INVITACION" });
    const r3 = validarRegistroOrdenado(null);
    expect(r3).toEqual({ ok: false, codigo: "INVITACION" });
  });

  test("formato username y password con precedencia", () => {
    expect(
      validarRegistroOrdenado({
        username: "ab",
        password: "secreta123",
        codigo: "valido",
      }),
    ).toEqual({ ok: false, codigo: "USERNAME" });
    expect(
      validarRegistroOrdenado({
        username: "valido_1",
        password: "corta",
        codigo: "valido",
      }),
    ).toEqual({ ok: false, codigo: "PASSWORD" });
    expect(
      validarRegistroOrdenado({
        username: " Arnau ",
        password: "secreta123",
        codigo: " CODIGO ",
      }),
    ).toEqual({
      ok: true,
      datos: { username: "Arnau", password: "secreta123", codigo: "codigo" },
    });
  });

  test("esquemaUsername bordes E-02", () => {
    expect(esquemaUsername.safeParse("ab").success).toBe(false);
    expect(esquemaUsername.safeParse("abc").success).toBe(true);
    expect(esquemaUsername.safeParse("a".repeat(21)).success).toBe(false);
    expect(esquemaUsername.safeParse("con espacio").success).toBe(false);
    expect(esquemaUsername.safeParse("   ").success).toBe(false);
  });

  test("esquemaPassword E-13 7/73 y solo espacios", () => {
    expect(esquemaPassword.safeParse("1234567").success).toBe(false);
    expect(esquemaPassword.safeParse("12345678").success).toBe(true);
    expect(esquemaPassword.safeParse("a".repeat(73)).success).toBe(false);
    expect(esquemaPassword.safeParse("        ").success).toBe(false);
  });

  test("esquemaCodigo trim+lower", () => {
    const r = esquemaCodigo.safeParse("  ABC  ");
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toBe("abc");
    }
  });

  test("login falla generico E-03", () => {
    expect(validarLogin({ username: "ab", password: "" })).toEqual({
      ok: false,
      codigo: "CREDENCIALES",
    });
    expect(validarLogin({ username: "arnau", password: "" })).toEqual({
      ok: false,
      codigo: "CREDENCIALES",
    });
    const ok = validarLogin({ username: "arnau", password: "x" });
    expect(ok.ok).toBe(true);
    expect(esquemaLogin.safeParse({ username: "arnau" }).success).toBe(false);
  });

  test("nueva igual a actual rechaza", () => {
    expect(
      validarCambioPassword({ actual: "secreta123", nueva: "secreta123" }, false),
    ).toEqual({ ok: false, codigo: "NUEVA_DISTINTA" });
    expect(
      validarCambioPassword({ actual: "temporal1", nueva: "temporal1" }, true),
    ).toEqual({ ok: false, codigo: "NUEVA_DISTINTA" });
    expect(
      validarCambioPassword({ actual: "a", nueva: "corta" }, false),
    ).toEqual({ ok: false, codigo: "FORMATO" });
    expect(
      validarCambioPassword(
        { actual: "actual123", nueva: "nueva4567" },
        false,
      ),
    ).toEqual({
      ok: true,
      actual: "actual123",
      nueva: "nueva4567",
    });
    expect(validarCambioPassword(null, false)).toEqual({
      ok: false,
      codigo: "FORMATO",
    });
    expect(validarCambioPassword("no-objeto", true)).toEqual({
      ok: false,
      codigo: "FORMATO",
    });
    expect(
      validarCambioPassword({ actual: 123, nueva: "nueva4567" }, true),
    ).toEqual({ ok: true, actual: "", nueva: "nueva4567" });
    expect(
      validarCambioPassword({ actual: "", nueva: "nueva4567" }, true),
    ).toEqual({ ok: true, actual: "", nueva: "nueva4567" });
    expect(
      validarCambioPassword({ actual: "", nueva: "corta" }, true),
    ).toEqual({ ok: false, codigo: "FORMATO" });
    expect(validarCambioPassword({ nueva: "nueva4567" }, false)).toEqual({
      ok: false,
      codigo: "FORMATO",
    });
  });

  test("esquemaRegistro y esquemaCambiar y confirmarPaso2", () => {
    expect(
      esquemaRegistro.safeParse({
        username: "arnau",
        password: "secreta123",
        codigo: "ABC",
      }).success,
    ).toBe(true);
    expect(
      esquemaCambiar.safeParse({ actual: "a", nueva: "nueva1234" }).success,
    ).toBe(true);
    expect(esquemaConfirmarPaso2.safeParse({ entendido: true }).success).toBe(
      true,
    );
    expect(esquemaConfirmarPaso2.safeParse({ entendido: false }).success).toBe(
      false,
    );
  });

  test("registro no objeto con codigo valido cae a USERNAME/PASSWORD", () => {
    expect(
      validarRegistroOrdenado({ codigo: "ok", username: 1, password: "x" }),
    ).toEqual({ ok: false, codigo: "USERNAME" });
  });
});
