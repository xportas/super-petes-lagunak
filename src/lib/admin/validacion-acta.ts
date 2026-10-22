import type { ActaFilaInput } from "./tipos";
import type { ClaveI18n } from "@/src/lib/i18n";

export type ResultadoActa =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: ClaveI18n };

function esEntero(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor);
}

// Valida acta completa sin parcial ni borrador (RF-08/RF-11).
// Exige una fila por cada vigente; sin campo MVP.
export function validarActaCompleta(
  filas: readonly ActaFilaInput[],
  vigentesIds: readonly string[],
): ResultadoActa {
  const vigentes = new Set(vigentesIds);
  const porId = new Map<string, ActaFilaInput>();
  for (const fila of filas) {
    if (typeof fila.jugadorId !== "string") {
      return { ok: false, error: "errors.admin.incompleta_bloquea" };
    }
    if ("mvp" in (fila as unknown as Record<string, unknown>)) {
      return { ok: false, error: "errors.admin.incompleta_bloquea" };
    }
    if (!esEntero(fila.valoracion)) {
      return { ok: false, error: "errors.admin.cero_forzado" };
    }
    const noJugo =
      fila.estado === "lesionado" ||
      fila.estado === "no_convocado" ||
      fila.estado === "dnp";
    if (
      fila.estado !== "jugo" &&
      fila.estado !== "lesionado" &&
      fila.estado !== "no_convocado" &&
      fila.estado !== "dnp"
    ) {
      return { ok: false, error: "errors.admin.incompleta_bloquea" };
    }
    if (fila.estado !== "jugo" && fila.expulsado) {
      return {
        ok: false,
        error: "errors.admin.excluyente_lesion_expulsion",
      };
    }
    if (noJugo && fila.valoracion !== 0) {
      return { ok: false, error: "errors.admin.cero_forzado" };
    }
    porId.set(fila.jugadorId, fila);
  }
  for (const id of vigentes) {
    if (!porId.has(id)) {
      return { ok: false, error: "errors.admin.incompleta_bloquea" };
    }
  }
  return { ok: true };
}
