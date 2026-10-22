import { describe, expect, test } from "vitest";
import { descargarActaPorId, descargarActaPorUuid, preRellenarActaDesdeUrl } from "./sync-resultados";
import actaJ2 from "./fixtures/j2-55488-acta.json";
import j1 from "./fixtures/j1-55483.json";
import j2 from "./fixtures/j2-55488.json";

function b64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf-8").toString("base64");
}

function mockFetch(handlers: Record<string, unknown>): typeof fetch {
  return (async (input: string | URL | Request, _init?: RequestInit) => {
    void _init;
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/Match/getByTeamAllSeason/")) {
      const payload = { result: "OK", errorCode: 0, message: "", messageData: [j1, j2] };
      return { ok: true, status: 200, text: async () => b64(payload) } as unknown as Response;
    }
    if (url.includes("/FCBQWeb/fitxaPartit/55488")) {
      const payload = { result: "OK", errorCode: 0, message: "", messageData: { match: j2 } };
      return { ok: true, status: 200, text: async () => b64(payload) } as unknown as Response;
    }
    if (url.includes("/FCBQWeb/fitxaPartit/99999")) {
      const otro = { ...j2, idMatch: "99999", idLocalTeam: "1", nameLocalTeam: "OTRO A", idVisitorTeam: "2", nameVisitorTeam: "OTRO B" };
      const payload = { result: "OK", errorCode: 0, message: "", messageData: { match: otro } };
      return { ok: true, status: 200, text: async () => b64(payload) } as unknown as Response;
    }
    if (url.includes("/FCBQWeb/fitxaPartit/")) {
      const payload = { result: "OK", errorCode: 0, message: "", messageData: { match: j1 } };
      return { ok: true, status: 200, text: async () => b64(payload) } as unknown as Response;
    }
    if (url.includes("getJsonWithMatchStats/6acbcc7bd75749bb61a786f8")) {
      return { ok: true, status: 200, json: async () => actaJ2 } as unknown as Response;
    }
    void handlers;
    return { ok: false, status: 500, text: async () => "", json: async () => ({}) } as unknown as Response;
  }) as unknown as typeof fetch;
}

describe("fnb pre-relleno URL (T-12, RF-10/RF-11)", () => {
  test("?id=55488 descarga fitxa + acta con 11 sin guardar", async () => {
    const r = await descargarActaPorId("55488", mockFetch({}));
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.fnbMatchId).toBe("55488");
    expect(r.porJugador).toHaveLength(11);
  });

  test("?uuid cruza calendario 11659 y descarga acta", async () => {
    const r = await descargarActaPorUuid("6acbcc7bd75749bb61a786f8", mockFetch({}));
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.fnbMatchId).toBe("55488");
  });

  test("preRellenarActaDesdeUrl con ?id= válido", async () => {
    const r = await preRellenarActaDesdeUrl("https://www.fnbaloncesto.com/pagina-partido/?id=55488&tab=1", mockFetch({}));
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.porJugador).toHaveLength(11);
  });

  test("preRellenarActaDesdeUrl con ?uuid= válido", async () => {
    const r = await preRellenarActaDesdeUrl(
      "https://www.fnbaloncesto.com/pagina-partido/?uuid=6acbcc7bd75749bb61a786f8",
      mockFetch({}),
    );
    expect("error" in r).toBe(false);
  });

  test("URL inválida devuelve error sin escritura parcial", async () => {
    const r = await preRellenarActaDesdeUrl("https://ejemplo.com/no-es-partido", mockFetch({}));
    expect(r).toEqual({ error: "URL_INVALIDA" });
  });

  test("partido no-Lagunak devuelve NO_PERTENECE", async () => {
    const r = await descargarActaPorId("99999", mockFetch({}));
    expect(r).toEqual({ error: "NO_PERTENECE" });
  });

  test("J1 sin acta devuelve SIN_ACTA sin guardar parcial", async () => {
    const r = await descargarActaPorId("55483", mockFetch({}));
    expect(r).toEqual({ error: "SIN_ACTA" });
  });

  test("uuid ajeno devuelve NO_PERTENECE", async () => {
    const r = await descargarActaPorUuid("uuid-que-no-existe", mockFetch({}));
    expect(r).toEqual({ error: "NO_PERTENECE" });
  });

  test("FNB caída propaga FNB_HTTP sin escritura parcial", async () => {
    const caida = (async () => ({ ok: false, status: 500, text: async () => "", json: async () => ({}) }) as unknown as Response) as unknown as typeof fetch;
    await expect(descargarActaPorId("55488", caida)).rejects.toThrow(/FNB_HTTP/);
  });

  test("pre-relleno es puro: dos llamadas devuelven lo mismo sin efectos", async () => {
    const f = mockFetch({});
    const a = await preRellenarActaDesdeUrl("https://www.fnbaloncesto.com/pagina-partido/?id=55488", f);
    const b2 = await preRellenarActaDesdeUrl("https://www.fnbaloncesto.com/pagina-partido/?id=55488", f);
    expect(a).toEqual(b2);
  });
});
