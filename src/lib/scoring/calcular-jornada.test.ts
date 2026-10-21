import { describe, expect, test } from "vitest";
import { calcularJornada } from "./calcular-jornada";
import type { EntradaJornada, EntradaJugador, Posicion } from "./tipos";

function jugador(
  id: string,
  base: number | null,
  over: Partial<EntradaJugador> = {},
): EntradaJugador {
  return {
    jugadorId: id,
    valoracionFNB: base,
    estado: "jugo",
    expulsado: false,
    posicionesValidas: ["B", "E"] as readonly [Posicion, Posicion],
    posicionAlineada: "B",
    esCapitan: false,
    ...over,
  };
}

function jornadaBase(over: Partial<EntradaJornada> = {}): EntradaJornada {
  const quinteto: EntradaJugador[] = [
    jugador("j1", 10, { esCapitan: true }),
    jugador("j2", 8),
    jugador("j3", 6),
    jugador("j4", 4),
    jugador("j5", 2),
  ];
  return {
    entrenador: "maider",
    quinteto,
    penalizacionRachaPorJugador: {},
    plantillaBaseMax: {
      maxBase: 10,
      capitanEsMaximo: true,
      jugoAlguno: true,
    },
    ...over,
  };
}

describe("calcularJornada (RF-12, RF-13, RF-17, RF-19, RF-21, E-09, E-14, E-16, E-20, E-24)", () => {
  test("suma 5 subtotales +3 con Maider y capitán máximo", () => {
    const r = calcularJornada(jornadaBase());
    expect(r).toMatchObject({ esMvp: true, bonusMvp: 3, expulsiones: 0 });
    if ("error" in r) {
      throw new Error("no debería dar error");
    }
    const suma = r.porJugador.reduce((a, d) => a + d.subtotal, 0);
    expect(r.total).toBe(suma + 3);
  });

  test("orden con Páter: suelo+1 a los 5", () => {
    const e = jornadaBase({ entrenador: "pater" });
    const r = calcularJornada(e);
    if ("error" in r) {
      throw new Error("no debería dar error");
    }
    for (const d of r.porJugador) {
      expect(d.trasEntrenador).toBeGreaterThanOrEqual(2);
    }
  });

  test("total negativo se preserva (E-20)", () => {
    const quinteto = [
      jugador("j1", -8, { esCapitan: true, posicionAlineada: "P" }),
      jugador("j2", -6, { posicionAlineada: "P" }),
      jugador("j3", -4, { posicionAlineada: "P" }),
      jugador("j4", -2, { posicionAlineada: "P" }),
      jugador("j5", -1, { posicionAlineada: "P" }),
    ];
    const r = calcularJornada(
      jornadaBase({
        quinteto,
        plantillaBaseMax: {
          maxBase: -1,
          capitanEsMaximo: false,
          jugoAlguno: true,
        },
      }),
    );
    if ("error" in r) {
      throw new Error("no debería dar error");
    }
    expect(r.total).toBeLessThan(0);
  });

  test("2 expulsados → -10 con BASE intacta (E-14)", () => {
    const quinteto = [
      jugador("j1", 10, { esCapitan: true, expulsado: true }),
      jugador("j2", 8, { expulsado: true }),
      jugador("j3", 6),
      jugador("j4", 4),
      jugador("j5", 2),
    ];
    const r = calcularJornada(jornadaBase({ quinteto }));
    if ("error" in r) {
      throw new Error("no debería dar error");
    }
    expect(r.expulsiones).toBe(2);
    expect(r.penalizacionExpulsion).toBe(-10);
    const bases = r.porJugador.map((d) => d.base);
    expect(bases).toContain(10);
    expect(bases).toContain(8);
  });

  test("expulsado MVP acumula +3 y -5 (E-15)", () => {
    const quinteto = [
      jugador("j1", 20, { esCapitan: true, expulsado: true }),
      jugador("j2", 8),
      jugador("j3", 6),
      jugador("j4", 4),
      jugador("j5", 2),
    ];
    const r = calcularJornada(
      jornadaBase({
        quinteto,
        plantillaBaseMax: {
          maxBase: 20,
          capitanEsMaximo: true,
          jugoAlguno: true,
        },
      }),
    );
    if ("error" in r) {
      throw new Error("no debería dar error");
    }
    expect(r.esMvp).toBe(true);
    expect(r.bonusMvp).toBe(3);
    expect(r.penalizacionExpulsion).toBe(-5);
  });

  test("dato ausente → error sin parcial (E-16)", () => {
    const quinteto = [
      jugador("j1", null, { esCapitan: true }),
      jugador("j2", 8),
      jugador("j3", 6),
      jugador("j4", 4),
      jugador("j5", 2),
    ];
    const r = calcularJornada(jornadaBase({ quinteto }));
    expect(r).toEqual({
      error: { codigo: "DATO_AUSENTE", jugadorId: "j1" },
    });
  });

  test("quinteto con longitud != 5 → DATO_AUSENTE", () => {
    const r = calcularJornada(
      jornadaBase({ quinteto: [jugador("j1", 10)] }),
    );
    expect(r).toEqual({ error: { codigo: "DATO_AUSENTE" } });
  });

  test("sin quinteto → -10 y rompe rachas (E-09, RF-19)", () => {
    const r = calcularJornada({ sinQuinteto: true });
    expect(r).toEqual({
      porJugador: [],
      esMvp: false,
      bonusMvp: 0,
      expulsiones: 0,
      penalizacionExpulsion: 0,
      total: -10,
    });
  });

  test("papel → 0 excluido (E-24, RF-21)", () => {
    const r = calcularJornada({ papel: true });
    expect(r).toEqual({
      porJugador: [],
      esMvp: false,
      bonusMvp: 0,
      expulsiones: 0,
      penalizacionExpulsion: 0,
      total: 0,
    });
  });

  test("recálculo con misma entrada da mismo total (RF-20)", () => {
    const e = jornadaBase();
    const a = calcularJornada(e);
    const b = calcularJornada(e);
    expect(a).toEqual(b);
  });

  test("aplica la penalización de racha guardada por jugador", () => {
    const r = calcularJornada(
      jornadaBase({ penalizacionRachaPorJugador: { j1: -2 } }),
    );
    if ("error" in r) {
      throw new Error("no debería dar error");
    }
    const desglose = r.porJugador.find((d) => d.jugadorId === "j1");
    expect(desglose).toMatchObject({ penalizacionRacha: -2 });
  });

  test("sin MVP cuando el capitán no es máximo", () => {
    const r = calcularJornada(
      jornadaBase({
        plantillaBaseMax: {
          maxBase: 30,
          capitanEsMaximo: false,
          jugoAlguno: true,
        },
      }),
    );
    expect(r).toMatchObject({ esMvp: false, bonusMvp: 0 });
  });

  test("sin MVP cuando nadie jugó", () => {
    const quinteto = [
      jugador("j1", 10, {
        esCapitan: true,
        estado: "lesionado",
        valoracionFNB: 10,
      }),
      jugador("j2", 8, { estado: "dnp", valoracionFNB: 8 }),
      jugador("j3", 6, { estado: "dnp", valoracionFNB: 6 }),
      jugador("j4", 4, { estado: "dnp", valoracionFNB: 4 }),
      jugador("j5", 2, { estado: "dnp", valoracionFNB: 2 }),
    ];
    const r = calcularJornada(
      jornadaBase({
        quinteto,
        plantillaBaseMax: {
          maxBase: null,
          capitanEsMaximo: false,
          jugoAlguno: false,
        },
      }),
    );
    expect(r).toMatchObject({ esMvp: false, bonusMvp: 0 });
  });

  test("sin MVP si el capitán no alcanza la máxima aunque el acta lo marque", () => {
    const r = calcularJornada(
      jornadaBase({
        plantillaBaseMax: {
          maxBase: 30,
          capitanEsMaximo: true,
          jugoAlguno: true,
        },
      }),
    );
    expect(r).toMatchObject({ esMvp: false, bonusMvp: 0 });
  });

  test("quinteto sin capitán nunca da MVP", () => {
    const quinteto = [
      jugador("j1", 10),
      jugador("j2", 8),
      jugador("j3", 6),
      jugador("j4", 4),
      jugador("j5", 2),
    ];
    const r = calcularJornada(
      jornadaBase({
        quinteto,
        plantillaBaseMax: {
          maxBase: 10,
          capitanEsMaximo: false,
          jugoAlguno: true,
        },
      }),
    );
    expect(r).toMatchObject({ esMvp: false, bonusMvp: 0 });
  });
});
