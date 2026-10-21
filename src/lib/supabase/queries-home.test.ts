import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  intentarLazySyncHome,
  leerHomeBD,
} from "./queries-home";

function respuesta(datos: unknown) {
  const p = Promise.resolve({ data: datos, error: null }) as Promise<{
    readonly data: unknown;
    readonly error: null;
  }> &
    Record<string, unknown>;
  p["eq"] = async () => ({ data: datos, error: null });
  p["in"] = async () => ({ data: datos, error: null });
  p["maybeSingle"] = async () => ({ data: datos, error: null });
  return p as unknown;
}

function clienteFalso(mapa: Record<string, unknown>): SupabaseClient {
  return {
    from: (tabla: string) => ({
      select: () => respuesta(mapa[tabla] ?? []),
    }),
  } as unknown as SupabaseClient;
}

function jornadaFila(
  id: string,
  numero: number,
  hora: string,
  estado: string,
) {
  return {
    id,
    numeroJornada: numero,
    numeroJornadaFnb: numero,
    rival: "RIVAL",
    esLocal: true,
    campo: null,
    municipio: null,
    horaPartido: hora,
    estado,
    fnbMatchId: "x",
    fnbUniversallyId: "y",
    marcadorLocal: null,
    marcadorVisitante: null,
    origenResultado: estado === "calculada" ? "fnb" : null,
    lastCalendarSync: null,
    lastResultSync: null,
  };
}

describe("leerHomeBD (RF-02/RF-08, E-15)", () => {
  test("sirve datos BD aunque falle la FNB (silencio)", async () => {
    const cliente = clienteFalso({
      jornada: [
        jornadaFila("j1", 1, "2026-10-03T18:00:00+02:00", "papel"),
        jornadaFila("j2", 2, "2026-10-11T18:00:00+02:00", "calculada"),
      ],
      resultado_jugador: [],
      alineacion: [],
      alineacion_seleccion: [],
      usuario: [],
    });
    const datos = await leerHomeBD(cliente);
    expect(datos.jornadas).toHaveLength(2);
    expect(datos.ultimaCalculadaId).toBe("j2");
    const lazy = await intentarLazySyncHome(datos.jornadas, {
      ahora: new Date("2026-10-20T12:00:00+02:00"),
      sincronizarCalendario: async () => {
        throw new Error("FNB caída");
      },
      sincronizarResultados: async () => {
        throw new Error("FNB caída");
      },
    });
    expect(lazy.sincronizado).toBe(false);
    // A pesar del fallo FNB, los datos BD siguen disponibles.
    expect(datos.jornadas.map((j) => j.id)).toEqual(["j1", "j2"]);
  });

  test("BD caída lanza (pantalla de error completa)", async () => {
    const clienteCaido = {
      from: () => ({
        select: () => {
          throw new Error("db caída");
        },
      }),
    } as unknown as SupabaseClient;
    await expect(leerHomeBD(clienteCaido)).rejects.toThrow();
  });
});
