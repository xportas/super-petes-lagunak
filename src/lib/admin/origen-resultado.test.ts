import { describe, expect, test } from "vitest";
import { determinarOrigen } from "./origen-resultado";

const J1 = "11111111-1111-4111-8111-111111111111";

describe("admin determinarOrigen (RF-10)", () => {
  test("idéntico a oficial → fnb", () => {
    const filas = [
      { jugadorId: J1, valoracion: 5, estado: "jugo" as const, expulsado: false },
    ];
    expect(determinarOrigen(filas, filas)).toBe("fnb");
  });

  test("1 campo distinto → manual", () => {
    expect(
      determinarOrigen(
        [
          {
            jugadorId: J1,
            valoracion: 6,
            estado: "jugo",
            expulsado: false,
          },
        ],
        [
          {
            jugadorId: J1,
            valoracion: 5,
            estado: "jugo",
            expulsado: false,
          },
        ],
      ),
    ).toBe("manual");
  });

  test("sin acta oficial → manual", () => {
    expect(
      determinarOrigen(
        [
          {
            jugadorId: J1,
            valoracion: 5,
            estado: "jugo",
            expulsado: false,
          },
        ],
        null,
      ),
    ).toBe("manual");
  });
});
