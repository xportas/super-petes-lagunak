import { describe, expect, test } from "vitest";
import {
  construirTotales,
  type ActaJugadorTotales,
  type EntradaTotales,
} from "./totales";
import type { Posicion } from "../scoring/tipos";
import type { JornadaHistorial } from "./tipos";

const B: readonly [Posicion, Posicion] = ["B", "E"];
const E: readonly [Posicion, Posicion] = ["E", "A"];
const A: readonly [Posicion, Posicion] = ["A", "AP"];
const AP: readonly [Posicion, Posicion] = ["AP", "P"];
const P: readonly [Posicion, Posicion] = ["P", "B"];

function jornada(
  jornadaId: string,
  numeroJornada: number,
  hora: string,
  estado: JornadaHistorial["estado"],
): JornadaHistorial {
  return { jornadaId, numeroJornada, horaPartido: new Date(hora), estado };
}

const JORNADAS: readonly JornadaHistorial[] = [
  // Intencionadamente desordenadas: el orquestador ordena en canónico.
  jornada("j7", 7, "2026-11-08T18:00:00+01:00", "calculada"),
  jornada("j1", 1, "2026-10-03T18:00:00+02:00", "papel"),
  jornada("j5", 5, "2026-11-01T18:00:00+01:00", "invalidada"),
  jornada("j3", 3, "2026-10-18T18:00:00+02:00", "calculada"),
  jornada("j8", 8, "2026-11-15T18:00:00+01:00", "calculada"),
  jornada("j2", 2, "2026-10-11T18:00:00+02:00", "calculada"),
  jornada("j4", 4, "2026-10-25T18:00:00+02:00", "pendiente"),
  jornada("j6", 6, "2026-11-08T18:00:00+01:00", "calculada"),
];

function sels(
  alineacionId: string,
  ids: readonly string[],
): { alineacionId: string; jugadorId: string; posicionAlineada: Posicion }[] {
  const slots: readonly Posicion[] = ["B", "E", "A", "AP", "P"];
  return ids.map((jugadorId, i) => ({
    alineacionId,
    jugadorId,
    posicionAlineada: (slots[i] ?? "B") as Posicion,
  }));
}

function entradaBase(): EntradaTotales {
  return {
    jornadas: JORNADAS,
    managers: [
      { id: "a", username: "ana", onboardingCompletadoAt: new Date("2026-09-01T00:00:00+02:00") },
      { id: "b", username: "bob", onboardingCompletadoAt: new Date("2026-09-01T00:00:00+02:00") },
      { id: "n", username: "nuevo", onboardingCompletadoAt: new Date("2026-10-10T12:00:00+02:00") },
      { id: "t", username: "tardio", onboardingCompletadoAt: new Date("2026-12-01T00:00:00+01:00") },
      { id: "v", username: "vacio", onboardingCompletadoAt: new Date("2026-09-01T00:00:00+02:00") },
      { id: "s", username: "sinOnb", onboardingCompletadoAt: null },
    ],
    alineaciones: [
      { id: "a-a2", managerId: "a", jornadaId: "j2", entrenador: "maider", capitanJugadorId: "p1" },
      { id: "a-a3", managerId: "a", jornadaId: "j3", entrenador: "maider", capitanJugadorId: "p1" },
      { id: "a-a6", managerId: "a", jornadaId: "j6", entrenador: "pater", capitanJugadorId: "p2" },
      { id: "a-a7", managerId: "a", jornadaId: "j7", entrenador: "maider", capitanJugadorId: "p1" },
      { id: "a-a8", managerId: "a", jornadaId: "j8", entrenador: "maider", capitanJugadorId: "p1" },
      { id: "a-b2", managerId: "b", jornadaId: "j2", entrenador: "pater", capitanJugadorId: "p1" },
      { id: "a-b3", managerId: "b", jornadaId: "j3", entrenador: "maider", capitanJugadorId: "p1" },
      { id: "a-b6", managerId: "b", jornadaId: "j6", entrenador: "maider", capitanJugadorId: "p1" },
      { id: "a-b7", managerId: "b", jornadaId: "j7", entrenador: "maider", capitanJugadorId: "p1" },
      { id: "a-n3", managerId: "n", jornadaId: "j3", entrenador: "maider", capitanJugadorId: "p5" },
      { id: "a-n7", managerId: "n", jornadaId: "j7", entrenador: "maider", capitanJugadorId: "p1" },
      { id: "a-t2", managerId: "t", jornadaId: "j2", entrenador: "maider", capitanJugadorId: "p1" },
      { id: "a-s2", managerId: "s", jornadaId: "j2", entrenador: "maider", capitanJugadorId: "p1" },
    ],
    selecciones: [
      ...sels("a-a2", ["p1", "p2", "p3", "p4", "p5"]),
      ...sels("a-a3", ["p1", "p2", "p3", "p4", "p5"]),
      ...sels("a-a6", ["p1", "p2", "p3", "p4", "p5"]),
      ...sels("a-a7", ["p1", "p2", "p3", "p4", "p5"]),
      ...sels("a-a8", ["p1", "p2", "p3", "p4", "p5"]),
      ...sels("a-b2", ["p1", "p2", "p3", "p4", "p7"]),
      ...sels("a-b3", ["p1", "p2", "p3", "p4"]),
      ...sels("a-b7", ["p1", "p2", "p3", "p4", "p7"]),
      ...sels("a-n3", ["p1", "p2", "p3", "p4", "p5"]),
      ...sels("a-n7", ["p1", "p2", "p3", "p4", "p8"]),
      ...sels("a-t2", ["p1", "p2", "p3", "p4", "p5"]),
      ...sels("a-s2", ["p1", "p2", "p3", "p4", "p5"]),
    ],
    actas: new Map<string, ReadonlyMap<string, ActaJugadorTotales>>([
      ["j2", new Map<string, ActaJugadorTotales>([
        ["p1", { valoracion: 12, estado: "jugo", expulsado: false }],
        ["p2", { valoracion: 8, estado: "jugo", expulsado: false }],
        ["p3", { valoracion: 6, estado: "jugo", expulsado: false }],
        ["p4", { valoracion: 4, estado: "jugo", expulsado: false }],
        ["p5", { valoracion: 2, estado: "jugo", expulsado: false }],
        ["p6", { valoracion: 10, estado: "jugo", expulsado: false }],
        ["p7", { valoracion: 5, estado: "lesionado", expulsado: true }],
      ])],
      ["j3", new Map<string, ActaJugadorTotales>([
        ["p1", { valoracion: 10, estado: "jugo", expulsado: false }],
        ["p2", { valoracion: 7, estado: "lesionado", expulsado: false }],
        ["p3", { valoracion: 5, estado: "no_convocado", expulsado: false }],
        ["p4", { valoracion: 3, estado: "dnp", expulsado: false }],
        ["p5", { valoracion: 0, estado: "jugo", expulsado: false }],
      ])],
      ["j6", new Map<string, ActaJugadorTotales>([
        ["p1", { valoracion: 0, estado: "dnp", expulsado: false }],
        ["p2", { valoracion: 0, estado: "dnp", expulsado: false }],
        ["p3", { valoracion: 0, estado: "dnp", expulsado: false }],
        ["p4", { valoracion: 0, estado: "dnp", expulsado: false }],
        ["p5", { valoracion: 0, estado: "dnp", expulsado: false }],
      ])],
      ["j7", new Map<string, ActaJugadorTotales>([
        ["p1", { valoracion: 10, estado: "jugo", expulsado: false }],
        ["p2", { valoracion: 7, estado: "jugo", expulsado: false }],
        ["p3", { valoracion: 5, estado: "jugo", expulsado: false }],
        ["p4", { valoracion: 3, estado: "jugo", expulsado: false }],
        ["p7", { valoracion: 5, estado: "jugo", expulsado: false }],
        ["p8", { valoracion: 5, estado: "jugo", expulsado: false }],
      ])],
    ]),
    posiciones: new Map([
      ["p1", { posicionesValidas: B }],
      ["p2", { posicionesValidas: E }],
      ["p3", { posicionesValidas: A }],
      ["p4", { posicionesValidas: AP }],
      ["p5", { posicionesValidas: P }],
      ["p7", { posicionesValidas: B }],
      ["p8", { posicionesValidas: null }],
    ]),
  };
}

describe("construirTotales", () => {
  test("ana: j2 66 con MVP, j3 22 con racha -1, j6 10 con Páter todo DNP", () => {
    const salida = construirTotales(entradaBase());
    const totales = salida.totalesPorManager.get("a");
    expect(totales?.get("j2")).toBe(66);
    expect(totales?.get("j3")).toBe(22);
    expect(totales?.get("j6")).toBe(10);
    expect(totales?.has("j1")).toBe(false);
    expect(totales?.has("j4")).toBe(false);
    expect(totales?.has("j5")).toBe(false);
    expect(totales?.has("j7")).toBe(false);
    expect(totales?.has("j8")).toBe(false);
    const desgloses = salida.desglosesPorManager.get("a");
    expect(desgloses?.get("j2")?.total).toBe(66);
    expect(desgloses?.get("j2")?.esMvp).toBe(true);
    expect(desgloses?.get("j2")?.bonusMvp).toBe(3);
    const j3 = desgloses?.get("j3");
    expect(j3?.total).toBe(22);
    const p1 = j3?.lineas.find((l) => l.jugadorId === "p1");
    expect(p1?.penalizacionRacha).toBe(-1);
    expect(p1?.icono).toBe("jugo");
    expect(j3?.lineas.find((l) => l.jugadorId === "p2")?.icono).toBe("lesionado");
    expect(j3?.lineas.find((l) => l.jugadorId === "p3")?.icono).toBe("no_convocado");
    expect(j3?.lineas.find((l) => l.jugadorId === "p4")?.icono).toBe("dnp");
    const j6 = desgloses?.get("j6");
    expect(j6?.esMvp).toBe(false);
    expect(j6?.bonusMvp).toBe(0);
    expect(j6?.entrenador).toBe("pater");
  });

  test("nuevo: -10 en j2, 15 en j3 sin MVP (capitán no máximo), -10 en j6", () => {
    const salida = construirTotales(entradaBase());
    const totales = salida.totalesPorManager.get("n");
    expect(totales?.get("j2")).toBe(-10);
    expect(totales?.get("j3")).toBe(15);
    expect(totales?.get("j6")).toBe(-10);
    expect(totales?.has("j7")).toBe(false);
    expect(salida.desglosesPorManager.get("n")?.has("j2")).toBe(false);
    expect(salida.desglosesPorManager.get("n")?.get("j3")?.esMvp).toBe(false);
  });

  test("bob: error del motor en j2, 4 selecciones en j3, sin selecciones en j6; j7 válido y -10 en j8", () => {
    const salida = construirTotales(entradaBase());
    const totales = salida.totalesPorManager.get("b");
    expect(totales?.get("j2")).toBeUndefined();
    expect(totales?.get("j3")).toBeUndefined();
    expect(totales?.get("j6")).toBeUndefined();
    expect(totales?.get("j7")).toBe(58);
    expect(totales?.get("j8")).toBe(-10);
    expect(salida.desglosesPorManager.get("b")?.get("j7")?.total).toBe(58);
    expect(salida.desglosesPorManager.get("b")?.has("j2")).toBe(false);
  });

  test("tardío y sin onboarding: sin filas ni -10", () => {
    const salida = construirTotales(entradaBase());
    expect(salida.totalesPorManager.get("t")).toEqual(new Map());
    expect(salida.totalesPorManager.get("s")).toEqual(new Map());
  });

  test("vacío elegible sin alineaciones: -10 en cada calculada", () => {
    const salida = construirTotales(entradaBase());
    const totales = salida.totalesPorManager.get("v");
    expect(totales?.get("j2")).toBe(-10);
    expect(totales?.get("j3")).toBe(-10);
    expect(totales?.get("j6")).toBe(-10);
    expect(totales?.get("j7")).toBe(-10);
    expect(totales?.get("j8")).toBe(-10);
    expect(totales?.has("j1")).toBe(false);
    expect(totales?.has("j4")).toBe(false);
    expect(totales?.has("j5")).toBe(false);
  });

  test("primera jornada sin anteriores: rachas a cero y MVP", () => {
    const salida = construirTotales({
      jornadas: [jornada("j1", 1, "2026-10-03T18:00:00+02:00", "calculada")],
      managers: [
        {
          id: "a",
          username: "ana",
          onboardingCompletadoAt: new Date("2026-09-01T00:00:00+02:00"),
        },
      ],
      alineaciones: [
        {
          id: "x",
          managerId: "a",
          jornadaId: "j1",
          entrenador: "maider",
          capitanJugadorId: "p1",
        },
      ],
      selecciones: sels("x", ["p1", "p2", "p3", "p4", "p5"]),
      actas: new Map([
        ["j1", new Map([
          ["p1", { valoracion: 12, estado: "jugo", expulsado: false }],
          ["p2", { valoracion: 8, estado: "jugo", expulsado: false }],
          ["p3", { valoracion: 6, estado: "jugo", expulsado: false }],
          ["p4", { valoracion: 4, estado: "jugo", expulsado: false }],
          ["p5", { valoracion: 2, estado: "jugo", expulsado: false }],
        ])],
      ]),
      posiciones: new Map([
        ["p1", { posicionesValidas: B }],
        ["p2", { posicionesValidas: E }],
        ["p3", { posicionesValidas: A }],
        ["p4", { posicionesValidas: AP }],
        ["p5", { posicionesValidas: P }],
      ]),
    });
    expect(salida.totalesPorManager.get("a")?.get("j1")).toBe(66);
  });

  test("sin managers y sin jornadas => mapas vacíos", () => {
    const sinManagers = construirTotales({ ...entradaBase(), managers: [] });
    expect(sinManagers.totalesPorManager.size).toBe(0);
    expect(sinManagers.desglosesPorManager.size).toBe(0);
    const sinJornadas = construirTotales({ ...entradaBase(), jornadas: [] });
    expect(sinJornadas.totalesPorManager.get("a")).toEqual(new Map());
  });
});
