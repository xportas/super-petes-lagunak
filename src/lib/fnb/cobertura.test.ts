import { describe, expect, test, vi } from "vitest";
import { fetchEsb } from "./cliente-esb";
import { parsearUrlFnb } from "./esquemas";
import { detectarSegundaFase, fusionarCalendario, normalizarJornada } from "./parseo-calendario";
import { normalizarActa } from "./parseo-acta";
import { parsearHoraMadrid } from "./normalizar";
import { descargarCalendario } from "./sync-calendario";
import { descargarActaPorId } from "./sync-resultados";
import { descargarActaFnb, listarCalendarioFnb } from "./pre-relleno";
import { sincronizarCalendarioFNB, sincronizarResultadosFNB } from "./contratos";
import * as barril from "./index";
import j1 from "./fixtures/j1-55483.json";
import j2cal from "./fixtures/j2-55488.json";

function b64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf-8").toString("base64");
}

describe("fnb cobertura (T-14, ramas y compat 09)", () => {
  test("parsearUrlFnb cubre ?id, ?uuid e inválidas", () => {
    expect(parsearUrlFnb("https://www.fnbaloncesto.com/pagina-partido/?id=55488")).toEqual({ idMatch: "55488" });
    expect(parsearUrlFnb("https://www.fnbaloncesto.com/pagina-partido/?uuid=abc")).toEqual({ uuid: "abc" });
    expect(parsearUrlFnb("no-url")).toBeNull();
    expect(parsearUrlFnb("https://ejemplo.com/otra")).toBeNull();
    expect(parsearUrlFnb("https://www.fnbaloncesto.com/pagina-partido/?id=")).toBeNull();
  });

  test("fetchEsb json inválido y forma inválida lanzan", async () => {
    const malaJson = Buffer.from("no-json", "utf-8").toString("base64");
    const f1 = vi.fn(async () => ({ ok: true, status: 200, text: async () => malaJson }) as unknown as Response);
    await expect(fetchEsb("/x", f1 as unknown as typeof fetch)).rejects.toThrow(/json/);
    const forma = b64({ foo: 1 });
    const f2 = vi.fn(async () => ({ ok: true, status: 200, text: async () => forma }) as unknown as Response);
    await expect(fetchEsb("/x", f2 as unknown as typeof fetch)).rejects.toThrow(/forma/);
  });

  test("normalizarActa con raw inválido devuelve ACTA_INVALIDA", () => {
    expect(normalizarActa({}, "11659", { fnbMatchId: "1", fnbUniversallyId: "u" })).toEqual({ error: "ACTA_INVALIDA" });
  });

  test("parsearHoraMadrid Feb 30 inválido por roundtrip", () => {
    expect(parsearHoraMadrid("2026-02-30 18:00:00")).toBeNull();
  });

  test("detectarSegundaFase false sin colisión y con num inválido", () => {
    expect(
      detectarSegundaFase([{ fnbMatchId: "1", numeroJornada: 1, numeroJornadaFnb: 1 }], [
        { ...j1, idMatch: "2", numMatchDay: "2" },
      ]),
    ).toBe(false);
    expect(detectarSegundaFase([], [{ ...j1, idMatch: "x", numMatchDay: "no-num" }])).toBe(false);
  });

  test("fusionarCalendario ignora duplicados en entrantes y marca actualizadas", () => {
    const j = normalizarJornada(j1);
    if ("error" in j) throw new Error("fixture");
    const fusion = fusionarCalendario({ existentes: [], entrantes: [j, j], ignorados: [], maxNumeroLiga: 0 });
    expect(fusion.nuevas).toHaveLength(1);
    const fusion2 = fusionarCalendario({
      existentes: [{ fnbMatchId: j.fnbMatchId, numeroJornada: 1, numeroJornadaFnb: 1 }],
      entrantes: [j],
      ignorados: [],
      maxNumeroLiga: 1,
    });
    expect(fusion2.actualizadas).toHaveLength(1);
    expect(fusion2.nuevas).toHaveLength(0);
  });

  test("descargarCalendario rechaza no-array e item inválido", async () => {
    const noArray = vi.fn(
      async () => ({ ok: true, status: 200, text: async () => b64({ result: "OK", errorCode: 0, message: "", messageData: {} }) }) as unknown as Response,
    );
    await expect(descargarCalendario(noArray as unknown as typeof fetch)).rejects.toThrow(/no es array/);
    const itemMalo = vi.fn(
      async () =>
        ({ ok: true, status: 200, text: async () => b64({ result: "OK", errorCode: 0, message: "", messageData: [{ malo: 1 }] }) }) as unknown as Response,
    );
    await expect(descargarCalendario(itemMalo as unknown as typeof fetch)).rejects.toThrow(/inválido/);
  });

  test("descargarActaPorId con fitxa inválida devuelve ACTA_INVALIDA", async () => {
    const f = vi.fn(
      async () =>
        ({ ok: true, status: 200, text: async () => b64({ result: "OK", errorCode: 0, message: "", messageData: { match: { malo: 1 } } }) }) as unknown as Response,
    );
    expect(await descargarActaPorId("1", f as unknown as typeof fetch)).toEqual({ error: "ACTA_INVALIDA" });
  });

  test("pre-relleno compat: listar y descargar vía wrappers", async () => {
    const payloadCal = { result: "OK", errorCode: 0, message: "", messageData: [j2cal] };
    const b64cal = b64(payloadCal);
    const actaRaw = (await import("./fixtures/j2-55488-acta.json")).default;
    const f = (async (input: string | URL | Request) => {
      const url = input.toString();
      if (url.includes("/Match/getByTeamAllSeason/")) {
        return { ok: true, status: 200, text: async () => b64cal } as unknown as Response;
      }
      if (url.includes("/fitxaPartit/55488")) {
        const full = (await import("./fixtures/j2-55488.json")).default;
        return { ok: true, status: 200, text: async () => b64({ result: "OK", errorCode: 0, message: "", messageData: { match: full } }) } as unknown as Response;
      }
      if (url.includes("getJsonWithMatchStats")) {
        return { ok: true, status: 200, json: async () => actaRaw } as unknown as Response;
      }
      return { ok: false, status: 500, text: async () => "", json: async () => ({}) } as unknown as Response;
    }) as unknown as typeof fetch;
    const lista = await listarCalendarioFnb(f);
    expect(lista).toHaveLength(1);
    expect(lista[0]?.fnbMatchId).toBe("55488");
    const acta = await descargarActaFnb({ idMatch: "55488" }, f);
    expect(acta.fnbMatchId).toBe("55488");
    expect(acta.filas).toHaveLength(11);
    await expect(descargarActaFnb({ idMatch: "99999" }, f)).rejects.toThrow();
  });

  test("contratos no-op y barril exportan", () => {
    expect(sincronizarCalendarioFNB()).toBeUndefined();
    expect(sincronizarResultadosFNB()).toBeUndefined();
    expect(typeof barril.descargarCalendario).toBe("function");
    expect(typeof barril.preRellenarActaDesdeUrl).toBe("function");
    expect(barril.ID_TEAM).toBe("11659");
  });
});
