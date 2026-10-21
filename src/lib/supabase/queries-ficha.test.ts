import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  leerActasJugador,
  leerJugadorPorId,
  listarPlantillaActiva,
  ordenarPlantillaActiva,
} from "./queries-ficha";
import type { JugadorRow } from "./tipos";

function jugadorBase(sobra: Partial<JugadorRow> = {}): JugadorRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    nombre: "Arnau",
    nombreFnb: "ARNAU TEST",
    dorsal: 9,
    posicionesValidas: ["B", "E"],
    nombrePete: null,
    img: "public/players/placeholder.webp",
    imgPete: "public/players/placeholder-pete.webp",
    descripcion: "Test",
    fnbUuid: null,
    estadoSanitario: "disponible",
    activo: true,
    fechaAlta: new Date("2026-09-01T00:00:00+02:00"),
    fechaBaja: null,
    ...sobra,
  };
}

describe("ordenarPlantillaActiva (RF-12)", () => {
  test("solo activos, sin entrenadores, dorsal null al final + nombre real", () => {
    const lista = ordenarPlantillaActiva([
      jugadorBase({ id: "b", nombre: "Zoe", dorsal: null }),
      jugadorBase({ id: "a", nombre: "Arnau", dorsal: 8 }),
      jugadorBase({ id: "c", nombre: "Maider", dorsal: 1 }),
      jugadorBase({
        id: "d",
        nombre: "Baja",
        dorsal: 5,
        activo: false,
      }),
    ]);
    expect(lista.map((j) => j.id)).toEqual(["a", "b"]);
  });
});

function clienteFalsoListar(filas: Array<Record<string, unknown>>) {
  return {
    from: (tabla: string) => ({
      select: () => {
        if (tabla !== "jugador") {
          return Promise.resolve({ data: [], error: null });
        }
        const p = Promise.resolve({
          data: filas,
          error: null,
        }) as Promise<unknown> & Record<string, unknown>;
        p["eq"] = async () => ({ data: filas, error: null });
        p["in"] = async () => ({ data: filas, error: null });
        return p;
      },
    }),
  } as unknown as SupabaseClient;
}

describe("listarPlantillaActiva", () => {
  test("filtra y ordena desde BD mock", async () => {
    const cliente = clienteFalsoListar([
      {
        id: "b",
        nombre: "Zoe",
        nombreFnb: "ZOE",
        dorsal: null,
        posicionesValidas: ["B", "E"],
        nombrePete: null,
        img: "a",
        imgPete: "b",
        descripcion: "d",
        fnbUuid: null,
        estadoSanitario: "disponible",
        activo: true,
        fechaAlta: "2026-09-01T00:00:00+02:00",
        fechaBaja: null,
      },
      {
        id: "a",
        nombre: "Arnau",
        nombreFnb: "ARNAU",
        dorsal: 8,
        posicionesValidas: ["B", "E"],
        nombrePete: null,
        img: "a",
        imgPete: "b",
        descripcion: "d",
        fnbUuid: null,
        estadoSanitario: "lesionado",
        activo: true,
        fechaAlta: "2026-09-01T00:00:00+02:00",
        fechaBaja: null,
      },
    ]);
    const lista = await listarPlantillaActiva(cliente);
    expect(lista.map((j) => j.id)).toEqual(["a", "b"]);
  });

  test("BD caída lanza", async () => {
    const caido = {
      from: () => ({
        select: () => {
          throw new Error("db caída");
        },
      }),
    } as unknown as SupabaseClient;
    await expect(listarPlantillaActiva(caido)).rejects.toThrow();
  });
});

describe("leerJugadorPorId (RF-13, E-12)", () => {
  test("entrenador se distingue de no_encontrado", async () => {
    const clienteEntrenador = {
      from: (tabla: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () =>
              tabla === "jugador"
                ? {
                    data: {
                      id: "x",
                      nombre: "Maider",
                      nombreFnb: "MAIDER",
                      dorsal: null,
                      posicionesValidas: null,
                      nombrePete: null,
                      img: "a",
                      imgPete: "b",
                      descripcion: "d",
                      fnbUuid: null,
                      estadoSanitario: "disponible",
                      activo: true,
                      fechaAlta: "2026-09-01T00:00:00+02:00",
                      fechaBaja: null,
                    },
                    error: null,
                  }
                : { data: null, error: null },
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const r = await leerJugadorPorId("x", clienteEntrenador);
    expect(r.tipo).toBe("entrenador");
  });
});

describe("leerActasJugador", () => {
  test("une resultados con jornadas", async () => {
    const cliente = {
      from: (tabla: string) => ({
        select: () => ({
          eq: async () => {
            if (tabla === "resultado_jugador") {
              return {
                data: [
                  {
                    jornadaId: "j2",
                    valoracion: 12,
                    estado: "jugo",
                    expulsado: false,
                  },
                ],
                error: null,
              };
            }
            return { data: [], error: null };
          },
          in: async () => ({
            data: [
              {
                id: "j2",
                numeroJornada: 2,
                rival: "R",
                esLocal: true,
                campo: null,
                municipio: null,
                horaPartido: "2026-10-11T18:00:00+02:00",
                estado: "calculada",
                fnbMatchId: null,
                fnbUniversallyId: null,
                marcadorLocal: null,
                marcadorVisitante: null,
                origenResultado: "fnb",
                lastCalendarSync: null,
                lastResultSync: null,
              },
            ],
            error: null,
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const actas = await leerActasJugador("jug1", cliente);
    expect(actas).toHaveLength(1);
    expect(actas[0]?.resultado.valoracion).toBe(12);
  });
});
