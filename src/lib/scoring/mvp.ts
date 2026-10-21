export interface EntradaMvp {
  readonly capitanJugo: boolean;
  readonly baseCapitan: number;
  readonly maxBaseJugo: number | null;
}

export function esMvpCapitan(entrada: EntradaMvp): boolean {
  if (!entrada.capitanJugo) {
    return false;
  }
  if (entrada.maxBaseJugo === null) {
    return false;
  }
  return entrada.baseCapitan === entrada.maxBaseJugo;
}
