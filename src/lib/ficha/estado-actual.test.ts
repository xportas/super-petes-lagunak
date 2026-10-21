import { describe, expect, test } from "vitest";
import { resolverEstadoActual } from "./estado-actual";

describe("resolverEstadoActual (RF-17, E-13)", () => {
  test("disponible sin racha muestra Sin penalización (0)", () => {
    const r = resolverEstadoActual(
      { activo: true, estadoSanitario: "disponible" },
      0,
    );
    expect(r.lineaSanitaria).toBe("disponible");
    expect(r.lineaRacha).toEqual({ tipo: "valor", penalizacion: 0 });
  });

  test("lesionado con racha 2 muestra −2", () => {
    const r = resolverEstadoActual(
      { activo: true, estadoSanitario: "lesionado" },
      2,
    );
    expect(r.lineaSanitaria).toBe("lesionado");
    expect(r.lineaRacha).toEqual({ tipo: "valor", penalizacion: -2 });
  });

  test("baja muestra línea sanitaria baja", () => {
    const r = resolverEstadoActual(
      { activo: false, estadoSanitario: "disponible" },
      1,
    );
    expect(r.lineaSanitaria).toBe("baja");
    expect(r.lineaRacha).toEqual({ tipo: "valor", penalizacion: -1 });
  });

  test("Admin (racha null) muestra No aplica", () => {
    const r = resolverEstadoActual(
      { activo: true, estadoSanitario: "disponible" },
      null,
    );
    expect(r.lineaRacha).toEqual({ tipo: "no_aplica" });
  });
});
