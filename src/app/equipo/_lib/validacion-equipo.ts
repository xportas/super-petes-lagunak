import { z } from "zod";
import type { Posicion } from "@/src/lib/scoring/tipos";

export const SlotPosSchema = z.enum(["B", "E", "A", "AP", "P"]);
export type SlotPos = z.infer<typeof SlotPosSchema>;

export const SLOTS_FIJOS: readonly SlotPos[] = ["B", "E", "A", "AP", "P"];

const uuidSchema = z.string().uuid();

export const GuardarAlineacionSchema = z
  .object({
    jornadaId: uuidSchema,
    slots: z.object({
      B: uuidSchema,
      E: uuidSchema,
      A: uuidSchema,
      AP: uuidSchema,
      P: uuidSchema,
    }),
    entrenadorId: z.enum(["maider", "pater"]),
    capitanId: uuidSchema,
  })
  .superRefine((valor, ctx) => {
    const ids = [
      valor.slots.B,
      valor.slots.E,
      valor.slots.A,
      valor.slots.AP,
      valor.slots.P,
    ];
    if (new Set(ids).size !== 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "duplicado",
        path: ["slots"],
      });
    }
    if (!ids.includes(valor.capitanId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "capitan_fuera",
        path: ["capitanId"],
      });
    }
  });

export type GuardarAlineacionInput = z.infer<typeof GuardarAlineacionSchema>;

export interface DraftEquipo {
  readonly slots: Readonly<Record<SlotPos, string | null>>;
  readonly entrenador: "maider" | "pater" | null;
  readonly capitan: string | null;
}

export interface EntradaPlantilla {
  readonly activo: boolean;
  readonly nombre?: string;
}

export interface ResultadoDraftLocal {
  readonly puedeGuardar: boolean;
  readonly motivoKey?: string;
  readonly motivoVars?: Readonly<Record<string, string>>;
}

function esVacio(valor: string | null | undefined): boolean {
  return typeof valor !== "string" || valor.length === 0;
}

export function validarDraftLocal(
  draft: DraftEquipo,
  plantilla?: ReadonlyMap<string, EntradaPlantilla>,
): ResultadoDraftLocal {
  for (const slot of SLOTS_FIJOS) {
    const id = draft.slots[slot];
    if (esVacio(id)) {
      return {
        puedeGuardar: false,
        motivoKey: "ui.equipo.motivo.falta_slot",
        motivoVars: { slot },
      };
    }
  }
  const ids = SLOTS_FIJOS.map((slot) => draft.slots[slot] as string);
  if (new Set(ids).size !== 5) {
    return { puedeGuardar: false, motivoKey: "errors.equipo.duplicado" };
  }
  if (plantilla !== undefined) {
    for (const id of ids) {
      const ficha = plantilla.get(id);
      if (ficha !== undefined && !ficha.activo) {
        const nombre = ficha.nombre ?? id.slice(0, 8);
        return {
          puedeGuardar: false,
          motivoKey: "ui.equipo.motivo.hay_inactivo",
          motivoVars: { nombre },
        };
      }
    }
  }
  if (draft.entrenador !== "maider" && draft.entrenador !== "pater") {
    return {
      puedeGuardar: false,
      motivoKey: "ui.equipo.motivo.falta_entrenador",
    };
  }
  if (esVacio(draft.capitan)) {
    return {
      puedeGuardar: false,
      motivoKey: "ui.equipo.motivo.falta_capitan",
    };
  }
  if (!ids.includes(draft.capitan as string)) {
    return { puedeGuardar: false, motivoKey: "errors.equipo.capitan_fuera" };
  }
  return { puedeGuardar: true };
}

export function draftDesdeSlots(
  slots: Readonly<Record<SlotPos, string | null>>,
  entrenador: "maider" | "pater" | null,
  capitan: string | null,
): DraftEquipo {
  return { slots, entrenador, capitan };
}

export type { Posicion };
