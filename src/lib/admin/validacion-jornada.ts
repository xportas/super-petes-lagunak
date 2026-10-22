import { jornadaSchema } from "./esquemas";
import type { JornadaInput } from "./tipos";
import type { ClaveI18n } from "@/src/lib/i18n";

export type ResultadoValidacionJornada =
  | { readonly ok: true; readonly valor: JornadaInput }
  | { readonly ok: false; readonly error: ClaveI18n };

export function validarJornadaMinima(
  entrada: unknown,
): ResultadoValidacionJornada {
  const r = jornadaSchema.safeParse(entrada);
  if (!r.success) {
    return { ok: false, error: "errors.admin.sin_rival_hora" };
  }
  return { ok: true, valor: r.data };
}

export function siguienteNumeroLiga(
  numerosExistentes: readonly number[],
): number {
  if (numerosExistentes.length === 0) {
    return 1;
  }
  let max = numerosExistentes[0] as number;
  for (const n of numerosExistentes) {
    if (n > max) {
      max = n;
    }
  }
  return max + 1;
}

export interface EnvioPrevio {
  readonly instanteInicio: Date;
  readonly validoAntes: boolean;
}

// Regla E-02: la validez de envíos ya guardados queda congelada al cambiar
// la hora. El nuevo cierre solo rige para envíos futuros: no resucita
// tardías ni anula válidas.
export function conservarValidezTrasCambioHora(
  envios: readonly EnvioPrevio[],
): readonly boolean[] {
  return envios.map((e) => e.validoAntes);
}
