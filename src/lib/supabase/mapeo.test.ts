import { describe, expect, test } from "vitest";
import { esquemaPosicionesValidas } from "@/src/lib/dominio/esquemas";
import type { JugadorRow } from "./tipos";
import {
  debeReimportar,
  debeSaltarAutoPorManual,
  esPartidoIgnorado,
  esUsernameDuplicado,
  esVigenteEn,
  normalizarNombreFNB,
  normalizarUsername,
  puedeSincronizarCalendario,
  puedeSincronizarResultados,
  resolverJugadorFNB,
  resolverVinculoPorNombre,
  siguienteNumeroJornada,
  truncarValoracion,
} from "./mapeo";

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

describe("mapeo puro (RF-01/RF-10/RF-17/RF-20)", () => {
  test("normalizarUsername recorta y pasa a minúsculas", () => {
    expect(normalizarUsername(" Arnau ")).toBe("arnau");
  });

  test("Pete/pete duplicado (E-10)", () => {
    expect(esUsernameDuplicado("Pete", "pete")).toBe(true);
    expect(normalizarUsername("Pete")).toBe(normalizarUsername("pete"));
    expect(esUsernameDuplicado("Pete", "arnau")).toBe(false);
  });

  test("normalizarNombreFNB sin tildes y lower", () => {
    expect(normalizarNombreFNB("IÑIGO ORTEGA")).toBe("inigo ortega");
    expect(normalizarNombreFNB("  MARIO   SARASA   GIL ")).toBe(
      "mario sarasa gil",
    );
  });

  test("esVigenteEn bordes <= y >", () => {
    const cierre = new Date("2026-10-11T15:00:00+02:00");
    const altaIgual = new Date(cierre.getTime());
    expect(esVigenteEn(altaIgual, null, cierre)).toBe(true);
    const altaDespues = new Date(cierre.getTime() + 1);
    expect(esVigenteEn(altaDespues, null, cierre)).toBe(false);
    const bajaIgual = new Date(cierre.getTime());
    expect(esVigenteEn(new Date("2026-09-01T00:00:00+02:00"), bajaIgual, cierre)).toBe(
      false,
    );
    const bajaDespues = new Date(cierre.getTime() + 1);
    expect(
      esVigenteEn(new Date("2026-09-01T00:00:00+02:00"), bajaDespues, cierre),
    ).toBe(true);
  });

  test("truncarValoracion trunca hacia cero", () => {
    expect(truncarValoracion(12.9)).toBe(12);
    expect(truncarValoracion(-1.9)).toBe(-1);
    expect(truncarValoracion(0)).toBe(0);
  });

  test("resolverVinculoPorNombre: 1 coincidencia auto-vincula", () => {
    const plantilla = [
      jugadorBase({
        id: "00000000-0000-4000-8000-000000000011",
        nombre: "Mario Sarasa",
        nombreFnb: "MARIO SARASA GIL",
        fnbUuid: "c66dee66-eb38-11e9-83ca-0216824770c2",
      }),
      jugadorBase({
        id: "00000000-0000-4000-8000-000000000012",
        nombre: "Iker Balda",
        nombreFnb: "IKER BALDA AFONSO",
        fnbUuid: "c66df5a9-eb38-11e9-83ca-0216824770c2",
      }),
    ];
    const r = resolverVinculoPorNombre("mario sarasa gil", plantilla);
    expect(r.estado).toBe("auto");
    if (r.estado === "auto") {
      expect(r.jugador.nombreFnb).toBe("MARIO SARASA GIL");
    }
  });

  test("resolverVinculoPorNombre: 0 coincidencias a pendiente", () => {
    const plantilla = [
      jugadorBase({ nombreFnb: "MARIO SARASA GIL" }),
    ];
    const r = resolverVinculoPorNombre("DESCONOCIDO TOTAL", plantilla);
    expect(r.estado).toBe("pendiente");
    expect(r.coincidencias).toHaveLength(0);
  });

  test("resolverVinculoPorNombre: 2+ coincidencias a pendiente", () => {
    const plantilla = [
      jugadorBase({
        id: "00000000-0000-4000-8000-000000000021",
        nombre: "Pete Uno",
        nombreFnb: "PETE DUPLICADO",
      }),
      jugadorBase({
        id: "00000000-0000-4000-8000-000000000022",
        nombre: "Pete Dos",
        nombreFnb: "pete duplicado",
      }),
    ];
    const r = resolverVinculoPorNombre("PETE DUPLICADO", plantilla);
    expect(r.estado).toBe("pendiente");
    expect(r.coincidencias).toHaveLength(2);
  });

  test("dorsal nunca mapea (E-12)", () => {
    const plantilla = [
      jugadorBase({
        nombre: "Mario Sarasa",
        nombreFnb: "MARIO SARASA GIL",
        dorsal: 8,
      }),
    ];
    const r = resolverVinculoPorNombre("8", plantilla);
    expect(r.estado).toBe("pendiente");
  });

  test('["E","A"] vale tal cual', () => {
    expect(esquemaPosicionesValidas.safeParse(["E", "A"]).success).toBe(true);
  });

  test("resolverJugadorFNB: uuid primero", () => {
    const plantilla = [
      jugadorBase({
        id: "00000000-0000-4000-8000-000000000031",
        nombre: "Mario",
        nombreFnb: "MARIO SARASA GIL",
        fnbUuid: "c66dee66-eb38-11e9-83ca-0216824770c2",
      }),
    ];
    const r = resolverJugadorFNB(
      {
        uuid: "C66DEE66-EB38-11E9-83CA-0216824770C2",
        nombreActa: "OTRO NOMBRE",
      },
      plantilla,
    );
    expect(r.estado).toBe("auto");
  });

  test("resolverJugadorFNB: fallback por nombre guarda uuid al vuelo (pendiente con 0)", () => {
    const plantilla = [
      jugadorBase({ nombreFnb: "MARIO SARASA GIL", fnbUuid: null }),
    ];
    const r = resolverJugadorFNB(
      { uuid: null, nombreActa: "mario sarasa gil" },
      plantilla,
    );
    expect(r.estado).toBe("auto");
  });

  test("origen_resultado manual salta auto; corrección fnb sí reimporta; Re-importar explícito recalcula", () => {
    expect(debeSaltarAutoPorManual("manual")).toBe(true);
    expect(debeSaltarAutoPorManual("fnb")).toBe(false);
    expect(debeSaltarAutoPorManual(null)).toBe(false);
    expect(debeReimportar("manual", false)).toBe(false);
    expect(debeReimportar("manual", true)).toBe(true);
    expect(debeReimportar("fnb", false)).toBe(true);
  });

  test("fnb_partidos_ignorados no se recrea", () => {
    expect(
      esPartidoIgnorado("55483", [{ fnbMatchId: "55483" }]),
    ).toBe(true);
    expect(esPartidoIgnorado("55488", [{ fnbMatchId: "55483" }])).toBe(false);
  });

  test("throttle 24h/1h/+3h", () => {
    const ahora = new Date("2026-10-16T12:00:00+02:00");
    expect(puedeSincronizarCalendario(null, ahora)).toBe(true);
    expect(
      puedeSincronizarCalendario(
        new Date(ahora.getTime() - 25 * 3600 * 1000),
        ahora,
      ),
    ).toBe(true);
    expect(
      puedeSincronizarCalendario(
        new Date(ahora.getTime() - 23 * 3600 * 1000),
        ahora,
      ),
    ).toBe(false);
    const hora = new Date("2026-10-11T18:00:00+02:00");
    const pronto = new Date("2026-10-11T20:00:00+02:00");
    expect(puedeSincronizarResultados(null, hora, pronto)).toBe(false);
    const tarde = new Date("2026-10-11T22:00:00+02:00");
    expect(puedeSincronizarResultados(null, hora, tarde)).toBe(true);
    expect(
      puedeSincronizarResultados(
        new Date(tarde.getTime() - 30 * 60 * 1000),
        hora,
        tarde,
      ),
    ).toBe(false);
  });

  test("segunda fase aditiva con numero correlativo", () => {
    expect(siguienteNumeroJornada([])).toBe(1);
    expect(
      siguienteNumeroJornada([{ numeroJornada: 1 }, { numeroJornada: 2 }]),
    ).toBe(3);
  });
});
