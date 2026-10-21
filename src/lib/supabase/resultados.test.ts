import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  leerActaDe,
  leerAlineacionDe,
  leerJornadasOrdenadas,
  leerManagersElegibles,
  leerPlantillaVigenteEn,
} from "./resultados";

function respuesta(datos: unknown, error: { message: string } | null = null) {
  return { data: datos, error };
}

function consulta(resultado: unknown) {
  const nodo: Record<string, unknown> = {};
  nodo["eq"] = () => nodo;
  nodo["in"] = () => nodo;
  nodo["maybeSingle"] = async () => resultado;
  nodo["single"] = async () => resultado;
  nodo["then"] = (
    res: (v: unknown) => unknown,
    rej?: (e: unknown) => unknown,
  ) => Promise.resolve(resultado).then(res, rej);
  return nodo;
}

function clienteFalso(
  mapa: Record<string, unknown>,
  errores: Record<string, string> = {},
): SupabaseClient {
  return {
    from: (tabla: string) => ({
      select: () => {
        if (errores[tabla] !== undefined) {
          throw new Error(errores[tabla] as string);
        }
        return consulta(respuesta(mapa[tabla] ?? []));
      },
    }),
  } as unknown as SupabaseClient;
}

function jornadaFila(over: Record<string, unknown> = {}) {
  return {
    id: "j1",
    numeroJornada: 1,
    numeroJornadaFnb: 1,
    rival: "RIVAL",
    esLocal: true,
    campo: "Campo",
    municipio: "Muni",
    horaPartido: "2026-10-11T18:00:00+02:00",
    estado: "calculada",
    fnbMatchId: "m",
    fnbUniversallyId: "u",
    marcadorLocal: 70,
    marcadorVisitante: 65,
    origenResultado: "fnb",
    lastCalendarSync: "2026-10-10T10:00:00+02:00",
    lastResultSync: "2026-10-11T21:00:00+02:00",
    ...over,
  };
}

describe("leerJornadasOrdenadas (RF-05, RF-14)", () => {
  test("ordena por hora_partido ASC, numero_jornada ASC y filtra inválidas", async () => {
    const cliente = clienteFalso({
      jornada: [
        jornadaFila({
          id: "j3",
          numeroJornada: 3,
          horaPartido: "2026-10-25T18:00:00+02:00",
        }),
        jornadaFila({
          id: "jb",
          numeroJornada: 2,
          horaPartido: "2026-10-11T18:00:00+02:00",
          numeroJornadaFnb: null,
          rival: null,
          esLocal: false,
          campo: null,
          municipio: 123,
          estado: "pendiente",
          fnbMatchId: null,
          fnbUniversallyId: null,
          marcadorLocal: "x",
          marcadorVisitante: null,
          origenResultado: null,
          lastCalendarSync: "no-fecha",
          lastResultSync: null,
        }),
        jornadaFila({
          id: "ja",
          numeroJornada: 1,
          horaPartido: new Date("2026-10-03T18:00:00+02:00"),
        }),
        jornadaFila({ id: "mala-hora", horaPartido: null }),
        jornadaFila({ id: "mala-hora-2", horaPartido: "nope" }),
        jornadaFila({
          id: "mala-hora-3",
          horaPartido: new Date(Number.NaN),
        }),
        jornadaFila({ id: "mal-estado", estado: "desconocido" }),
        { numeroJornada: 9, horaPartido: "2026-10-11T18:00:00+02:00" },
        jornadaFila({ id: "mal-numero", numeroJornada: "dos" }),
      ],
    });
    const filas = await leerJornadasOrdenadas(cliente);
    expect(filas.map((j) => j.id)).toEqual(["ja", "jb", "j3"]);
    expect(filas[0]?.horaPartido instanceof Date).toBe(true);
  });

  test("BD con error lanza sin parciales (RF-19)", async () => {
    const cliente = clienteFalso({}, { jornada: "db caída" });
    await expect(leerJornadasOrdenadas(cliente)).rejects.toThrow();
  });
});

describe("leerAlineacionDe (RF-05)", () => {
  test("devuelve null si no envió (base del -10)", async () => {
    const cliente = {
      from: (tabla: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () =>
                respuesta(tabla === "alineacion" ? null : []),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    await expect(
      leerAlineacionDe("m1", "j2", cliente),
    ).resolves.toBeNull();
  });

  test("devuelve alineación + selecciones si envió", async () => {
    const aline = {
      id: "a1",
      managerId: "m1",
      jornadaId: "j2",
      entrenador: "maider",
      capitanJugadorId: "p1",
      instanteInicio: "2026-10-11T14:00:00+02:00",
    };
    const sels = [
      { alineacionId: "a1", jugadorId: "p1", posicionAlineada: "B" },
      { alineacionId: "a1", jugadorId: "p2", posicionAlineada: "E" },
    ];
    const cliente = {
      from: (tabla: string) => ({
        select: () =>
          consulta(
            respuesta(tabla === "alineacion" ? aline : sels),
          ),
      }),
    } as unknown as SupabaseClient;
    const r = await leerAlineacionDe("m1", "j2", cliente);
    expect(r?.alineacion).toMatchObject({ id: "a1" });
    expect(r?.selecciones).toHaveLength(2);
  });

  test("error en alineacion lanza", async () => {
    const cliente = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () =>
                respuesta(null, { message: "caída" }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    await expect(leerAlineacionDe("m1", "j2", cliente)).rejects.toThrow();
  });

  test("error en selecciones lanza", async () => {
    const cliente = {
      from: (tabla: string) => ({
        select: () =>
          consulta(
            tabla === "alineacion"
              ? respuesta({ id: "a1" })
              : respuesta(null, { message: "caída" }),
          ),
      }),
    } as unknown as SupabaseClient;
    await expect(leerAlineacionDe("m1", "j2", cliente)).rejects.toThrow();
  });
});

describe("leerActaDe (RF-14)", () => {
  test("filtra filas sin jornadaId y lanza con error", async () => {
    const cliente = clienteFalso({
      resultado_jugador: [
        { jornadaId: "j2", jugadorId: "p1", valoracion: 12 },
        { jugadorId: "p2", valoracion: 3 },
      ],
    });
    const acta = await leerActaDe("j2", cliente);
    expect(acta).toHaveLength(1);
    const caido = clienteFalso({}, { resultado_jugador: "db caída" });
    await expect(leerActaDe("j2", caido)).rejects.toThrow();
  });
});

describe("leerManagersElegibles (RF-15)", () => {
  test("excluye admin y filas inválidas", async () => {
    const cliente = clienteFalso({
      usuario: [
        { id: "m1", username: "ana", rol: "manager" },
        { id: "a1", username: "admin", rol: "admin" },
        { username: "sin-id", rol: "manager" },
        { id: "m2", rol: "manager" },
      ],
    });
    const managers = await leerManagersElegibles(cliente);
    expect(managers.map((m) => m.id)).toEqual(["m1"]);
    const caido = clienteFalso({}, { usuario: "db caída" });
    await expect(leerManagersElegibles(caido)).rejects.toThrow();
  });
});

describe("leerPlantillaVigenteEn", () => {
  test("filtra por vigencia y filas inválidas", async () => {
    const cierre = new Date("2026-10-11T15:00:00+02:00");
    const cliente = clienteFalso({
      jugador: [
        {
          id: "p1",
          fechaAlta: "2026-09-01T00:00:00+02:00",
          fechaBaja: null,
        },
        {
          id: "p2",
          fechaAlta: "2026-11-01T00:00:00+01:00",
          fechaBaja: null,
        },
        { id: "p3", fechaAlta: "no-fecha", fechaBaja: null },
        { fechaAlta: "2026-09-01T00:00:00+02:00" },
      ],
    });
    const plantilla = await leerPlantillaVigenteEn(cierre, cliente);
    expect(plantilla.map((j) => j.id)).toEqual(["p1"]);
    const caido = clienteFalso({}, { jugador: "db caída" });
    await expect(leerPlantillaVigenteEn(cierre, caido)).rejects.toThrow();
  });
});
