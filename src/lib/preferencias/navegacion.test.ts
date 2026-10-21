import { describe, expect, test } from "vitest";
import { debeMostrarNav, itemsNavPara } from "./navegacion";

describe("itemsNavPara", () => {
  test("manager tiene sus cinco destinos", () => {
    const rutas = itemsNavPara("manager").map((i) => i.ruta);
    expect(rutas).toEqual([
      "/",
      "/equipo",
      "/mi-resultado",
      "/clasificacion",
      "/ajustes",
    ]);
  });
  test("admin tiene sus cinco destinos", () => {
    const rutas = itemsNavPara("admin").map((i) => i.ruta);
    expect(rutas).toEqual([
      "/admin",
      "/clasificacion",
      "/jugadores",
      "/normas",
      "/ajustes",
    ]);
  });
});

describe("debeMostrarNav", () => {
  test("oculta en rutas de auth y bloqueo", () => {
    const ctx = {
      tieneSesion: true,
      esTemporal: false,
      onboardingCompleto: true,
    };
    expect(debeMostrarNav("/login", ctx)).toBe(false);
    expect(debeMostrarNav("/registro", ctx)).toBe(false);
    expect(debeMostrarNav("/cambiar-password", ctx)).toBe(false);
    expect(debeMostrarNav("/onboarding", ctx)).toBe(false);
  });
  test("/normas sin sesion no muestra nav", () => {
    expect(
      debeMostrarNav("/normas", {
        tieneSesion: false,
        esTemporal: false,
        onboardingCompleto: false,
      }),
    ).toBe(false);
  });
  test("/normas con temporal no muestra nav", () => {
    expect(
      debeMostrarNav("/normas", {
        tieneSesion: true,
        esTemporal: true,
        onboardingCompleto: true,
      }),
    ).toBe(false);
  });
  test("/normas con sesion completa si muestra nav", () => {
    expect(
      debeMostrarNav("/normas", {
        tieneSesion: true,
        esTemporal: false,
        onboardingCompleto: true,
      }),
    ).toBe(true);
  });
  test("/normas con onboarding incompleto no muestra nav", () => {
    expect(
      debeMostrarNav("/normas", {
        tieneSesion: true,
        esTemporal: false,
        onboardingCompleto: false,
      }),
    ).toBe(false);
    expect(
      debeMostrarNav("/normas/extra", {
        tieneSesion: true,
        esTemporal: false,
        onboardingCompleto: true,
      }),
    ).toBe(true);
  });
  test("ruta privada con temporal no muestra nav", () => {
    expect(
      debeMostrarNav("/equipo", {
        tieneSesion: true,
        esTemporal: true,
        onboardingCompleto: true,
      }),
    ).toBe(false);
  });
  test("ruta privada con onboarding incompleto no muestra nav", () => {
    expect(
      debeMostrarNav("/equipo", {
        tieneSesion: true,
        esTemporal: false,
        onboardingCompleto: false,
      }),
    ).toBe(false);
  });
  test("/ajustes con sesion completa si muestra nav", () => {
    expect(
      debeMostrarNav("/ajustes", {
        tieneSesion: true,
        esTemporal: false,
        onboardingCompleto: true,
      }),
    ).toBe(true);
  });
  test("sin sesion no muestra nav en privada", () => {
    expect(
      debeMostrarNav("/equipo", {
        tieneSesion: false,
        esTemporal: false,
        onboardingCompleto: false,
      }),
    ).toBe(false);
  });
});
