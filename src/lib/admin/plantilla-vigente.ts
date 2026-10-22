import type { CandidatoVigencia } from "./tipos";

// Plantilla vigente en el cierre (RF-08):
// fecha_alta <= cierre AND (fecha_baja IS NULL OR > cierre)
// UNION bajas con acta/alineación en esa jornada.
// Altas posteriores al cierre quedan excluidas siempre.
export function plantillaVigente<T extends CandidatoVigencia>(
  candidatos: readonly T[],
  cierre: Date,
  idsConAlineacionOActa: readonly string[],
): T[] {
  const incluidos = new Set(idsConAlineacionOActa);
  const cierreMs = cierre.getTime();
  const salida: T[] = [];
  for (const c of candidatos) {
    if (c.fechaAlta.getTime() > cierreMs) {
      continue;
    }
    const baja = c.fechaBaja;
    const vigentePorFechas = baja === null || baja.getTime() > cierreMs;
    if (vigentePorFechas) {
      salida.push(c);
      continue;
    }
    if (incluidos.has(c.id)) {
      salida.push(c);
    }
  }
  return salida;
}
