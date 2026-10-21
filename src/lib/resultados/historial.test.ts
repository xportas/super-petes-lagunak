import { describe, expect, test } from "vitest";
import {
  aDesgloseVista,
  construirHistorial,
  esElegible,
  puestoAcumuladoTras,
  type JornadaHistorial,
} from "./historial";
import type {
  DesgloseJornadaVista,
  ManagerPuesto,
} from "./tipos";
import type { Entrenador } from "../scoring/tipos";

function jornada(
  jornadaId: string,
  numeroJornada: number,
  hora: string,
  estado: JornadaHistorial["estado"],
): JornadaHistorial {
  return { jornadaId, numeroJornada, horaPartido: new Date(hora), estado };
}

function desglose(
  jornadaId: string,
  numeroJornada: number,
  hora: string,
  total: number,
): DesgloseJornadaVista {
  return {
    jornadaId,
    numeroJornada,
    horaPartido: new Date(hora),
    entrenador: "maider" as Entrenador,
    lineas: [],
    esMvp: false,
    bonusMvp: 0,
    expulsiones: 0,
    penalizacionExpulsion: 0,
    total,
  };
}

function managersBase(): readonly ManagerPuesto[] {
  return [
    { id: "a", username: "ana" },
    { id: "b", username: "bob" },
  ];
}

function totalesDe(
  filas: ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, number]>]>,
): ReadonlyMap<string, ReadonlyMap<string, number>> {
  const salida = new Map<string, ReadonlyMap<string, number>>();
  for (const [managerId, pares] of filas) {
    salida.set(managerId, new Map(pares));
  }
  return salida;
}

describe("construirHistorial (RF-04, RF-05, RF-12)", () => {
  test("Sin datos si 0 calculadas: papel/pendiente se ocultan (E-01)", () => {
    const h = construirHistorial({
      managerId: "a",
      onboardingCompletadoAt: new Date("2026-09-01T00:00:00+02:00"),
      jornadas: [
        jornada("j1", 1, "2026-10-03T18:00:00+02:00", "papel"),
        jornada("j2", 2, "2026-10-11T18:00:00+02:00", "pendiente"),
      ],
      desgloses: new Map(),
      totalesPorManager: totalesDe([]),
      managers: managersBase(),
    });
    expect(h.destacada).toBeNull();
    expect(h.filas).toEqual([]);
    expect(h.avisos).toEqual([]);
  });

  test("DESC hora_partido,numero_jornada y destacada es la última (RF-04)", () => {
    const d2 = desglose("j2", 2, "2026-10-11T18:00:00+02:00", 67);
    const d3 = desglose("j3", 3, "2026-10-18T18:00:00+02:00", 40);
    const h = construirHistorial({
      managerId: "a",
      onboardingCompletadoAt: new Date("2026-09-01T00:00:00+02:00"),
      jornadas: [
        jornada("j2", 2, "2026-10-11T18:00:00+02:00", "calculada"),
        jornada("j3", 3, "2026-10-18T18:00:00+02:00", "calculada"),
      ],
      desgloses: new Map([
        ["j2", d2],
        ["j3", d3],
      ]),
      totalesPorManager: totalesDe([
        ["a", [["j2", 67], ["j3", 40]]],
        ["b", [["j2", 10], ["j3", 10]]],
      ]),
      managers: managersBase(),
    });
    expect(h.filas).toHaveLength(2);
    const primera = h.filas[0];
    const segunda = h.filas[1];
    if (primera?.kind !== "calculada" || segunda?.kind !== "calculada") {
      throw new Error("se esperaban dos filas calculadas");
    }
    expect(primera.desglose.jornadaId).toBe("j3");
    expect(segunda.desglose.jornadaId).toBe("j2");
    expect(h.destacada?.jornadaId).toBe("j3");
  });

  test("desempate DESC por numero_jornada con misma hora", () => {
    const d1 = desglose("ja", 1, "2026-10-11T18:00:00+02:00", 10);
    const d2 = desglose("jb", 2, "2026-10-11T18:00:00+02:00", 20);
    const h = construirHistorial({
      managerId: "a",
      onboardingCompletadoAt: new Date("2026-09-01T00:00:00+02:00"),
      jornadas: [
        jornada("ja", 1, "2026-10-11T18:00:00+02:00", "calculada"),
        jornada("jb", 2, "2026-10-11T18:00:00+02:00", "calculada"),
      ],
      desgloses: new Map([
        ["ja", d1],
        ["jb", d2],
      ]),
      totalesPorManager: totalesDe([
        ["a", [["ja", 10], ["jb", 20]]],
        ["b", [["ja", 0], ["jb", 0]]],
      ]),
      managers: managersBase(),
    });
    const primera = h.filas[0];
    if (primera?.kind !== "calculada") {
      throw new Error("se esperaba fila calculada");
    }
    expect(primera.desglose.jornadaId).toBe("jb");
  });

  test("papel/pendiente se filtran; invalidada => aviso sin fila (E-06/E-07/E-08)", () => {
    const d2 = desglose("j2", 2, "2026-10-11T18:00:00+02:00", 67);
    const h = construirHistorial({
      managerId: "a",
      onboardingCompletadoAt: new Date("2026-09-01T00:00:00+02:00"),
      jornadas: [
        jornada("j1", 1, "2026-10-03T18:00:00+02:00", "papel"),
        jornada("j2", 2, "2026-10-11T18:00:00+02:00", "calculada"),
        jornada("j3", 3, "2026-10-18T18:00:00+02:00", "pendiente"),
        jornada("j4", 4, "2026-10-25T18:00:00+02:00", "invalidada"),
      ],
      desgloses: new Map([["j2", d2]]),
      totalesPorManager: totalesDe([
        ["a", [["j2", 67]]],
        ["b", [["j2", 10]]],
      ]),
      managers: managersBase(),
    });
    expect(h.filas).toHaveLength(1);
    expect(h.avisos).toHaveLength(1);
    expect(h.avisos[0]).toMatchObject({
      jornadaId: "j4",
      numeroJornada: 4,
      motivo: "invalidada",
    });
    expect(h.destacada?.jornadaId).toBe("j2");
  });

  test("fila -10 sin líneas con puesto (E-05)", () => {
    const h = construirHistorial({
      managerId: "a",
      onboardingCompletadoAt: new Date("2026-09-01T00:00:00+02:00"),
      jornadas: [jornada("j2", 2, "2026-10-11T18:00:00+02:00", "calculada")],
      desgloses: new Map(),
      totalesPorManager: totalesDe([
        ["a", [["j2", -10]]],
        ["b", [["j2", 30]]],
      ]),
      managers: managersBase(),
    });
    expect(h.filas).toHaveLength(1);
    const fila = h.filas[0];
    if (fila?.kind !== "sin_envio") {
      throw new Error("se esperaba fila sin_envio");
    }
    expect(fila.total).toBe(-10);
    expect(fila.puestoAcumulado).toBe(2);
    expect(h.destacada).toBeNull();
  });

  test("sin retroactivo: alta tardía solo ve desde su primera elegible (E-10/RF-13)", () => {
    const d2 = desglose("j2", 2, "2026-10-11T18:00:00+02:00", 25);
    const h = construirHistorial({
      managerId: "nuevo",
      onboardingCompletadoAt: new Date("2026-10-10T12:00:00+02:00"),
      jornadas: [
        jornada("j1", 1, "2026-10-03T18:00:00+02:00", "calculada"),
        jornada("j2", 2, "2026-10-11T18:00:00+02:00", "calculada"),
      ],
      desgloses: new Map([["j2", d2]]),
      totalesPorManager: totalesDe([
        ["nuevo", [["j2", 25]]],
        ["a", [["j1", 50], ["j2", 10]]],
      ]),
      managers: [
        { id: "nuevo", username: "nuevo" },
        { id: "a", username: "ana" },
      ],
    });
    expect(h.filas).toHaveLength(1);
    const fila = h.filas[0];
    if (fila?.kind !== "calculada") {
      throw new Error("se esperaba una fila calculada");
    }
    expect(fila.desglose.jornadaId).toBe("j2");
  });

  test("nunca elegible (onboarding null) => sin filas", () => {
    const h = construirHistorial({
      managerId: "a",
      onboardingCompletadoAt: null,
      jornadas: [jornada("j2", 2, "2026-10-11T18:00:00+02:00", "calculada")],
      desgloses: new Map([["j2", desglose("j2", 2, "2026-10-11T18:00:00+02:00", 10)]]),
      totalesPorManager: totalesDe([["a", [["j2", 10]]]]),
      managers: managersBase(),
    });
    expect(h.filas).toEqual([]);
    expect(h.destacada).toBeNull();
  });
});

describe("puestoAcumuladoTras (RF-06)", () => {
  test("olímpico con 0 de altas tardías contando en históricos ajenos", () => {
    const jornadas = [
      jornada("j1", 1, "2026-10-03T18:00:00+02:00", "calculada"),
      jornada("j2", 2, "2026-10-11T18:00:00+02:00", "calculada"),
    ];
    const totales = totalesDe([
      ["a", [["j1", 100], ["j2", 0]]],
      ["b", [["j1", 80], ["j2", 0]]],
      ["c", [["j1", 80], ["j2", 0]]],
      ["nuevo", [["j2", 0]]],
    ]);
    const managers: readonly ManagerPuesto[] = [
      { id: "a", username: "ana" },
      { id: "b", username: "bob" },
      { id: "c", username: "carla" },
      { id: "nuevo", username: "nuevo" },
    ];
    expect(
      puestoAcumuladoTras({
        managerId: "a",
        hastaJornadaId: "j1",
        jornadasAsc: jornadas,
        totalesPorManager: totales,
        managers,
      }),
    ).toBe(1);
    // b y c empatan a 80 en J1; el nuevo cuenta con 0 aunque no tenga fila.
    expect(
      puestoAcumuladoTras({
        managerId: "b",
        hastaJornadaId: "j1",
        jornadasAsc: jornadas,
        totalesPorManager: totales,
        managers,
      }),
    ).toBe(2);
    expect(
      puestoAcumuladoTras({
        managerId: "nuevo",
        hastaJornadaId: "j1",
        jornadasAsc: jornadas,
        totalesPorManager: totales,
        managers,
      }),
    ).toBe(4);
  });

  test("corrección J2 recalcula J2..J6 (E-09)", () => {
    const jornadas = [1, 2, 3, 4, 5, 6].map((n) =>
      jornada(
        `j${n}`,
        n,
        `2026-10-${String(n).padStart(2, "0")}T18:00:00+02:00`,
        "calculada",
      ),
    );
    const managers: readonly ManagerPuesto[] = [
      { id: "a", username: "ana" },
      { id: "b", username: "bob" },
    ];
    const baseA: ReadonlyArray<readonly [string, number]> = [
      ["j1", 10], ["j2", 10], ["j3", 10], ["j4", 10], ["j5", 10], ["j6", 10],
    ];
    const baseB: ReadonlyArray<readonly [string, number]> = [
      ["j1", 10], ["j2", 10], ["j3", 10], ["j4", 10], ["j5", 10], ["j6", 10],
    ];
    const antes = totalesDe([["a", baseA], ["b", baseB]]);
    expect(
      puestoAcumuladoTras({
        managerId: "a",
        hastaJornadaId: "j6",
        jornadasAsc: jornadas,
        totalesPorManager: antes,
        managers,
      }),
    ).toBe(1);
    const corregidaA: ReadonlyArray<readonly [string, number]> = [
      ["j1", 10], ["j2", 50], ["j3", 10], ["j4", 10], ["j5", 10], ["j6", 10],
    ];
    const despues = totalesDe([["a", corregidaA], ["b", baseB]]);
    expect(
      puestoAcumuladoTras({
        managerId: "a",
        hastaJornadaId: "j2",
        jornadasAsc: jornadas,
        totalesPorManager: despues,
        managers,
      }),
    ).toBe(1);
    expect(
      puestoAcumuladoTras({
        managerId: "b",
        hastaJornadaId: "j6",
        jornadasAsc: jornadas,
        totalesPorManager: despues,
        managers,
      }),
    ).toBe(2);
  });

  test("hasta inexistente y manager ausente no rompen", () => {
    const jornadas = [jornada("j1", 1, "2026-10-03T18:00:00+02:00", "calculada")];
    const totales = totalesDe([["a", [["j1", 5]]]]);
    expect(
      puestoAcumuladoTras({
        managerId: "a",
        hastaJornadaId: "desconocida",
        jornadasAsc: jornadas,
        totalesPorManager: totales,
        managers: [{ id: "a", username: "ana" }],
      }),
    ).toBe(1);
    expect(
      puestoAcumuladoTras({
        managerId: "fantasma",
        hastaJornadaId: "j1",
        jornadasAsc: jornadas,
        totalesPorManager: totales,
        managers: [{ id: "a", username: "ana" }],
      }),
    ).toBe(2);
  });
});

describe("esElegible", () => {
  test("null nunca es elegible; estricto antes del cierre", () => {
    const cierre = new Date("2026-10-11T15:00:00+02:00");
    expect(esElegible(null, cierre)).toBe(false);
    expect(
      esElegible(new Date("2026-10-11T15:00:00+02:00"), cierre),
    ).toBe(false);
    expect(
      esElegible(new Date("2026-10-11T14:59:59+02:00"), cierre),
    ).toBe(true);
  });
});

describe("aDesgloseVista existe (contrato para T-04)", () => {
  test("existe y es función", () => {
    expect(typeof aDesgloseVista).toBe("function");
  });
});
