import { describe, expect, test } from "vitest";
import type { Posicion } from "../scoring/tipos";
import { validarQuinteto } from "./validar-quinteto";

function plantillaOk(): Map<
  string,
  { activo: boolean; posicionesValidas: readonly [Posicion, Posicion] | null }
> {
  const m = new Map<
    string,
    { activo: boolean; posicionesValidas: readonly [Posicion, Posicion] | null }
  >();
  for (const id of ["a", "b", "c", "d", "e"]) {
    m.set(id, { activo: true, posicionesValidas: ["B", "E"] });
  }
  return m;
}

function inputOk(): unknown {
  return {
    jugadorIds: ["a", "b", "c", "d", "e"],
    posicionPorJugador: { a: "B", b: "B", c: "B", d: "B", e: "B" },
    entrenador: "maider",
    capitanId: "a",
  };
}

describe("validarQuinteto (RF-02, RF-03, RF-14, RF-16, E-17)", () => {
  test("quinteto válido pasa", () => {
    const r = validarQuinteto(inputOk(), plantillaOk());
    expect(r.ok).toBe(true);
  });

  test("duplicados rechaza (E-17)", () => {
    const r = validarQuinteto(
      {
        jugadorIds: ["a", "a", "c", "d", "e"],
        posicionPorJugador: { a: "B", c: "B", d: "B", e: "B" },
        entrenador: "maider",
        capitanId: "a",
      },
      plantillaOk(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("duplicados");
    }
  });

  test("capitán fuera del quinteto rechaza (E-17)", () => {
    const r = validarQuinteto(
      {
        jugadorIds: ["a", "b", "c", "d", "e"],
        posicionPorJugador: { a: "B", b: "B", c: "B", d: "B", e: "B" },
        entrenador: "maider",
        capitanId: "z",
      },
      plantillaOk(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("capitan_fuera");
    }
  });

  test("sin posición rechaza", () => {
    const r = validarQuinteto(
      {
        jugadorIds: ["a", "b", "c", "d", "e"],
        posicionPorJugador: { a: "B", b: "B", c: "B", d: "B" },
        entrenador: "maider",
        capitanId: "a",
      },
      plantillaOk(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("sin_posicion");
    }
  });

  test("posición inválida rechaza", () => {
    const r = validarQuinteto(
      {
        jugadorIds: ["a", "b", "c", "d", "e"],
        posicionPorJugador: { a: "B", b: "B", c: "B", d: "B", e: "X" },
        entrenador: "maider",
        capitanId: "a",
      },
      plantillaOk(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("posicion_invalida");
    }
  });

  test("entrenador inválido rechaza (E-17)", () => {
    const r = validarQuinteto(
      {
        jugadorIds: ["a", "b", "c", "d", "e"],
        posicionPorJugador: { a: "B", b: "B", c: "B", d: "B", e: "B" },
        entrenador: "otro",
        capitanId: "a",
      },
      plantillaOk(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("entrenador_invalido");
    }
  });

  test("Maider/Páter en slot de jugador rechaza (RF-02)", () => {
    const p = plantillaOk();
    p.set("maider", { activo: true, posicionesValidas: ["B", "E"] });
    const r = validarQuinteto(
      {
        jugadorIds: ["maider", "b", "c", "d", "e"],
        posicionPorJugador: {
          maider: "B",
          b: "B",
          c: "B",
          d: "B",
          e: "B",
        },
        entrenador: "maider",
        capitanId: "maider",
      },
      p,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("entrenador_en_quinteto");
    }
  });

  test("jugador inactivo rechaza al guardar (RF-14)", () => {
    const p = plantillaOk();
    p.set("e", { activo: false, posicionesValidas: ["B", "E"] });
    const r = validarQuinteto(inputOk(), p);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("jugador_inactivo");
    }
  });

  test("jugador pendiente (posiciones null) rechaza al guardar (RF-15)", () => {
    const p = plantillaOk();
    p.set("e", { activo: true, posicionesValidas: null });
    const r = validarQuinteto(inputOk(), p);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("jugador_pendiente");
    }
  });

  test("capitán vacío rechaza con sin_capitan (E-17)", () => {
    const r = validarQuinteto(
      {
        jugadorIds: ["a", "b", "c", "d", "e"],
        posicionPorJugador: { a: "B", b: "B", c: "B", d: "B", e: "B" },
        entrenador: "maider",
        capitanId: "",
      },
      plantillaOk(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("sin_capitan");
    }
  });

  test("id fuera de plantilla rechaza como pendiente", () => {
    const r = validarQuinteto(
      {
        jugadorIds: ["a", "b", "c", "d", "zz"],
        posicionPorJugador: { a: "B", b: "B", c: "B", d: "B", zz: "B" },
        entrenador: "pater",
        capitanId: "a",
      },
      plantillaOk(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("jugador_pendiente");
    }
  });

  test("forma no objeto rechaza", () => {
    const r = validarQuinteto(null, plantillaOk());
    expect(r.ok).toBe(false);
  });
});
