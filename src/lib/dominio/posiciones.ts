import type { Posicion } from "../scoring/tipos";

function esPosicion(valor: unknown): valor is Posicion {
  return (
    valor === "B" ||
    valor === "E" ||
    valor === "A" ||
    valor === "AP" ||
    valor === "P"
  );
}

export function sonMismaCasilla(a: Posicion, b: Posicion): boolean {
  if (a === b) {
    return true;
  }
  const aEsExterior = a === "E" || a === "A";
  const bEsExterior = b === "E" || b === "A";
  return aEsExterior && bEsExterior;
}

export function validarPosicionesValidas(
  valor: unknown,
): valor is readonly [Posicion, Posicion] {
  if (!Array.isArray(valor)) {
    return false;
  }
  if (valor.length !== 2) {
    return false;
  }
  const primero: unknown = valor[0];
  const segundo: unknown = valor[1];
  return esPosicion(primero) && esPosicion(segundo);
}

export function tieneBonusPosicion(
  alineada: Posicion,
  validas: readonly [Posicion, Posicion],
  base: number,
): boolean {
  if (base === 0) {
    return false;
  }
  const [primera, segunda] = validas;
  return (
    sonMismaCasilla(alineada, primera) ||
    sonMismaCasilla(alineada, segunda)
  );
}
