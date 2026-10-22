import { describe, expect, test, vi } from "vitest";
import { fetchEsb } from "./cliente-esb";
import { fetchMsStats } from "./cliente-msstats";

function respuestaOk(texto: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => texto,
    json: async () => JSON.parse(texto) as unknown,
  } as unknown as Response;
}

describe("fnb clientes (T-04, RF-01/E-13)", () => {
  test("fetchEsb decodifica Base64 a messageData y exige header federation fnb", async () => {
    const payload = { result: "OK", errorCode: 0, message: "", messageData: { hola: 1 } };
    const b64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
    const fetchFn = vi.fn(async () => respuestaOk(b64));
    const out = await fetchEsb<{ hola: number }>("/x", fetchFn as unknown as typeof fetch);
    expect(out).toEqual({ hola: 1 });
    expect(fetchFn).toHaveBeenCalledOnce();
    const llamadas = fetchFn.mock.calls as unknown as unknown[][];
    const llamada = llamadas[0] as unknown[] | undefined;
    const init = ((llamada?.[1] as { headers?: Record<string, string> } | undefined) ?? {}) as { headers?: Record<string, string> };
    expect(init.headers?.["federation"]).toBe("fnb");
  });

  test("fetchEsb con result=ERROR lanza", async () => {
    const payload = { result: "ERROR", errorCode: 7, message: "clave rotada", messageData: null };
    const b64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
    const fetchFn = vi.fn(async () => respuestaOk(b64));
    await expect(fetchEsb("/x", fetchFn as unknown as typeof fetch)).rejects.toThrow();
  });

  test("fetchEsb con HTTP 500 lanza FNB_HTTP", async () => {
    const fetchFn = vi.fn(async () => respuestaOk("x", 500));
    await expect(fetchEsb("/x", fetchFn as unknown as typeof fetch)).rejects.toThrow(/FNB_HTTP/);
  });

  test("fetchMsStats devuelve JSON directo y exige header", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ teams: [] }),
    }) as unknown as Response);
    const out = await fetchMsStats<{ teams: unknown[] }>("/y", fetchFn as unknown as typeof fetch);
    expect(out).toEqual({ teams: [] });
    const llamadasMs = fetchFn.mock.calls as unknown as unknown[][];
    const llamadaMs = llamadasMs[0] as unknown[] | undefined;
    const init = ((llamadaMs?.[1] as { headers?: Record<string, string> } | undefined) ?? {}) as { headers?: Record<string, string> };
    expect(init.headers?.["federation"]).toBe("fnb");
  });

  test("fetchMsStats con HTTP 500 lanza FNB_HTTP", async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response);
    await expect(fetchMsStats("/y", fetchFn as unknown as typeof fetch)).rejects.toThrow(/FNB_HTTP/);
  });
});
