import { describe, expect, test } from "vitest";
import { calcularJugador } from "./calcular-jugador";
import type { EntradaJugador, Posicion } from "./tipos";

function entrada(
  over: Partial<EntradaJugador> = {},
): EntradaJugador {
  return {
    jugadorId: "j1",
    valoracionFNB: 10,
    estado: "jugo",
    expulsado: false,
    posicionesValidas: ["B", "E"] as readonly [Posicion, Posicion],
    posicionAlineada: "B",
    esCapitan: false,
    ...over,
  };
}

describe("calcularJugador (RF-01, RF-04, RF-05, RF-07, RF-13, E-01–E-05)", () => {
  test("BASE negativa sin Páter cuenta tal cual (E-01)", () => {
    const r = calcularJugador(
      entrada({
        valoracionFNB: -1,
        posicionesValidas: ["B", "E"],
        posicionAlineada: "P",
      }),
      1,
      "maider",
    );
    expect(r).toMatchObject({ base: -1, trasEntrenador: -1, subtotal: -1 });
  });

  test("lesionado con Páter 0 → 2 (E-04)", () => {
    const r = calcularJugador(
      entrada({
        valoracionFNB: 12,
        estado: "lesionado",
        posicionesValidas: ["B", "E"],
        posicionAlineada: "B",
      }),
      2,
      "pater",
    );
    expect(r).toMatchObject({
      base: 0,
      trasEntrenador: 2,
      bonusPosicion: 0,
      penalizacionRacha: 0,
      subtotal: 2,
    });
  });

  test("BASE -5 con Páter → 2 (E-04)", () => {
    const r = calcularJugador(
      entrada({ valoracionFNB: -5, posicionAlineada: "P" }),
      1,
      "pater",
    );
    expect(r).toMatchObject({ base: -5, trasEntrenador: 2 });
  });

  test("capitán 13 con Maider → 20 (E-02)", () => {
    const r = calcularJugador(
      entrada({
        valoracionFNB: 13,
        esCapitan: true,
        posicionAlineada: "P",
      }),
      1,
      "maider",
    );
    expect(r).toMatchObject({ base: 13, trasEntrenador: 20 });
  });

  test("capitán -1 con Maider → -1 (E-02)", () => {
    const r = calcularJugador(
      entrada({
        valoracionFNB: -1,
        esCapitan: true,
        posicionAlineada: "P",
      }),
      1,
      "maider",
    );
    expect(r).toMatchObject({ trasEntrenador: -1 });
  });

  test("no capitán con Maider no multiplica", () => {
    const r = calcularJugador(
      entrada({ valoracionFNB: 13, esCapitan: false, posicionAlineada: "P" }),
      1,
      "maider",
    );
    expect(r).toMatchObject({ trasEntrenador: 13 });
  });

  test("bloqueo +5/-N con BASE 0 aunque bien colocado y con racha (E-05)", () => {
    const r = calcularJugador(
      entrada({
        estado: "lesionado",
        valoracionFNB: 20,
        posicionAlineada: "B",
        esCapitan: false,
      }),
      3,
      "maider",
    );
    expect(r).toMatchObject({
      base: 0,
      bonusPosicion: 0,
      penalizacionRacha: 0,
      subtotal: 0,
    });
  });

  test("capitán lesionado con Maider total 0 sin bonus (E-03 parcial)", () => {
    const r = calcularJugador(
      entrada({
        estado: "dnp",
        valoracionFNB: 15,
        esCapitan: true,
        posicionAlineada: "B",
      }),
      2,
      "maider",
    );
    expect(r).toMatchObject({ base: 0, trasEntrenador: 0, subtotal: 0 });
  });

  test("+5 cuando bien colocado y jugó", () => {
    const r = calcularJugador(entrada({ valoracionFNB: 10 }), 1, "maider");
    expect(r).toMatchObject({ bonusPosicion: 5, subtotal: 15 });
  });

  test("-N racha 2ª y 3ª con BASE > 0", () => {
    const segunda = calcularJugador(
      entrada({ valoracionFNB: 10 }),
      2,
      "maider",
    );
    expect(segunda).toMatchObject({ penalizacionRacha: -1, subtotal: 14 });
    const tercera = calcularJugador(
      entrada({ valoracionFNB: 10 }),
      3,
      "maider",
    );
    expect(tercera).toMatchObject({ penalizacionRacha: -2, subtotal: 13 });
  });

  test("lesionado cuenta para racha futura a nivel de entrada rachaN (E-05)", () => {
    const r = calcularJugador(
      entrada({ estado: "lesionado", valoracionFNB: 9 }),
      2,
      "pater",
    );
    if ("error" in r) {
      throw new Error("no debería dar error");
    }
    expect(r.base).toBe(0);
    expect(r.penalizacionRacha).toBe(0);
  });

  test("lesión + expulsión → LESION_EXPULSION_EXCLUYENTES (E-22)", () => {
    const r = calcularJugador(
      entrada({ estado: "lesionado", expulsado: true }),
      1,
      "maider",
    );
    expect(r).toEqual({
      error: {
        codigo: "LESION_EXPULSION_EXCLUYENTES",
        jugadorId: "j1",
      },
    });
  });

  test("no_convocado + expulsado también excluyente", () => {
    const r = calcularJugador(
      entrada({ estado: "no_convocado", expulsado: true }),
      1,
      "pater",
    );
    expect(r).toEqual({
      error: {
        codigo: "LESION_EXPULSION_EXCLUYENTES",
        jugadorId: "j1",
      },
    });
  });

  test("dnp + expulsado también excluyente", () => {
    const r = calcularJugador(
      entrada({ estado: "dnp", expulsado: true }),
      1,
      "maider",
    );
    expect(r).toEqual({
      error: {
        codigo: "LESION_EXPULSION_EXCLUYENTES",
        jugadorId: "j1",
      },
    });
  });

  test("valoración ausente → DATO_AUSENTE", () => {
    expect(
      calcularJugador(entrada({ valoracionFNB: null }), 1, "maider"),
    ).toEqual({ error: { codigo: "DATO_AUSENTE", jugadorId: "j1" } });
    expect(
      calcularJugador(entrada({ valoracionFNB: undefined }), 1, "maider"),
    ).toEqual({ error: { codigo: "DATO_AUSENTE", jugadorId: "j1" } });
  });

  test("posiciones nulas → POSICIONES_INVALIDAS", () => {
    expect(
      calcularJugador(entrada({ posicionesValidas: null }), 1, "maider"),
    ).toEqual({
      error: { codigo: "POSICIONES_INVALIDAS", jugadorId: "j1" },
    });
    expect(
      calcularJugador(
        entrada({ posicionesValidas: undefined }),
        1,
        "maider",
      ),
    ).toEqual({
      error: { codigo: "POSICIONES_INVALIDAS", jugadorId: "j1" },
    });
  });

  test("posiciones con letra inválida → POSICIONES_INVALIDAS", () => {
    const malas = ["X", "B"] as unknown as readonly [Posicion, Posicion];
    expect(
      calcularJugador(entrada({ posicionesValidas: malas }), 1, "maider"),
    ).toEqual({
      error: { codigo: "POSICIONES_INVALIDAS", jugadorId: "j1" },
    });
  });

  test("posición alineada inválida → POSICIONES_INVALIDAS", () => {
    const mala = "X" as unknown as Posicion;
    expect(
      calcularJugador(entrada({ posicionAlineada: mala }), 1, "maider"),
    ).toEqual({
      error: { codigo: "POSICIONES_INVALIDAS", jugadorId: "j1" },
    });
  });
});
