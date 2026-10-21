import { describe, expect, test } from "vitest";
import {
  calcularMediaTemporada,
  evolucionVigente,
  formatearMediaES,
  ultimaValoracion,
} from "./media-evolucion";

describe("calcularMediaTemporada (RF-15, E-07/E-08)", () => {
  test("media solo jugo en calculada con round_half_up a 1 decimal", () => {
    const r = calcularMediaTemporada([
      { base: 12, estado: "jugo", estadoJornada: "calculada" },
      { base: 7, estado: "jugo", estadoJornada: "calculada" },
      { base: 0, estado: "lesionado", estadoJornada: "calculada" },
      { base: 0, estado: "no_convocado", estadoJornada: "calculada" },
      { base: 5, estado: "jugo", estadoJornada: "papel" },
    ]);
    expect(r.tipo).toBe("valor");
    if (r.tipo !== "valor") {
      throw new Error("se esperaba valor");
    }
    // (12+7)/2 = 9.5
    expect(r.media).toBe(9.5);
    expect(r.jugados).toBe(2);
  });

  test("BASE=0✅ cuenta, 🚑/❌ no cuentan (E-07)", () => {
    const r = calcularMediaTemporada([
      { base: 0, estado: "jugo", estadoJornada: "calculada" },
      { base: -2, estado: "jugo", estadoJornada: "calculada" },
      { base: 0, estado: "lesionado", estadoJornada: "calculada" },
      { base: 0, estado: "dnp", estadoJornada: "calculada" },
    ]);
    expect(r.tipo).toBe("valor");
    if (r.tipo !== "valor") {
      throw new Error("se esperaba valor");
    }
    expect(r.jugados).toBe(2);
    // (0 + -2)/2 = -1
    expect(r.media).toBe(-1);
  });

  test("0 jugados con 🚑/❌ muestra Sin datos (E-08)", () => {
    const r = calcularMediaTemporada([
      { base: 0, estado: "lesionado", estadoJornada: "calculada" },
      { base: 0, estado: "no_convocado", estadoJornada: "calculada" },
    ]);
    expect(r.tipo).toBe("sin_datos");
  });

  test("redondeo half_up: 7.25 -> 7.3", () => {
    const r = calcularMediaTemporada([
      { base: 7, estado: "jugo", estadoJornada: "calculada" },
      { base: 7, estado: "jugo", estadoJornada: "calculada" },
      { base: 8, estado: "jugo", estadoJornada: "calculada" },
      { base: 7, estado: "jugo", estadoJornada: "calculada" },
    ]);
    // (7+7+8+7)/4 = 7.25 -> 7.3
    expect(r.tipo).toBe("valor");
    if (r.tipo !== "valor") {
      throw new Error("se esperaba valor");
    }
    expect(r.media).toBe(7.3);
  });
});

describe("ultimaValoracion (RF-15)", () => {
  test("devuelve BASE de la última calculada vigente con icono", () => {
    const u = ultimaValoracion(
      [
        {
          jornadaId: "j2",
          etiqueta: "J2",
          base: 12,
          estado: "jugo",
          estadoJornada: "calculada",
          horaPartido: new Date("2026-10-11T18:00:00+02:00"),
          numeroJornada: 2,
        },
        {
          jornadaId: "j3",
          etiqueta: "J3",
          base: 0,
          estado: "lesionado",
          estadoJornada: "calculada",
          horaPartido: new Date("2026-10-18T18:00:00+02:00"),
          numeroJornada: 3,
        },
      ],
      {
        fechaAlta: new Date("2026-09-01T00:00:00+02:00"),
        fechaBaja: null,
      },
    );
    expect(u.tipo).toBe("valor");
    if (u.tipo !== "valor") {
      throw new Error("se esperaba valor");
    }
    expect(u.base).toBe(0);
    expect(u.estado).toBe("lesionado");
    expect(u.jornadaEtiqueta).toBe("J3");
  });

  test("sin calculada vigente devuelve Sin datos", () => {
    const u = ultimaValoracion([], {
      fechaAlta: new Date("2026-09-01T00:00:00+02:00"),
      fechaBaja: null,
    });
    expect(u.tipo).toBe("sin_datos");
  });

  test("papel excluida de última", () => {
    const u = ultimaValoracion(
      [
        {
          jornadaId: "j2",
          etiqueta: "J2",
          base: 9,
          estado: "jugo",
          estadoJornada: "calculada",
          horaPartido: new Date("2026-10-11T18:00:00+02:00"),
          numeroJornada: 2,
        },
        {
          jornadaId: "j1",
          etiqueta: "J1",
          base: 99,
          estado: "jugo",
          estadoJornada: "papel",
          horaPartido: new Date("2026-10-03T18:00:00+02:00"),
          numeroJornada: 1,
        },
      ],
      {
        fechaAlta: new Date("2026-09-01T00:00:00+02:00"),
        fechaBaja: null,
      },
    );
    expect(u.tipo).toBe("valor");
    if (u.tipo !== "valor") {
      throw new Error("se esperaba valor");
    }
    expect(u.jornadaEtiqueta).toBe("J2");
  });
});

describe("evolucionVigente (RF-16, E-09)", () => {
  test("alta mid-season excluye J1–J5", () => {
    const filas = evolucionVigente(
      [
        {
          jornadaId: "j1",
          etiqueta: "J1",
          base: 5,
          estado: "jugo",
          estadoJornada: "calculada",
          horaPartido: new Date("2026-10-03T18:00:00+02:00"),
          numeroJornada: 1,
        },
        {
          jornadaId: "j6",
          etiqueta: "J6",
          base: 8,
          estado: "jugo",
          estadoJornada: "calculada",
          horaPartido: new Date("2026-11-15T18:00:00+02:00"),
          numeroJornada: 6,
        },
      ],
      {
        fechaAlta: new Date("2026-11-01T00:00:00+01:00"),
        fechaBaja: null,
      },
    );
    expect(filas.map((f) => f.etiqueta)).toEqual(["J6"]);
  });

  test("vigencia fecha_alta<=cierre y orden canónico", () => {
    const filas = evolucionVigente(
      [
        {
          jornadaId: "jb",
          etiqueta: "J3",
          base: 3,
          estado: "jugo",
          estadoJornada: "calculada",
          horaPartido: new Date("2026-10-18T18:00:00+02:00"),
          numeroJornada: 3,
        },
        {
          jornadaId: "ja",
          etiqueta: "J2",
          base: 4,
          estado: "jugo",
          estadoJornada: "calculada",
          horaPartido: new Date("2026-10-11T18:00:00+02:00"),
          numeroJornada: 2,
        },
      ],
      {
        fechaAlta: new Date("2026-09-01T00:00:00+02:00"),
        fechaBaja: null,
      },
    );
    expect(filas.map((f) => f.etiqueta)).toEqual(["J2", "J3"]);
  });

  test("papel/pendiente/invalidada no aparecen", () => {
    const filas = evolucionVigente(
      [
        {
          jornadaId: "j1",
          etiqueta: "J1",
          base: 1,
          estado: "jugo",
          estadoJornada: "papel",
          horaPartido: new Date("2026-10-03T18:00:00+02:00"),
          numeroJornada: 1,
        },
        {
          jornadaId: "j2",
          etiqueta: "J2",
          base: 2,
          estado: "jugo",
          estadoJornada: "pendiente",
          horaPartido: new Date("2026-10-11T18:00:00+02:00"),
          numeroJornada: 2,
        },
        {
          jornadaId: "j3",
          etiqueta: "J3",
          base: 3,
          estado: "jugo",
          estadoJornada: "calculada",
          horaPartido: new Date("2026-10-18T18:00:00+02:00"),
          numeroJornada: 3,
        },
      ],
      {
        fechaAlta: new Date("2026-09-01T00:00:00+02:00"),
        fechaBaja: null,
      },
    );
    expect(filas.map((f) => f.etiqueta)).toEqual(["J3"]);
  });
});

describe("formatearMediaES", () => {
  test("usa coma decimal: 7.3 -> 7,3", () => {
    expect(formatearMediaES(7.3)).toBe("7,3");
    expect(formatearMediaES(9.5)).toBe("9,5");
  });
});
