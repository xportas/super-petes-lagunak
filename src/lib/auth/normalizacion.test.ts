import { describe, expect, test } from "vitest";
import {
  esFormatoUsernameValido,
  esPasswordValida,
  extraerIP,
  normalizarCodigoInvitacion,
  normalizarUsername,
} from "./normalizacion";

describe("normalizacion username/codigo/password/IP (RF-01/02/03/05)", () => {
  test("E-01 mismo usuario con espacios y mayusculas", () => {
    expect(normalizarUsername(" Arnau ")).toBe("arnau");
    expect(normalizarUsername("arnau")).toBe("arnau");
    expect(normalizarUsername("ARNAU")).toBe("arnau");
    expect(normalizarUsername(" ArNaU ")).toBe(
      normalizarUsername("arnau"),
    );
  });

  test("E-01 no texto lanza", () => {
    expect(() => normalizarUsername(123)).toThrow();
    expect(() => normalizarUsername(null)).toThrow();
  });

  test("E-02 formato 3-20 [A-Za-z0-9_-]", () => {
    expect(esFormatoUsernameValido("abc")).toBe(true);
    expect(esFormatoUsernameValido("ab")).toBe(false);
    expect(esFormatoUsernameValido("a".repeat(20))).toBe(true);
    expect(esFormatoUsernameValido("a".repeat(21))).toBe(false);
    expect(esFormatoUsernameValido("arnau-1_pete")).toBe(true);
    expect(esFormatoUsernameValido("arnau pete")).toBe(false);
    expect(esFormatoUsernameValido("arnau!")).toBe(false);
    expect(esFormatoUsernameValido("   ")).toBe(false);
    expect(esFormatoUsernameValido("")).toBe(false);
    expect(esFormatoUsernameValido(123)).toBe(false);
    expect(esFormatoUsernameValido(" ab ")).toBe(false);
    expect(esFormatoUsernameValido("  abc  ")).toBe(true);
  });

  test("E-13 password 7/73 rechaza 8 acepta solo-espacios rechaza", () => {
    expect(esPasswordValida("1234567")).toBe(false);
    expect(esPasswordValida("12345678")).toBe(true);
    expect(esPasswordValida("a".repeat(72))).toBe(true);
    expect(esPasswordValida("a".repeat(73))).toBe(false);
    expect(esPasswordValida("        ")).toBe(false);
    expect(esPasswordValida("  123456  ")).toBe(true);
    expect(esPasswordValida("")).toBe(false);
    expect(esPasswordValida(123)).toBe(false);
    expect(esPasswordValida(null)).toBe(false);
  });

  test("codigo trim+lower", () => {
    expect(normalizarCodigoInvitacion("  ABC-123 ")).toBe("abc-123");
    expect(normalizarCodigoInvitacion("DEV-INVITACION-03")).toBe(
      "dev-invitacion-03",
    );
    expect(() => normalizarCodigoInvitacion(42)).toThrow();
  });

  test("IP x-forwarded-for[0] ?? x-real-ip ?? 127.0.0.1", () => {
    const h1 = new Headers();
    h1.set("x-forwarded-for", "1.2.3.4, 5.6.7.8");
    expect(extraerIP(h1)).toBe("1.2.3.4");
    const h2 = new Headers();
    h2.set("x-forwarded-for", "  9.9.9.9  ");
    expect(extraerIP(h2)).toBe("9.9.9.9");
    const h3 = new Headers();
    h3.set("x-real-ip", "2.2.2.2");
    expect(extraerIP(h3)).toBe("2.2.2.2");
    const h4 = new Headers();
    expect(extraerIP(h4)).toBe("127.0.0.1");
    const h5 = new Headers();
    h5.set("x-forwarded-for", "   ");
    h5.set("x-real-ip", "3.3.3.3");
    expect(extraerIP(h5)).toBe("3.3.3.3");
    const h6 = new Headers();
    h6.set("x-forwarded-for", "   ");
    h6.set("x-real-ip", "   ");
    expect(extraerIP(h6)).toBe("127.0.0.1");
    const h7 = new Headers();
    h7.set("x-forwarded-for", " , ");
    expect(extraerIP(h7)).toBe("127.0.0.1");
  });
});
