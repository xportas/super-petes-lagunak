import type { BloqueNormas } from "./tipos";

export const ORDEN_BLOQUES: readonly BloqueNormas[] = [
  "cierre",
  "base",
  "entrenadores",
  "posicion",
  "racha",
  "mvp",
  "expulsion",
  "orden",
] as const;

export function anclaDe(bloque: BloqueNormas): `#${BloqueNormas}` {
  return `#${bloque}`;
}
