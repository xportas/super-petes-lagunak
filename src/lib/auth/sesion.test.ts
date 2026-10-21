import { describe, expect, test } from "vitest";
import type { Sesion } from "./tipos";
import {
  debeRenovar,
  generarTokenSesion,
  hashearTokenSesion,
  nuevaExpiracion,
  revocarTodasMenos,
  revocarUna,
} from "./sesion";

function sesionBase(sobra: Partial<Sesion> = {}): Sesion {
  return {
    id: "s-1",
    usuarioId: "u-1",
    tokenHash: "h",
    creadaAt: new Date("2026-10-11T10:00:00+02:00"),
    expiraAt: new Date("2026-11-10T10:00:00+02:00"),
    ultimaRenovacionAt: new Date("2026-10-11T10:00:00+02:00"),
    revocadaAt: null,
    creadaDesdeTemporal: false,
    ...sobra,
  };
}

describe("sesion sliding 30d/1h (RF-06)", () => {
  test("nuevaExpiracion = +30d exactos", () => {
    const ahora = new Date("2026-10-11T10:00:00+02:00");
    expect(nuevaExpiracion(ahora).getTime()).toBe(
      ahora.getTime() + 30 * 24 * 3600 * 1000,
    );
  });

  test("debeRenovar falso en <=1h y verdadero en >1h", () => {
    const base = new Date("2026-10-11T10:00:00+02:00");
    expect(debeRenovar(base, new Date(base.getTime() + 3600 * 1000))).toBe(
      false,
    );
    expect(debeRenovar(base, new Date(base.getTime() + 30 * 60 * 1000))).toBe(
      false,
    );
    expect(
      debeRenovar(base, new Date(base.getTime() + 3600 * 1000 + 1)),
    ).toBe(true);
    expect(debeRenovar(base, new Date(base.getTime() + 2 * 3600 * 1000))).toBe(
      true,
    );
  });

  test("revocar una deja las demas intactas", () => {
    const ahora = new Date("2026-10-11T12:00:00+02:00");
    const lista = [sesionBase({ id: "a" }), sesionBase({ id: "b" })];
    const r = revocarUna(lista, "a", ahora);
    expect(r.find((s) => s.id === "a")?.revocadaAt?.getTime()).toBe(
      ahora.getTime(),
    );
    expect(r.find((s) => s.id === "b")?.revocadaAt).toBe(null);
  });

  test("revocar una ya revocada no cambia fecha", () => {
    const ahora = new Date("2026-10-11T12:00:00+02:00");
    const antes = new Date("2026-10-11T11:00:00+02:00");
    const lista = [sesionBase({ id: "a", revocadaAt: antes })];
    const r = revocarUna(lista, "a", ahora);
    expect(r[0]?.revocadaAt?.getTime()).toBe(antes.getTime());
  });

  test("revocar todas menos actual", () => {
    const ahora = new Date("2026-10-11T12:00:00+02:00");
    const lista = [
      sesionBase({ id: "a", usuarioId: "u-1" }),
      sesionBase({ id: "b", usuarioId: "u-1" }),
      sesionBase({ id: "c", usuarioId: "u-2" }),
    ];
    const r = revocarTodasMenos(lista, "u-1", "a", ahora);
    expect(r.find((s) => s.id === "a")?.revocadaAt).toBe(null);
    expect(r.find((s) => s.id === "b")?.revocadaAt?.getTime()).toBe(
      ahora.getTime(),
    );
    expect(r.find((s) => s.id === "c")?.revocadaAt).toBe(null);
  });

  test("revocar todas respeta ya revocadas y otros usuarios", () => {
    const ahora = new Date("2026-10-11T12:00:00+02:00");
    const antes = new Date("2026-10-11T11:00:00+02:00");
    const lista = [
      sesionBase({ id: "b", usuarioId: "u-1", revocadaAt: antes }),
    ];
    const r = revocarTodasMenos(lista, "u-1", "a", ahora);
    expect(r[0]?.revocadaAt?.getTime()).toBe(antes.getTime());
  });

  test("token opaco 32B y hash sha256", () => {
    const t = generarTokenSesion();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(hashearTokenSesion("abc")).toHaveLength(64);
    expect(hashearTokenSesion("abc")).not.toBe("abc");
  });
});
