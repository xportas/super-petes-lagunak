import type { Medalla } from "./tipos";

export function medallaPorPuesto(puesto: number): Medalla {
  if (puesto === 1) {
    return "oro";
  }
  if (puesto === 2) {
    return "plata";
  }
  if (puesto === 3) {
    return "bronce";
  }
  return null;
}

export function debeColorear(o: {
  readonly hayCalculada: boolean;
  readonly todosCero: boolean;
}): boolean {
  return o.hayCalculada && !o.todosCero;
}

export function esZonaRoja(o: {
  readonly acumulado: number;
  readonly umbralRojo: number;
  readonly totalN: number;
}): boolean {
  if (o.totalN <= 6) {
    return false;
  }
  return o.acumulado <= o.umbralRojo;
}
