import { describe, expect, test } from "vitest";
import { resolverDestino } from "./guardas";

describe("guardas resolverDestino (RF-06/07/09/11 E-05/14/15)", () => {
  test("sin sesion salvo /login /registro /normas redirige a /login", () => {
    expect(
      resolverDestino({
        tieneSesion: false,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/",
      }),
    ).toEqual({ a: "/login" });
    expect(
      resolverDestino({
        tieneSesion: false,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/equipo",
      }),
    ).toEqual({ a: "/login" });
    expect(
      resolverDestino({
        tieneSesion: false,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/login",
      }),
    ).toEqual({ a: "permitir" });
    expect(
      resolverDestino({
        tieneSesion: false,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/registro",
      }),
    ).toEqual({ a: "permitir" });
    expect(
      resolverDestino({
        tieneSesion: false,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/normas",
      }),
    ).toEqual({ a: "permitir" });
    expect(
      resolverDestino({
        tieneSesion: false,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/normas#cierre",
      }),
    ).toEqual({ a: "permitir" });
  });

  test("temporal confina en /cambiar-password salvo /normas", () => {
    const base = {
      tieneSesion: true,
      esTemporal: true,
      rol: "manager" as const,
      onboardingPaso: 1 as const,
    };
    expect(resolverDestino({ ...base, ruta: "/" })).toEqual({
      a: "/cambiar-password",
    });
    expect(resolverDestino({ ...base, ruta: "/equipo" })).toEqual({
      a: "/cambiar-password",
    });
    expect(resolverDestino({ ...base, ruta: "/admin" })).toEqual({
      a: "/cambiar-password",
    });
    expect(resolverDestino({ ...base, ruta: "/onboarding" })).toEqual({
      a: "/cambiar-password",
    });
    expect(
      resolverDestino({ ...base, ruta: "/cambiar-password" }),
    ).toEqual({ a: "permitir" });
    expect(resolverDestino({ ...base, ruta: "/normas" })).toEqual({
      a: "permitir",
    });
  });

  test("manager incompleto va a /onboarding paso pendiente", () => {
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/",
      }),
    ).toEqual({ a: "/onboarding", paso: 1 });
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 2,
        ruta: "/equipo",
      }),
    ).toEqual({ a: "/onboarding", paso: 2 });
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/onboarding",
      }),
    ).toEqual({ a: "permitir" });
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/normas",
      }),
    ).toEqual({ a: "permitir" });
  });

  test("completado: /login /registro /home van a / o /admin", () => {
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: "completado",
        ruta: "/login",
      }),
    ).toEqual({ a: "/" });
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: "completado",
        ruta: "/home",
      }),
    ).toEqual({ a: "/" });
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "admin",
        onboardingPaso: "completado",
        ruta: "/login",
      }),
    ).toEqual({ a: "/admin" });
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: "completado",
        ruta: "/",
      }),
    ).toEqual({ a: "permitir" });
  });

  test("E-14 temporal precede a onboarding", () => {
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: true,
        rol: "manager",
        onboardingPaso: 1,
        ruta: "/onboarding",
      }),
    ).toEqual({ a: "/cambiar-password" });
  });

  test("/onboarding completado redirige a / o /admin", () => {
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: "completado",
        ruta: "/onboarding",
      }),
    ).toEqual({ a: "/" });
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "admin",
        onboardingPaso: "completado",
        ruta: "/onboarding",
      }),
    ).toEqual({ a: "/admin" });
  });

  test("/admin solo admin", () => {
    expect(
      resolverDestino({
        tieneSesion: true,
        esTemporal: false,
        rol: "manager",
        onboardingPaso: "completado",
        ruta: "/admin",
      }),
    ).toEqual({ a: "/" });
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
});
