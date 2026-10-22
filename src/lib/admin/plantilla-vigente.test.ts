import { describe, expect, test } from "vitest";
import { plantillaVigente } from "./plantilla-vigente";

function cand(
  id: string,
  alta: string,
  baja: string | null,
) {
  return {
    id,
    fechaAlta: new Date(alta),
    fechaBaja: baja === null ? null : new Date(baja),
  };
}

describe("admin plantillaVigente (RF-08)", () => {
  const cierre = new Date("2026-10-11T15:00:00+02:00");

  test("alta posterior al cierre queda excluida", () => {
    const lista = plantillaVigente(
      [cand("a", "2026-10-11T16:00:00+02:00", null)],
      cierre,
      [],
    );
    expect(lista.map((c) => c.id)).toEqual([]);
  });

  test("vigente por fechas aparece", () => {
    const lista = plantillaVigente(
      [cand("a", "2026-09-01T00:00:00+02:00", null)],
      cierre,
      [],
    );
    expect(lista.map((c) => c.id)).toEqual(["a"]);
  });

  test("baja alineada aparece aunque fecha_baja <= cierre", () => {
    const lista = plantillaVigente(
      [cand("b", "2026-09-01T00:00:00+02:00", "2026-10-10T00:00:00+02:00")],
      cierre,
      ["b"],
    );
    expect(lista.map((c) => c.id)).toEqual(["b"]);
  });

  test("baja sin acta ni alineación no aparece", () => {
    const lista = plantillaVigente(
      [cand("b", "2026-09-01T00:00:00+02:00", "2026-10-10T00:00:00+02:00")],
      cierre,
      [],
    );
    expect(lista.map((c) => c.id)).toEqual([]);
  });
});
