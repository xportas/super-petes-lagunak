import { describe, expect, test } from "vitest";
import {
  construirGeneral,
  numeracionOlimpica,
  ordenarGeneral,
  type JornadaGeneral,
  type ManagerGeneral,
} from "./clasificacion";

function manager(
  id: string,
  username: string,
  rol: "manager" | "admin" = "manager",
): ManagerGeneral {
  return { id, username, rol };
}

function jornada(id: string, estado: JornadaGeneral["estado"]): JornadaGeneral {
  return { jornadaId: id, estado };
}

function totales(
  filas: ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, number]>]>,
): ReadonlyMap<string, ReadonlyMap<string, number>> {
  const salida = new Map<string, ReadonlyMap<string, number>>();
  for (const [managerId, pares] of filas) {
    salida.set(managerId, new Map(pares));
  }
  return salida;
}

describe("construirGeneral (RF-14, RF-15)", () => {
  test("suma solo calculada + -10; excluye papel/pendiente/invalidada", () => {
    const managers = [manager("a", "ana"), manager("b", "bob")];
    const jornadas = [
      jornada("j1", "calculada"),
      jornada("j2", "papel"),
      jornada("j3", "pendiente"),
      jornada("j4", "invalidada"),
      jornada("j5", "calculada"),
    ];
    const t = totales([
      [
        "a",
        [
          ["j1", 67],
          ["j2", 999],
          ["j3", 999],
          ["j4", 999],
          ["j5", -10],
        ],
      ],
      [
        "b",
        [
          ["j1", 50],
          ["j2", 999],
          ["j3", 999],
          ["j4", 999],
          ["j5", 30],
        ],
      ],
    ]);
    const general = construirGeneral({
      managers,
      jornadas,
      totales: t,
      miManagerId: "a",
    });
    const porId = new Map(general.filas.map((f) => [f.managerId, f] as const));
    expect(porId.get("a")?.acumulado).toBe(57);
    expect(porId.get("b")?.acumulado).toBe(80);
    expect(general.miManagerId).toBe("a");
    expect(general.hayColores).toBe(true);
  });

  test("0 calculadas => acumulados 0 y sin colores (E-01)", () => {
    const managers = [manager("a", "ana")];
    const jornadas = [jornada("j1", "papel"), jornada("j2", "pendiente")];
    const general = construirGeneral({
      managers,
      jornadas,
      totales: totales([["a", [["j1", 999]]]]),
      miManagerId: "a",
    });
    expect(general.filas).toHaveLength(1);
    expect(general.filas[0]?.acumulado).toBe(0);
    expect(general.hayColores).toBe(false);
  });

  test("todo a cero con calculadas => sin colores (E-02)", () => {
    const managers = [manager("a", "ana"), manager("b", "bob")];
    const jornadas = [jornada("j1", "calculada")];
    const general = construirGeneral({
      managers,
      jornadas,
      totales: totales([
        ["a", [["j1", 0]]],
        ["b", [["j1", 0]]],
      ]),
      miManagerId: "a",
    });
    expect(general.hayColores).toBe(false);
  });

  test("orden acumulado DESC + username ASC case-insensitive", () => {
    const managers = [
      manager("z", "Zoe"),
      manager("a", "ana"),
      manager("b", "Bob"),
    ];
    const jornadas = [jornada("j1", "calculada")];
    const t = totales([
      ["z", [["j1", 10]]],
      ["a", [["j1", 10]]],
      ["b", [["j1", 10]]],
    ]);
    const general = construirGeneral({
      managers,
      jornadas,
      totales: t,
      miManagerId: "a",
    });
    expect(general.filas.map((f) => f.username)).toEqual(["ana", "Bob", "Zoe"]);
  });

  test("olímpica 1,2,2,4", () => {
    const managers = [
      manager("a", "ana"),
      manager("b", "bob"),
      manager("c", "carla"),
      manager("d", "dan"),
    ];
    const jornadas = [jornada("j1", "calculada")];
    const t = totales([
      ["a", [["j1", 100]]],
      ["b", [["j1", 80]]],
      ["c", [["j1", 80]]],
      ["d", [["j1", 70]]],
    ]);
    const general = construirGeneral({
      managers,
      jornadas,
      totales: t,
      miManagerId: "a",
    });
    const porId = new Map(general.filas.map((f) => [f.managerId, f] as const));
    expect(porId.get("a")?.puesto).toBe(1);
    expect(porId.get("b")?.puesto).toBe(2);
    expect(porId.get("c")?.puesto).toBe(2);
    expect(porId.get("d")?.puesto).toBe(4);
  });

  test("Admin excluido aunque lidere (E-19)", () => {
    const managers = [
      manager("admin", "admin", "admin"),
      manager("a", "ana"),
    ];
    const jornadas = [jornada("j1", "calculada")];
    const t = totales([
      ["admin", [["j1", 999]]],
      ["a", [["j1", 10]]],
    ]);
    const general = construirGeneral({
      managers,
      jornadas,
      totales: t,
      miManagerId: "a",
    });
    expect(general.filas.map((f) => f.managerId)).toEqual(["a"]);
  });

  test("nuevo con 0 adelanta a veterano en negativo (E-11)", () => {
    const managers = [manager("vet", "vet"), manager("nuevo", "nuevo")];
    const jornadas = [jornada("j1", "calculada")];
    const totalesSoloVet = totales([["vet", [["j1", -5]]]]);
    const general = construirGeneral({
      managers,
      jornadas,
      totales: totalesSoloVet,
      miManagerId: "nuevo",
    });
    expect(general.filas[0]?.managerId).toBe("nuevo");
    expect(general.filas[0]?.acumulado).toBe(0);
    expect(general.filas[1]?.managerId).toBe("vet");
  });

  test("recálculo J2 visto en J6 actualiza acumulados y puestos (E-09)", () => {
    const managers = [manager("a", "ana"), manager("b", "bob")];
    const jornadas = [
      jornada("j1", "calculada"),
      jornada("j2", "calculada"),
      jornada("j3", "calculada"),
      jornada("j4", "calculada"),
      jornada("j5", "calculada"),
      jornada("j6", "calculada"),
    ];
    const base: ReadonlyArray<readonly [string, number]> = [
      ["j1", 10],
      ["j2", 10],
      ["j3", 10],
      ["j4", 10],
      ["j5", 10],
      ["j6", 10],
    ];
    const antes = construirGeneral({
      managers,
      jornadas,
      totales: totales([
        ["a", base],
        ["b", base],
      ]),
      miManagerId: "a",
    });
    expect(antes.filas[0]?.puesto).toBe(1);
    expect(antes.filas[1]?.puesto).toBe(1);
    const corregida: ReadonlyArray<readonly [string, number]> = [
      ["j1", 10],
      ["j2", 50],
      ["j3", 10],
      ["j4", 10],
      ["j5", 10],
      ["j6", 10],
    ];
    const despues = construirGeneral({
      managers,
      jornadas,
      totales: totales([
        ["a", corregida],
        ["b", base],
      ]),
      miManagerId: "a",
    });
    const porId = new Map(despues.filas.map((f) => [f.managerId, f] as const));
    expect(porId.get("a")?.acumulado).toBe(100);
    expect(porId.get("b")?.acumulado).toBe(60);
    expect(porId.get("a")?.puesto).toBe(1);
    expect(porId.get("b")?.puesto).toBe(2);
  });

  test("sin managers => filas vacías y sin colores", () => {
    const general = construirGeneral({
      managers: [],
      jornadas: [jornada("j1", "calculada")],
      totales: totales([]),
      miManagerId: "nadie",
    });
    expect(general.filas).toEqual([]);
    expect(general.hayColores).toBe(false);
  });
});

describe("ordenarGeneral + numeracionOlimpica", () => {
  test("vacío y unitario", () => {
    expect(ordenarGeneral([])).toEqual([]);
    expect(
      numeracionOlimpica([{ managerId: "a", username: "ana", acumulado: 5 }]),
    ).toEqual([{ managerId: "a", username: "ana", acumulado: 5, puesto: 1 }]);
  });

  test("desempate alfabético case-insensitive con tie-break determinista", () => {
    const ordenadas = ordenarGeneral([
      { managerId: "b", username: "bob", acumulado: 10 },
      { managerId: "a", username: "Ana", acumulado: 10 },
      { managerId: "c", username: "ana", acumulado: 10 },
    ]);
    expect(ordenadas.map((f) => f.managerId)).toEqual(["a", "c", "b"]);
    const conPuesto = numeracionOlimpica(ordenadas);
    expect(conPuesto.map((f) => f.puesto)).toEqual([1, 1, 1]);
  });

  test("tie-break con misma minúscula en ambos sentidos + empate total", () => {
    const directo = ordenarGeneral([
      { managerId: "x", username: "ana", acumulado: 10 },
      { managerId: "y", username: "Ana", acumulado: 10 },
    ]);
    expect(directo.map((f) => f.managerId)).toEqual(["y", "x"]);
    const inverso = ordenarGeneral([
      { managerId: "y", username: "Ana", acumulado: 10 },
      { managerId: "x", username: "ana", acumulado: 10 },
    ]);
    expect(inverso.map((f) => f.managerId)).toEqual(["y", "x"]);
    const gemelos = ordenarGeneral([
      { managerId: "x", username: "ana", acumulado: 10 },
      { managerId: "y", username: "ana", acumulado: 10 },
    ]);
    expect(gemelos).toHaveLength(2);
  });
});
