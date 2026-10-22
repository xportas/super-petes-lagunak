import { describe, expect, test } from "vitest";
import {
  conservarValidezTrasCambioHora,
  siguienteNumeroLiga,
  validarJornadaMinima,
} from "./validacion-jornada";

describe("admin validacion-jornada (RF-01/RF-03 E-01/E-02)", () => {
  test("crear sin rival rechaza con clave i18n", () => {
    const r = validarJornadaMinima({
      rival: "",
      horaPartido: "2026-07-11T18:00:00+02:00",
      localVisitante: "local",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("errors.admin.sin_rival_hora");
    }
  });

  test("crear sin hora rechaza sin insert", () => {
    const r = validarJornadaMinima({
      rival: "RIVAL",
      horaPartido: "",
      localVisitante: "visitante",
    });
    expect(r.ok).toBe(false);
  });

  test("crear sin local/visitante rechaza", () => {
    const r = validarJornadaMinima({
      rival: "RIVAL",
      horaPartido: "2026-07-11T18:00:00+02:00",
    });
    expect(r.ok).toBe(false);
  });

  test("jornada mínima válida pasa", () => {
    const r = validarJornadaMinima({
      rival: "RIVAL",
      horaPartido: "2026-07-11T18:00:00+02:00",
      localVisitante: "local",
    });
    expect(r.ok).toBe(true);
  });

  test("rechaza campo cierre manual", () => {
    const r = validarJornadaMinima({
      rival: "RIVAL",
      horaPartido: "2026-07-11T18:00:00+02:00",
      localVisitante: "local",
      cierre: "2026-07-11T15:00:00+02:00",
    });
    expect(r.ok).toBe(false);
  });

  test("nº liga auto correlativo editable", () => {
    expect(siguienteNumeroLiga([])).toBe(1);
    expect(siguienteNumeroLiga([1, 2, 5])).toBe(6);
  });

  test("cambio de hora conserva válidas sin resucitar tardías", () => {
    const antes = conservarValidezTrasCambioHora([
      { instanteInicio: new Date("2026-07-11T14:00:00+02:00"), validoAntes: true },
      { instanteInicio: new Date("2026-07-11T16:00:00+02:00"), validoAntes: false },
    ]);
    expect(antes).toEqual([true, false]);
  });
});
