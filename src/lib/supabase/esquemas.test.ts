import { describe, expect, test } from "vitest";
import {
  esquemaActaManual,
  esquemaGuardarAlineacion,
  esquemaJugadorSeed,
} from "./esquemas";

const UUIDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
  "00000000-0000-4000-8000-000000000005",
  "00000000-0000-4000-8000-000000000006",
] as const;

describe("esquemas Zod de borde (RF-07/RF-09/RF-10/RF-12)", () => {
  test("esquemaGuardarAlineacion acepta quinteto válido", () => {
    const r = esquemaGuardarAlineacion.safeParse({
      jornadaId: UUIDS[5],
      jugadorIds: [UUIDS[0], UUIDS[1], UUIDS[2], UUIDS[3], UUIDS[4]],
      posicionPorJugador: {
        [UUIDS[0]]: "B",
        [UUIDS[1]]: "E",
        [UUIDS[2]]: "A",
        [UUIDS[3]]: "AP",
        [UUIDS[4]]: "P",
      },
      entrenador: "maider",
      capitanId: UUIDS[0],
      instanteInicio: new Date("2026-10-11T14:00:00+02:00"),
    });
    expect(r.success).toBe(true);
  });

  test("rechaza duplicados", () => {
    const r = esquemaGuardarAlineacion.safeParse({
      jornadaId: UUIDS[5],
      jugadorIds: [UUIDS[0], UUIDS[0], UUIDS[2], UUIDS[3], UUIDS[4]],
      posicionPorJugador: {
        [UUIDS[0]]: "B",
        [UUIDS[2]]: "A",
        [UUIDS[3]]: "AP",
        [UUIDS[4]]: "P",
      },
      entrenador: "maider",
      capitanId: UUIDS[0],
      instanteInicio: new Date("2026-10-11T14:00:00+02:00"),
    });
    expect(r.success).toBe(false);
  });

  test("rechaza capitán fuera del quinteto", () => {
    const r = esquemaGuardarAlineacion.safeParse({
      jornadaId: UUIDS[5],
      jugadorIds: [UUIDS[0], UUIDS[1], UUIDS[2], UUIDS[3], UUIDS[4]],
      posicionPorJugador: {
        [UUIDS[0]]: "B",
        [UUIDS[1]]: "E",
        [UUIDS[2]]: "A",
        [UUIDS[3]]: "AP",
        [UUIDS[4]]: "P",
      },
      entrenador: "pater",
      capitanId: UUIDS[5],
      instanteInicio: new Date("2026-10-11T14:00:00+02:00"),
    });
    expect(r.success).toBe(false);
  });

  test("rechaza longitud distinta de 5 e instanteInicio ausente", () => {
    const corta = esquemaGuardarAlineacion.safeParse({
      jornadaId: UUIDS[5],
      jugadorIds: [UUIDS[0], UUIDS[1], UUIDS[2], UUIDS[3]],
      posicionPorJugador: {},
      entrenador: "maider",
      capitanId: UUIDS[0],
      instanteInicio: new Date(),
    });
    expect(corta.success).toBe(false);
    const sinInstante = esquemaGuardarAlineacion.safeParse({
      jornadaId: UUIDS[5],
      jugadorIds: [UUIDS[0], UUIDS[1], UUIDS[2], UUIDS[3], UUIDS[4]],
      posicionPorJugador: {},
      entrenador: "maider",
      capitanId: UUIDS[0],
    });
    expect(sinInstante.success).toBe(false);
  });

  test("esquemaActaManual rechaza lesionado+expulsado (E-08)", () => {
    for (const estado of ["lesionado", "no_convocado", "dnp"] as const) {
      const r = esquemaActaManual.safeParse([
        {
          jugadorId: UUIDS[0],
          valoracion: 0,
          estado,
          expulsado: true,
        },
      ]);
      expect(r.success).toBe(false);
    }
  });

  test("no-jugado exige valoración 0", () => {
    const r = esquemaActaManual.safeParse([
      { jugadorId: UUIDS[0], valoracion: 5, estado: "lesionado", expulsado: false },
    ]);
    expect(r.success).toBe(false);
    const ok = esquemaActaManual.safeParse([
      { jugadorId: UUIDS[0], valoracion: 0, estado: "lesionado", expulsado: false },
      { jugadorId: UUIDS[1], valoracion: 12, estado: "jugo", expulsado: false },
    ]);
    expect(ok.success).toBe(true);
  });

  test("valoración no entera rechaza", () => {
    const r = esquemaActaManual.safeParse([
      { jugadorId: UUIDS[0], valoracion: 12.5, estado: "jugo", expulsado: false },
    ]);
    expect(r.success).toBe(false);
  });

  test("esquemaJugadorSeed: 0/1/3+ posiciones rechaza", () => {
    const base = {
      nombre: "Test",
      nombreFnb: "TEST",
      dorsal: 9,
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "d",
      fnbUuid: UUIDS[0],
    };
    expect(
      esquemaJugadorSeed.safeParse({ ...base, posicionesValidas: [] }).success,
    ).toBe(false);
    expect(
      esquemaJugadorSeed.safeParse({ ...base, posicionesValidas: ["B"] })
        .success,
    ).toBe(false);
    expect(
      esquemaJugadorSeed.safeParse({
        ...base,
        posicionesValidas: ["B", "E", "A"],
      }).success,
    ).toBe(false);
    expect(
      esquemaJugadorSeed.safeParse({ ...base, posicionesValidas: ["B", "E"] })
        .success,
    ).toBe(true);
    expect(
      esquemaJugadorSeed.safeParse({ ...base, posicionesValidas: ["E", "A"] })
        .success,
    ).toBe(true);
  });
});
