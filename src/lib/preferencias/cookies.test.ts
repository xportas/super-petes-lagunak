import { describe, expect, test } from "vitest";
import { leerPreferencias, parsearModoPete, parsearTema } from "./cookies";

describe("parsearModoPete", () => {
  test("'1' se preserva", () => {
    expect(parsearModoPete("1")).toBe("1");
  });
  test("resto cae a '0'", () => {
    expect(parsearModoPete("0")).toBe("0");
    expect(parsearModoPete("2")).toBe("0");
    expect(parsearModoPete("on")).toBe("0");
    expect(parsearModoPete(true)).toBe("0");
    expect(parsearModoPete(1)).toBe("0");
    expect(parsearModoPete(null)).toBe("0");
    expect(parsearModoPete(undefined)).toBe("0");
    expect(parsearModoPete("")).toBe("0");
  });
});

describe("parsearTema", () => {
  test("'light' se preserva", () => {
    expect(parsearTema("light")).toBe("light");
  });
  test("resto cae a 'dark'", () => {
    expect(parsearTema("dark")).toBe("dark");
    expect(parsearTema("claro")).toBe("dark");
    expect(parsearTema("")).toBe("dark");
    expect(parsearTema(null)).toBe("dark");
    expect(parsearTema(undefined)).toBe("dark");
    expect(parsearTema(0)).toBe("dark");
  });
});

describe("leerPreferencias", () => {
  test("ausente cae a defecto sin lanzar", () => {
    expect(leerPreferencias(null)).toEqual({
      modoPete: "0",
      tema: "dark",
    });
    expect(leerPreferencias("")).toEqual({
      modoPete: "0",
      tema: "dark",
    });
  });
  test("cabecera válida se preserva", () => {
    expect(leerPreferencias("modo_pete=1; tema=light")).toEqual({
      modoPete: "1",
      tema: "light",
    });
  });
  test("corrupta cae a defecto sin lanzar", () => {
    expect(leerPreferencias("modo_pete=zzz; tema=zzz")).toEqual({
      modoPete: "0",
      tema: "dark",
    });
    expect(leerPreferencias("basura sin igual")).toEqual({
      modoPete: "0",
      tema: "dark",
    });
  });
  test("porcentaje malformado no lanza y usa crudo", () => {
    expect(leerPreferencias("modo_pete=%; tema=%")).toEqual({
      modoPete: "0",
      tema: "dark",
    });
  });
});
