import { describe, expect, test } from "vitest";
import {
  anclaDe,
  debeMostrarNav,
  esquemaModoPete,
  esquemaPreferencias,
  esquemaTema,
  itemsNavPara,
  leerPreferencias,
  ORDEN_BLOQUES,
  parsearModoPete,
  parsearTema,
} from "./index";

describe("barrel preferencias", () => {
  test("reexporta todo", () => {
    expect(typeof parsearModoPete).toBe("function");
    expect(typeof parsearTema).toBe("function");
    expect(typeof leerPreferencias).toBe("function");
    expect(typeof itemsNavPara).toBe("function");
    expect(typeof debeMostrarNav).toBe("function");
    expect(typeof anclaDe).toBe("function");
    expect(ORDEN_BLOQUES.length).toBe(8);
    expect(esquemaModoPete.safeParse("1").success).toBe(true);
    expect(esquemaTema.safeParse("dark").success).toBe(true);
    expect(esquemaPreferencias.safeParse({}).success).toBe(true);
  });
});
