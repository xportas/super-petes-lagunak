import { describe, expect, test, vi } from "vitest";
import { decidirSyncCalendario, descargarCalendario } from "./sync-calendario";

describe("fnb sync-calendario (T-06/T-07, RF-02/RF-04)", () => {
  test("throttle 24h: sin sync previo sí toca", () => {
    expect(
      decidirSyncCalendario({ lastCalendarSync: null, ahora: new Date("2026-10-16T10:00:00Z") }),
    ).toBe(true);
  });

  test("throttle 24h: reciente no toca", () => {
    expect(
      decidirSyncCalendario({
        lastCalendarSync: new Date("2026-10-16T09:00:00Z"),
        ahora: new Date("2026-10-16T10:00:00Z"),
      }),
    ).toBe(false);
  });

  test("throttle 24h: vencido sí toca", () => {
    expect(
      decidirSyncCalendario({
        lastCalendarSync: new Date("2026-10-15T09:59:00Z"),
        ahora: new Date("2026-10-16T10:00:00Z"),
      }),
    ).toBe(true);
  });

  test("descargarCalendario valida array y exige header fnb", async () => {
    const j2 = {
      idMatch: "55488",
      universallyid: "u",
      numMatchDay: "2",
      matchDay: "2026-10-11 18:00:00",
      state: "1",
      idLocalTeam: "11659",
      nameLocalTeam: "LAGUNAK A",
      idVisitorTeam: "11763",
      nameVisitorTeam: "RIVAL",
      nameField: null,
      adressField: null,
      nameTown: null,
      localScore: "67",
      visitorScore: "42",
    };
    const payload = { result: "OK", errorCode: 0, message: "", messageData: [j2] };
    const b64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, text: async () => b64 }) as unknown as Response);
    const out = await descargarCalendario(fetchFn as unknown as typeof fetch);
    expect(out).toHaveLength(1);
    expect(out[0]?.idMatch).toBe("55488");
    const llamadasCal = fetchFn.mock.calls as unknown as unknown[][];
    const llamadaCal = llamadasCal[0] as unknown[] | undefined;
    const init = ((llamadaCal?.[1] as { headers?: Record<string, string> } | undefined) ?? {}) as { headers?: Record<string, string> };
    expect(init.headers?.["federation"]).toBe("fnb");
  });
});
