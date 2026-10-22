import { describe, expect, test } from "vitest";
import {
  avisarImg,
  esPendiente,
  validarJugador,
} from "./validacion-jugador";

describe("admin validacion-jugador (RF-05/RF-06 E-09/E-15)", () => {
  test('["E","A"] pasa como 2 posiciones válidas', () => {
    const r = validarJugador({
      nombre: "Exterior",
      posicionesValidas: ["E", "A"],
      estadoSanitario: "disponible",
    });
    expect(r.ok).toBe(true);
  });

  test("1 posición falla", () => {
    const r = validarJugador({
      nombre: "Solo",
      posicionesValidas: ["B"],
      estadoSanitario: "disponible",
    });
    expect(r.ok).toBe(false);
  });

  test("3 posiciones falla", () => {
    const r = validarJugador({
      nombre: "Triple",
      posicionesValidas: ["B", "E", "A"],
      estadoSanitario: "disponible",
    });
    expect(r.ok).toBe(false);
  });

  test("sin nombre falla", () => {
    const r = validarJugador({
      nombre: "",
      posicionesValidas: ["B", "E"],
      estadoSanitario: "disponible",
    });
    expect(r.ok).toBe(false);
  });

  test("dorsal repetible acepta string libre", () => {
    const r = validarJugador({
      nombre: "Dorsal",
      posicionesValidas: ["B", "E"],
      dorsal: "8",
      estadoSanitario: "disponible",
    });
    expect(r.ok).toBe(true);
  });

  test("img inexistente avisa fallback sin bloquear", () => {
    expect(avisarImg("players/no.webp", () => false)).toBe("fallback");
    expect(avisarImg("players/si.webp", () => true)).toBe("ok");
  });

  test("pendiente = activo + posiciones NULL", () => {
    expect(esPendiente({ activo: true, posicionesValidas: null })).toBe(true);
    expect(
      esPendiente({ activo: true, posicionesValidas: ["B", "E"] }),
    ).toBe(false);
    expect(esPendiente({ activo: false, posicionesValidas: null })).toBe(
      false,
    );
  });
});
