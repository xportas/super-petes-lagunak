import { describe, expect, test } from "vitest";
import type { EstadoJornada } from "@/src/lib/scoring/tipos";
import {
  formatearCuentaAtras,
  resolverJornadaActiva,
  resolverUltimaCalculada,
} from "./resolver-jornada";

interface JornadaPrueba {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly horaPartido: Date;
  readonly estado: EstadoJornada;
}

function jornada(
  numeroJornada: number,
  horaIso: string,
  estado: EstadoJornada,
  jornadaId?: string,
): JornadaPrueba {
  return {
    jornadaId: jornadaId ?? `j${numeroJornada}-${estado}`,
    numeroJornada,
    horaPartido: new Date(horaIso),
    estado,
  };
}

describe("resolverJornadaActiva (RF-03/RF-04/RF-05)", () => {
  test("toma la primera pendiente cronológica (hora ASC, numero ASC)", () => {
    const j3 = jornada(3, "2026-10-25T18:00:00+02:00", "pendiente", "j3");
    const j2 = jornada(2, "2026-10-11T18:00:00+02:00", "pendiente", "j2");
    const ahora = new Date("2026-10-01T12:00:00+02:00");
    const r = resolverJornadaActiva([j3, j2], ahora);
    expect(r.tipo).toBe("activa");
    if (r.tipo !== "activa") {
      throw new Error("se esperaba activa");
    }
    expect(r.jornada.jornadaId).toBe("j2");
    expect(r.cerrada).toBe(false);
  });

  test("ahora>=cierre mantiene la jornada en Cerrado (E-03)", () => {
    const j2 = jornada(2, "2026-10-11T18:00:00+02:00", "pendiente", "j2");
    const j3 = jornada(3, "2026-10-18T18:00:00+02:00", "pendiente", "j3");
    // cierre J2 = 15:00 mismo día; 16:00 ya es >= cierre
    const ahora = new Date("2026-10-11T16:00:00+02:00");
    const r = resolverJornadaActiva([j2, j3], ahora);
    expect(r.tipo).toBe("activa");
    if (r.tipo !== "activa") {
      throw new Error("se esperaba activa");
    }
    expect(r.jornada.jornadaId).toBe("j2");
    expect(r.cerrada).toBe(true);
  });

  test("el segundo exacto del cierre ya es Cerrado", () => {
    const j2 = jornada(2, "2026-10-11T18:00:00+02:00", "pendiente", "j2");
    const ahora = new Date("2026-10-11T15:00:00+02:00");
    const r = resolverJornadaActiva([j2], ahora);
    expect(r.tipo).toBe("activa");
    if (r.tipo !== "activa") {
      throw new Error("se esperaba activa");
    }
    expect(r.cerrada).toBe(true);
  });

  test("salta a la siguiente solo al pasar a calculada/papel", () => {
    const ahora = new Date("2026-10-11T16:00:00+02:00");
    const j2pend = jornada(2, "2026-10-11T18:00:00+02:00", "pendiente", "j2");
    const j3 = jornada(3, "2026-10-18T18:00:00+02:00", "pendiente", "j3");
    const aunJ2 = resolverJornadaActiva([j2pend, j3], ahora);
    expect(aunJ2.tipo).toBe("activa");
    if (aunJ2.tipo !== "activa") {
      throw new Error("se esperaba activa");
    }
    expect(aunJ2.jornada.jornadaId).toBe("j2");

    const j2calc = jornada(2, "2026-10-11T18:00:00+02:00", "calculada", "j2");
    const trasCalculo = resolverJornadaActiva([j2calc, j3], ahora);
    expect(trasCalculo.tipo).toBe("activa");
    if (trasCalculo.tipo !== "activa") {
      throw new Error("se esperaba activa");
    }
    expect(trasCalculo.jornada.jornadaId).toBe("j3");

    const j2papel = jornada(2, "2026-10-11T18:00:00+02:00", "papel", "j2");
    const trasPapel = resolverJornadaActiva([j2papel, j3], ahora);
    expect(trasPapel.tipo).toBe("activa");
    if (trasPapel.tipo !== "activa") {
      throw new Error("se esperaba activa");
    }
    expect(trasPapel.jornada.jornadaId).toBe("j3");
  });

  test("sin pendiente muestra última disputada + Sin próxima", () => {
    const j1 = jornada(1, "2026-10-03T18:00:00+02:00", "papel", "j1");
    const j2 = jornada(2, "2026-10-11T18:00:00+02:00", "calculada", "j2");
    const ahora = new Date("2026-10-20T12:00:00+02:00");
    const r = resolverJornadaActiva([j1, j2], ahora);
    expect(r.tipo).toBe("sin_proxima");
    if (r.tipo !== "sin_proxima") {
      throw new Error("se esperaba sin_proxima");
    }
    expect(r.ultima?.jornadaId).toBe("j2");
  });

  test("0 jornadas devuelve vacía (E-01 parcial)", () => {
    const r = resolverJornadaActiva([], new Date("2026-10-01T12:00:00+02:00"));
    expect(r.tipo).toBe("vacia");
  });

  test("J1 en papel queda excluida de la activa (E-02)", () => {
    const j1 = jornada(1, "2026-10-03T18:00:00+02:00", "papel", "j1");
    const j2 = jornada(2, "2026-10-11T18:00:00+02:00", "pendiente", "j2");
    const ahora = new Date("2026-10-01T12:00:00+02:00");
    const r = resolverJornadaActiva([j1, j2], ahora);
    expect(r.tipo).toBe("activa");
    if (r.tipo !== "activa") {
      throw new Error("se esperaba activa");
    }
    expect(r.jornada.jornadaId).toBe("j2");
  });
});

describe("resolverUltimaCalculada (RF-08)", () => {
  test("toma la última calculada cronológica excluyendo papel/pendiente/invalidada", () => {
    const j1 = jornada(1, "2026-10-03T18:00:00+02:00", "papel", "j1");
    const j2 = jornada(2, "2026-10-11T18:00:00+02:00", "calculada", "j2");
    const j3 = jornada(3, "2026-10-18T18:00:00+02:00", "pendiente", "j3");
    const j4 = jornada(4, "2026-10-25T18:00:00+02:00", "invalidada", "j4");
    expect(resolverUltimaCalculada([j1, j2, j3, j4])?.jornadaId).toBe("j2");
  });

  test("sin calculada devuelve null (Sin datos)", () => {
    const j1 = jornada(1, "2026-10-03T18:00:00+02:00", "papel", "j1");
    expect(resolverUltimaCalculada([j1])).toBeNull();
    expect(resolverUltimaCalculada([])).toBeNull();
  });
});

describe("formatearCuentaAtras (E-04)", () => {
  test("acumula horas más allá de 24h: 76h -> 76:00:00", () => {
    expect(formatearCuentaAtras(76 * 3600 * 1000)).toBe("76:00:00");
  });

  test("formato HH:MM:SS con ceros", () => {
    expect(formatearCuentaAtras((3 * 3600 + 5 * 60 + 9) * 1000)).toBe(
      "03:05:09",
    );
    expect(formatearCuentaAtras(0)).toBe("00:00:00");
  });

  test("ms negativos se fijan a 00:00:00", () => {
    expect(formatearCuentaAtras(-1000)).toBe("00:00:00");
  });
});
