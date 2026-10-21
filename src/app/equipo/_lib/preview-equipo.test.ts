import { describe, expect, test } from "vitest";
import { tieneBonusPosicion } from "@/src/lib/dominio/posiciones";
import type { Posicion } from "@/src/lib/scoring/tipos";
import { previewSlot, type JugadorElegibleEquipo } from "./preview-equipo";
import type { SlotPos } from "./validacion-equipo";

const SLOTS: readonly SlotPos[] = ["B", "E", "A", "AP", "P"];
const PARES: ReadonlyArray<readonly [Posicion, Posicion]> = [
  ["B", "E"],
  ["E", "A"],
  ["A", "AP"],
  ["AP", "P"],
  ["B", "P"],
];

function jugadorCon(
  validas: readonly [Posicion, Posicion],
  over: Partial<JugadorElegibleEquipo> = {},
): JugadorElegibleEquipo {
  return {
    id: "jug-1",
    nombre: "Uno",
    nombrePete: null,
    img: "/players/placeholder.webp",
    imgPete: "/players/placeholder-pete.webp",
    posicionesValidas: validas,
    estadoSanitario: "disponible",
    activo: true,
    ...over,
  };
}

function esperadoMas5(slot: SlotPos, validas: readonly [Posicion, Posicion]): boolean {
  return tieneBonusPosicion(slot, validas, 1);
}

describe("preview-equipo matriz slot vs posicionesValidas (RF-01, RF-03)", () => {
  test("matriz 5 slots x 5 pares delega al motor sin duplicar lógica", () => {
    for (const slot of SLOTS) {
      for (const par of PARES) {
        const j = jugadorCon(par);
        const p = previewSlot(slot, j, 0);
        expect(p.muestraMas5).toBe(esperadoMas5(slot, par));
        expect(p.baseCero).toBe("ninguno");
      }
    }
  });

  test("E<->A intercambiables en ambos sentidos", () => {
    const soloE = jugadorCon(["B", "E"]);
    expect(previewSlot("E", soloE, 0).muestraMas5).toBe(true);
    expect(previewSlot("A", soloE, 0).muestraMas5).toBe(true);
    const soloA = jugadorCon(["A", "P"]);
    expect(previewSlot("E", soloA, 0).muestraMas5).toBe(true);
    expect(previewSlot("A", soloA, 0).muestraMas5).toBe(true);
    const be = jugadorCon(["B", "E"]);
    expect(previewSlot("B", be, 0).muestraMas5).toBe(true);
    expect(previewSlot("AP", be, 0).muestraMas5).toBe(false);
  });

  test("['E','A'] siempre +5 en E/A y nunca en B/AP/P", () => {
    const ea = jugadorCon(["E", "A"]);
    expect(previewSlot("E", ea, 0).muestraMas5).toBe(true);
    expect(previewSlot("A", ea, 0).muestraMas5).toBe(true);
    expect(previewSlot("B", ea, 0).muestraMas5).toBe(false);
    expect(previewSlot("AP", ea, 0).muestraMas5).toBe(false);
    expect(previewSlot("P", ea, 0).muestraMas5).toBe(false);
  });
});

describe("preview-equipo racha desde dominio + ocultación BASE 0 (RF-05, RF-06)", () => {
  test("racha previa 0/null → estreno sin penalización", () => {
    const j = jugadorCon(["B", "E"]);
    expect(previewSlot("B", j, 0).penalizacionRacha).toBeNull();
    expect(previewSlot("B", j, null).penalizacionRacha).toBeNull();
  });

  test("racha previa 1/2/3 → −1/−2/−3", () => {
    const j = jugadorCon(["B", "E"]);
    expect(previewSlot("B", j, 1).penalizacionRacha).toBe(-1);
    expect(previewSlot("B", j, 2).penalizacionRacha).toBe(-2);
    expect(previewSlot("B", j, 3).penalizacionRacha).toBe(-3);
  });

  test("lesionado oculta +5/−N, marca BASE 0 y avisa racha futura", () => {
    const j = jugadorCon(["B", "E"], { estadoSanitario: "lesionado" });
    const p = previewSlot("B", j, 2);
    expect(p.muestraMas5).toBe(false);
    expect(p.penalizacionRacha).toBeNull();
    expect(p.baseCero).toBe("lesionado");
    expect(p.avisoRachaFutura).toBe(true);
  });

  test("inactivo oculta +5/−N, marca BASE 0 y avisa racha futura", () => {
    const j = jugadorCon(["B", "E"], { activo: false });
    const p = previewSlot("E", j, 3);
    expect(p.muestraMas5).toBe(false);
    expect(p.penalizacionRacha).toBeNull();
    expect(p.baseCero).toBe("inactivo");
    expect(p.avisoRachaFutura).toBe(true);
  });

  test("slot vacío no muestra nada", () => {
    const p = previewSlot("B", null, 0);
    expect(p.muestraMas5).toBe(false);
    expect(p.penalizacionRacha).toBeNull();
    expect(p.baseCero).toBe("ninguno");
    expect(p.avisoRachaFutura).toBe(false);
  });
});
