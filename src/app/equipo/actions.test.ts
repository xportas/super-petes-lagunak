import { beforeEach, describe, expect, test, vi } from "vitest";

const estado = vi.hoisted(() => ({
  horaPartido: "2026-07-11T18:00:00+02:00",
  upsertLlamadas: 0,
  rol: "manager" as "manager" | "admin",
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => ({ value: "sesion-id.token-abc" }),
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/src/lib/supabase/auth", () => ({
  parsearCookieSesion: vi.fn(() => ({ id: "sesion-id", token: "token-abc" })),
  buscarSesionPorId: vi.fn(async () => ({
    id: "sesion-id",
    tokenHash: "hash-token-abc",
    expiraAt: new Date("2027-01-01T00:00:00Z"),
    ultimaRenovacionAt: new Date("2026-01-01T00:00:00Z"),
    revocadaAt: null,
  })),
  buscarUsuarioPorId: vi.fn(async () => ({
    id: "manager-1",
    rol: estado.rol,
    esTemporal: false,
    onboardingCompletadoAt: new Date("2026-01-02T00:00:00Z"),
    onboardingPaso: 2,
  })),
  obtenerClienteService: vi.fn(() => ({})),
}));

vi.mock("@/src/lib/auth/sesion", () => ({
  hashearTokenSesion: vi.fn(() => "hash-token-abc"),
}));

vi.mock("@/src/lib/supabase/queries/alineaciones", () => ({
  getJornadaPorId: vi.fn(async (jornadaId: string) => ({
    jornadaId,
    numeroJornada: 5,
    horaPartido: new Date(estado.horaPartido),
    estado: "pendiente" as const,
    rival: "RIVAL",
  })),
  getPlantillaPorIds: vi.fn(async (ids: readonly string[]) => {
    const mapa = new Map();
    for (const id of ids) {
      mapa.set(id, {
        activo: true,
        posicionesValidas: ["B", "E"] as const,
      });
    }
    return mapa;
  }),
  upsertAlineacion: vi.fn(async () => {
    estado.upsertLlamadas += 1;
  }),
}));

import { revalidatePath } from "next/cache";
import {
  getJornadaPorId,
  upsertAlineacion,
} from "@/src/lib/supabase/queries/alineaciones";
import { guardarAlineacion } from "./actions";

const JORNADA_ID = "11111111-1111-4111-8111-111111111111";
const B = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const E = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const AP = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const P = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

function payloadOk() {
  return {
    jornadaId: JORNADA_ID,
    slots: { B, E, A, AP, P },
    entrenadorId: "maider" as const,
    capitanId: B,
  };
}

function cierreDe(horaIso: string): Date {
  return new Date(new Date(horaIso).getTime() - 3 * 3600 * 1000);
}

describe("actions guardarAlineacion cierre -3h Europe/Madrid (RF-10)", () => {
  beforeEach(() => {
    vi.useRealTimers();
    estado.upsertLlamadas = 0;
    estado.rol = "manager";
    estado.horaPartido = "2026-07-11T18:00:00+02:00";
    vi.clearAllMocks();
  });

  test("verano: ahora < cierre acepta y escribe", async () => {
    vi.useFakeTimers();
    const cierre = cierreDe("2026-07-11T18:00:00+02:00");
    vi.setSystemTime(new Date(cierre.getTime() - 1));
    const r = await guardarAlineacion(payloadOk());
    expect(r.ok).toBe(true);
    expect(upsertAlineacion).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/equipo");
    vi.useRealTimers();
  });

  test("verano: ahora == cierre rechaza sin escribir", async () => {
    vi.useFakeTimers();
    const cierre = cierreDe("2026-07-11T18:00:00+02:00");
    vi.setSystemTime(cierre);
    const r = await guardarAlineacion(payloadOk());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("errors.close.passed");
    }
    expect(upsertAlineacion).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  test("invierno CET: ahora > cierre rechaza sin escribir", async () => {
    estado.horaPartido = "2026-12-13T18:00:00+01:00";
    vi.useFakeTimers();
    const cierre = cierreDe("2026-12-13T18:00:00+01:00");
    vi.setSystemTime(new Date(cierre.getTime() + 1000));
    const r = await guardarAlineacion(payloadOk());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("errors.close.passed");
    }
    expect(upsertAlineacion).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  test("cambio de hora_partido recalcula y conserva guardados", async () => {
    vi.useFakeTimers();
    estado.horaPartido = "2026-07-11T18:00:00+02:00";
    const cierreViejo = cierreDe(estado.horaPartido);
    vi.setSystemTime(new Date(cierreViejo.getTime() - 1000));
    const r1 = await guardarAlineacion(payloadOk());
    expect(r1.ok).toBe(true);
    expect(estado.upsertLlamadas).toBe(1);
    estado.horaPartido = "2026-07-11T20:00:00+02:00";
    const r2 = await guardarAlineacion(payloadOk());
    expect(r2.ok).toBe(true);
    expect(estado.upsertLlamadas).toBe(2);
    expect(getJornadaPorId).toHaveBeenCalled();
    vi.useRealTimers();
  });

  test("payload duplicado rechaza sin escribir", async () => {
    vi.useFakeTimers();
    const cierre = cierreDe("2026-07-11T18:00:00+02:00");
    vi.setSystemTime(new Date(cierre.getTime() - 1000));
    const r = await guardarAlineacion({
      ...payloadOk(),
      slots: { B, E: B, A, AP, P },
    });
    expect(r.ok).toBe(false);
    expect(upsertAlineacion).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  test("admin no juega", async () => {
    estado.rol = "admin";
    vi.useFakeTimers();
    const cierre = cierreDe("2026-07-11T18:00:00+02:00");
    vi.setSystemTime(new Date(cierre.getTime() - 1000));
    const r = await guardarAlineacion(payloadOk());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("errors.admin.no_juega");
    }
    expect(upsertAlineacion).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
