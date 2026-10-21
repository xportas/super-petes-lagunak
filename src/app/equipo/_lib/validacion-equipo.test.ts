import { describe, expect, test } from "vitest";
import {
  GuardarAlineacionSchema,
  validarDraftLocal,
  type DraftEquipo,
} from "./validacion-equipo";

const JORNADA = "11111111-1111-4111-8111-111111111111";
const IDS = {
  B: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  E: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  A: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  AP: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  P: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
} as const;

function draftOk(over: Partial<DraftEquipo> = {}): DraftEquipo {
  return {
    slots: { ...IDS },
    entrenador: "maider",
    capitan: IDS.B,
    ...over,
  };
}

describe("validacion-equipo (RF-09, RF-07, RF-08)", () => {
  test("draft completo y válido puede guardar", () => {
    expect(validarDraftLocal(draftOk()).puedeGuardar).toBe(true);
  });

  test("slot vacío bloquea con falta_slot", () => {
    const r = validarDraftLocal(
      draftOk({ slots: { ...IDS, E: null } }),
    );
    expect(r.puedeGuardar).toBe(false);
    expect(r.motivoKey).toBe("ui.equipo.motivo.falta_slot");
    expect(r.motivoVars).toEqual({ slot: "E" });
  });

  test("duplicado bloquea con errors.equipo.duplicado", () => {
    const r = validarDraftLocal(
      draftOk({ slots: { ...IDS, E: IDS.B } }),
    );
    expect(r.puedeGuardar).toBe(false);
    expect(r.motivoKey).toBe("errors.equipo.duplicado");
  });

  test("sin entrenador bloquea", () => {
    const r = validarDraftLocal(draftOk({ entrenador: null }));
    expect(r.puedeGuardar).toBe(false);
    expect(r.motivoKey).toBe("ui.equipo.motivo.falta_entrenador");
  });

  test("sin capitán bloquea", () => {
    const r = validarDraftLocal(draftOk({ capitan: null }));
    expect(r.puedeGuardar).toBe(false);
    expect(r.motivoKey).toBe("ui.equipo.motivo.falta_capitan");
  });

  test("capitán fuera del quinteto bloquea", () => {
    const r = validarDraftLocal(
      draftOk({ capitan: "ffffffff-ffff-4fff-8fff-ffffffffffff" }),
    );
    expect(r.puedeGuardar).toBe(false);
    expect(r.motivoKey).toBe("errors.equipo.capitan_fuera");
  });

  test("inactivo en draft bloquea con hay_inactivo", () => {
    const plantilla = new Map([
      [IDS.B, { activo: true, nombre: "Uno" }],
      [IDS.E, { activo: false, nombre: "Baja" }],
      [IDS.A, { activo: true }],
      [IDS.AP, { activo: true }],
      [IDS.P, { activo: true }],
    ]);
    const r = validarDraftLocal(draftOk(), plantilla);
    expect(r.puedeGuardar).toBe(false);
    expect(r.motivoKey).toBe("ui.equipo.motivo.hay_inactivo");
    expect(r.motivoVars).toEqual({ nombre: "Baja" });
  });

  test("GuardarAlineacionSchema acepta quinteto válido", () => {
    const r = GuardarAlineacionSchema.safeParse({
      jornadaId: JORNADA,
      slots: { ...IDS },
      entrenadorId: "pater",
      capitanId: IDS.A,
    });
    expect(r.success).toBe(true);
  });

  test("GuardarAlineacionSchema rechaza duplicado", () => {
    const r = GuardarAlineacionSchema.safeParse({
      jornadaId: JORNADA,
      slots: { ...IDS, E: IDS.B },
      entrenadorId: "maider",
      capitanId: IDS.B,
    });
    expect(r.success).toBe(false);
  });

  test("GuardarAlineacionSchema rechaza capitán fuera", () => {
    const r = GuardarAlineacionSchema.safeParse({
      jornadaId: JORNADA,
      slots: { ...IDS },
      entrenadorId: "maider",
      capitanId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    });
    expect(r.success).toBe(false);
  });

  test("GuardarAlineacionSchema rechaza entrenador inválido e incompleto", () => {
    const r1 = GuardarAlineacionSchema.safeParse({
      jornadaId: JORNADA,
      slots: { ...IDS },
      entrenadorId: "tercero",
      capitanId: IDS.B,
    });
    expect(r1.success).toBe(false);
    const r2 = GuardarAlineacionSchema.safeParse({
      jornadaId: "no-uuid",
      slots: { ...IDS },
      entrenadorId: "maider",
      capitanId: IDS.B,
    });
    expect(r2.success).toBe(false);
  });
});
