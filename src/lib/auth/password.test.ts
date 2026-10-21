import { describe, expect, test } from "vitest";
import { hashearPassword, verificarPassword } from "./password";

describe("password argon2id (RF-03/04/10 D-01)", () => {
  test("hash no contiene la password y verifica", async () => {
    const hash = await hashearPassword("secreta123");
    expect(hash).not.toContain("secreta123");
    expect(await verificarPassword("secreta123", hash)).toBe(true);
    expect(await verificarPassword("otra12345", hash)).toBe(false);
  }, 20000);

  test("hash corrupto devuelve false sin lanzar", async () => {
    expect(await verificarPassword("x", "no-es-un-hash")).toBe(false);
  }, 20000);
});
