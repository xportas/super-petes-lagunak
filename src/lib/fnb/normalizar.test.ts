import { describe, expect, test } from "vitest";
import { normalizarNombreFNB, parsearHoraMadrid, resolverVinculo, truncarValoracion } from "./normalizar";

describe("fnb normalizar (T-02, RF-03/RF-05/RF-06)", () => {
  test("normalizarNombreFNB sin tildes, lower y colapsa espacios", () => {
    expect(normalizarNombreFNB("IÑIGO  ORTEGA")).toBe("inigo ortega");
    expect(normalizarNombreFNB("  Asier   VALENCIA  arbizu ")).toBe("asier valencia arbizu");
    expect(normalizarNombreFNB("PÁTER")).toBe("pater");
  });

  test("parsearHoraMadrid válida Europe/Madrid (CEST +02 en octubre pre-cambio)", () => {
    const d = parsearHoraMadrid("2026-10-11 18:00:00");
    expect(d).not.toBeNull();
    // 18:00 CEST = 16:00Z
    expect(d?.toISOString()).toBe("2026-10-11T16:00:00.000Z");
  });

  test("parsearHoraMadrid invierno CET +01", () => {
    const d = parsearHoraMadrid("2026-01-15 18:00:00");
    expect(d?.toISOString()).toBe("2026-01-15T17:00:00.000Z");
  });

  test("parsearHoraMadrid ininterpretable devuelve null", () => {
    expect(parsearHoraMadrid("")).toBeNull();
    expect(parsearHoraMadrid("no-fecha")).toBeNull();
    expect(parsearHoraMadrid("2026-13-99 99:99:99")).toBeNull();
    expect(parsearHoraMadrid("2026-10-11T18:00:00")).toBeNull();
  });

  test("truncarValoracion hacia cero en ingesta", () => {
    expect(truncarValoracion(12.9)).toBe(12);
    expect(truncarValoracion(-1.5)).toBe(-1);
    expect(truncarValoracion(0)).toBe(0);
    expect(truncarValoracion(13)).toBe(13);
  });

  test("resolverVinculo por uuid primero", () => {
    const plantilla = [
      { id: "a", nombreFnb: "IKER BALDA AFONSO", fnbUuid: "uuid-iker" },
      { id: "b", nombreFnb: "OTRO JUGADOR", fnbUuid: "uuid-otro" },
    ] as const;
    expect(resolverVinculo("Cualquiera", plantilla, "uuid-iker")).toEqual({ tipo: "uuid", id: "a" });
  });

  test("resolverVinculo fallback por nombre normalizado con 1 coincidencia", () => {
    const plantilla = [
      { id: "a", nombreFnb: "IÑIGO ORTEGA CARCAMO", fnbUuid: null },
      { id: "b", nombreFnb: "OTRO JUGADOR", fnbUuid: null },
    ] as const;
    expect(resolverVinculo("inigo ortega carcamo", plantilla, null)).toEqual({
      tipo: "nombre-unico",
      id: "a",
    });
  });

  test("resolverVinculo 0 coincidencias queda pendiente", () => {
    const plantilla = [{ id: "a", nombreFnb: "IKER BALDA", fnbUuid: null }] as const;
    expect(resolverVinculo("DESCONOCIDO TOTAL", plantilla, null)).toEqual({ tipo: "pendiente" });
  });

  test("resolverVinculo 2+ coincidencias queda pendiente sin auto-vincular", () => {
    const plantilla = [
      { id: "a", nombreFnb: "JUGADOR COMUN", fnbUuid: null },
      { id: "b", nombreFnb: "jugador  comun", fnbUuid: null },
    ] as const;
    expect(resolverVinculo("JUGADOR COMUN", plantilla, null)).toEqual({ tipo: "pendiente" });
  });

  test("dorsal nunca mapea: mismo nombre duplicado sigue pendiente aunque el dorsal coincida", () => {
    const plantilla = [
      { id: "a", nombreFnb: "MARCOS GOMEZ ARNEDO", fnbUuid: null },
      { id: "b", nombreFnb: "marcos gomez arnedo", fnbUuid: null },
    ] as const;
    // No existe parámetro dorsal: la firma no lo acepta y el resultado no depende de él.
    expect(resolverVinculo("MARCOS GOMEZ ARNEDO", plantilla, "uuid-nuevo")).toEqual({
      tipo: "pendiente",
    });
  });
});
