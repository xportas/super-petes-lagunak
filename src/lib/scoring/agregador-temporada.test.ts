import { describe, expect, test } from "vitest";
import { agregarTemporada } from "./agregador-temporada";

function jornada(
  id: string,
  numero: number,
  hora: string,
  estado: "pendiente" | "calculada" | "papel" | "invalidada",
) {
  return {
    jornadaId: id,
    numeroJornada: numero,
    horaPartido: new Date(hora),
    estado,
  };
}

describe("agregarTemporada (RF-18, RF-09, RF-21)", () => {
  test("orden canónico y exclusión de pendiente/papel/invalidada", () => {
    const jornadas = [
      jornada("J2", 2, "2026-10-11T18:00:00+02:00", "calculada"),
      jornada("J1", 1, "2026-10-04T18:00:00+02:00", "calculada"),
      jornada("J3", 3, "2026-10-18T18:00:00+02:00", "pendiente"),
      jornada("J4", 4, "2026-10-25T18:00:00+02:00", "papel"),
      jornada("J5", 5, "2026-11-01T18:00:00+01:00", "invalidada"),
    ];
    const resultados = [
      { jornadaId: "J1", managerId: "m1", total: 20 },
      { jornadaId: "J2", managerId: "m1", total: 10 },
      { jornadaId: "J3", managerId: "m1", total: 100 },
      { jornadaId: "J4", managerId: "m1", total: 100 },
      { jornadaId: "J5", managerId: "m1", total: 100 },
    ];
    const r = agregarTemporada(jornadas, resultados, []);
    expect(r.puntosPorManager["m1"]).toBe(30);
    expect(r.ultimaCalculadaId).toBe("J2");
  });

  test("puestos Pº olímpicos con empate", () => {
    const jornadas = [jornada("J1", 1, "2026-10-04T18:00:00+02:00", "calculada")];
    const resultados = [
      { jornadaId: "J1", managerId: "m1", total: 30 },
      { jornadaId: "J1", managerId: "m2", total: 20 },
      { jornadaId: "J1", managerId: "m3", total: 20 },
      { jornadaId: "J1", managerId: "m4", total: 5 },
    ];
    const r = agregarTemporada(jornadas, resultados, []);
    expect(r.puestos["m1"]).toBe(1);
    expect(r.puestos["m2"]).toBe(2);
    expect(r.puestos["m3"]).toBe(2);
    expect(r.puestos["m4"]).toBe(4);
  });

  test("Top 3 managers de la última calculada con empate", () => {
    const jornadas = [
      jornada("J1", 1, "2026-10-04T18:00:00+02:00", "calculada"),
      jornada("J2", 2, "2026-10-11T18:00:00+02:00", "calculada"),
    ];
    const resultados = [
      { jornadaId: "J1", managerId: "m1", total: 99 },
      { jornadaId: "J2", managerId: "m1", total: 10 },
      { jornadaId: "J2", managerId: "m2", total: 30 },
      { jornadaId: "J2", managerId: "m3", total: 30 },
      { jornadaId: "J2", managerId: "m4", total: 5 },
    ];
    const r = agregarTemporada(jornadas, resultados, []);
    expect(r.top3ManagersUltimaCalculada.map((t) => t.managerId)).toEqual([
      "m2",
      "m3",
      "m1",
    ]);
  });

  test("Top 3 jugadores de la última calculada solo con jugo y empate", () => {
    const jornadas = [jornada("J1", 1, "2026-10-04T18:00:00+02:00", "calculada")];
    const rendimientos = [
      { jornadaId: "J1", jugadorId: "p1", base: 25, estado: "jugo" as const },
      { jornadaId: "J1", jugadorId: "p2", base: 30, estado: "dnp" as const },
      { jornadaId: "J1", jugadorId: "p3", base: 20, estado: "jugo" as const },
      { jornadaId: "J1", jugadorId: "p4", base: 20, estado: "jugo" as const },
    ];
    const r = agregarTemporada(jornadas, [], rendimientos);
    expect(r.top3JugadoresUltimaCalculada.map((t) => t.jugadorId)).toEqual([
      "p1",
      "p3",
      "p4",
    ]);
  });

  test("media 1 decimal solo jugo, null si nunca jugó", () => {
    const jornadas = [
      jornada("J1", 1, "2026-10-04T18:00:00+02:00", "calculada"),
      jornada("J2", 2, "2026-10-11T18:00:00+02:00", "calculada"),
    ];
    const rendimientos = [
      { jornadaId: "J1", jugadorId: "p1", base: 10, estado: "jugo" as const },
      { jornadaId: "J2", jugadorId: "p1", base: 11, estado: "jugo" as const },
      { jornadaId: "J1", jugadorId: "p2", base: 0, estado: "dnp" as const },
      { jornadaId: "J2", jugadorId: "p2", base: 0, estado: "dnp" as const },
    ];
    const r = agregarTemporada(jornadas, [], rendimientos);
    expect(r.mediaPorJugador["p1"]).toBe(10.5);
    expect(r.mediaPorJugador["p2"]).toBeNull();
  });

  test("media excluye pendiente/papel/invalidada", () => {
    const jornadas = [
      jornada("J1", 1, "2026-10-04T18:00:00+02:00", "calculada"),
      jornada("J2", 2, "2026-10-11T18:00:00+02:00", "papel"),
      jornada("J3", 3, "2026-10-18T18:00:00+02:00", "pendiente"),
      jornada("J4", 4, "2026-10-25T18:00:00+02:00", "invalidada"),
    ];
    const rendimientos = [
      { jornadaId: "J1", jugadorId: "p1", base: 10, estado: "jugo" as const },
      { jornadaId: "J2", jugadorId: "p1", base: 100, estado: "jugo" as const },
      { jornadaId: "J3", jugadorId: "p1", base: 100, estado: "jugo" as const },
      { jornadaId: "J4", jugadorId: "p1", base: 100, estado: "jugo" as const },
    ];
    const r = agregarTemporada(jornadas, [], rendimientos);
    expect(r.mediaPorJugador["p1"]).toBe(10);
  });

  test("sin calculadas: última null y vacíos", () => {
    const jornadas = [
      jornada("J1", 1, "2026-10-04T18:00:00+02:00", "pendiente"),
    ];
    const r = agregarTemporada(jornadas, [], []);
    expect(r.ultimaCalculadaId).toBeNull();
    expect(r.top3ManagersUltimaCalculada).toEqual([]);
    expect(r.top3JugadoresUltimaCalculada).toEqual([]);
  });

  test("misma hora ordena por numero y la última es la de mayor numero", () => {
    const hora = "2026-10-11T18:00:00+02:00";
    const jornadas = [
      jornada("JB", 2, hora, "calculada"),
      jornada("JA", 1, hora, "calculada"),
    ];
    const resultados = [
      { jornadaId: "JA", managerId: "m1", total: 5 },
      { jornadaId: "JB", managerId: "m1", total: 7 },
    ];
    const r = agregarTemporada(jornadas, resultados, []);
    expect(r.ultimaCalculadaId).toBe("JB");
    expect(r.puntosPorManager["m1"]).toBe(12);
  });
});
