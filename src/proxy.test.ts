import { describe, expect, test } from "vitest";
import { resolverDestino } from "./lib/auth/guardas";

describe("proxy guarda rol=admin (RF-14 E-13)", () => {
  test("sin sesión /admin redirige a login", () => {
    expect(
      resolverDestino({
        tieneSesion: false,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/admin",
      }),
    ).toEqual({ a: "/login" });
  });

  test("rol=manager nunca sirve /admin", () => {
    const r = resolverDestino({
      tieneSesion: true,
      esTemporal: false,
      rol: "manager",
      onboardingPaso: "completado",
      ruta: "/admin",
    });
    expect(r).not.toEqual({ a: "permitir" });
  });

  test("rol=admin sirve /admin", () => {
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "admin",
        onboardingPaso: "completado",
        ruta: "/admin",
      }),
    ).toEqual({ a: "permitir" });
  });

  test("temporal no sirve /admin aunque sea admin", () => {
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: true,
        rol: "admin",
        onboardingPaso: "completado",
        ruta: "/admin",
      }),
    ).toEqual({ a: "/cambiar-password" });
  });
});
