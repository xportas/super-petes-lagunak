import { describe, expect, test } from "vitest";
import { validarActaCompleta } from "./validacion-acta";

const J1 = "11111111-1111-4111-8111-111111111111";
const J2 = "22222222-2222-4222-8222-222222222222";

describe("admin validarActaCompleta (RF-08/RF-09 E-10)", () => {
  test("falta 1 fila bloquea sin parcial", () => {
    const r = validarActaCompleta(
      [
        {
          jugadorId: J1,
          valoracion: 5,
          estado: "jugo",
          expulsado: false,
        },
      ],
      [J1, J2],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("errors.admin.incompleta_bloquea");
    }
  });

  test("lesionado+expulsado rechaza por excluyentes", () => {
    const r = validarActaCompleta(
      [
        {
          jugadorId: J1,
          valoracion: 0,
          estado: "lesionado",
          expulsado: true,
        },
      ],
      [J1],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("errors.admin.excluyente_lesion_expulsion");
    }
  });

  test("0 forzado: no-jugado con valor != 0 rechaza", () => {
    const r = validarActaCompleta(
      [
        {
          jugadorId: J1,
          valoracion: 4,
          estado: "no_convocado",
          expulsado: false,
        },
      ],
      [J1],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("errors.admin.cero_forzado");
    }
  });

  test("no-jugado con 0 pasa", () => {
    const r = validarActaCompleta(
      [
        {
          jugadorId: J1,
          valoracion: 0,
          estado: "dnp",
          expulsado: false,
        },
      ],
      [J1],
    );
    expect(r.ok).toBe(true);
  });

  test("acta completa válida pasa", () => {
    const r = validarActaCompleta(
      [
        { jugadorId: J1, valoracion: 7, estado: "jugo", expulsado: false },
        { jugadorId: J2, valoracion: 0, estado: "lesionado", expulsado: false },
      ],
      [J1, J2],
    );
    expect(r.ok).toBe(true);
  });
});
