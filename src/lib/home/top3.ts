import type { JornadaOrdenable } from "@/src/lib/dominio/tipos";
import { resolverUltimaCalculada as resolverUltimaCalculadaBase } from "./resolver-jornada";
import type { TopJugadorRow, TopManagerRow } from "./tipos";

export function resolverUltimaCalculada<T extends JornadaOrdenable>(
  jornadas: readonly T[],
): T | null {
  return resolverUltimaCalculadaBase(jornadas);
}

type ValorFila = { readonly puntos?: number; readonly base?: number; readonly total?: number };

function extraerValor(fila: ValorFila): number | null {
  if (typeof fila.puntos === "number") {
    return fila.puntos;
  }
  if (typeof fila.base === "number") {
    return fila.base;
  }
  if (typeof fila.total === "number") {
    return fila.total;
  }
  return null;
}

export function puestosOlimpicos<T>(
  filasOrdenadas: readonly T[],
  extraer?: (fila: T) => number,
): readonly (T & { readonly puesto: number })[] {
  const resolver = (fila: T, indice: number): number => {
    if (extraer !== undefined) {
      return extraer(fila);
    }
    const comoValor = fila as unknown as ValorFila;
    const v = extraerValor(comoValor);
    if (v !== null) {
      return v;
    }
    return Number.NEGATIVE_INFINITY - indice;
  };
  const salida: Array<T & { readonly puesto: number }> = [];
  let valorPrevio: number | null = null;
  let puestoActual = 0;
  for (let i = 0; i < filasOrdenadas.length; i += 1) {
    const fila = filasOrdenadas[i] as T;
    const valor = resolver(fila, i);
    if (valorPrevio === null || valor !== valorPrevio) {
      puestoActual = i + 1;
      valorPrevio = valor;
    }
    salida.push({ ...(fila as object), puesto: puestoActual } as T & {
      readonly puesto: number;
    });
  }
  return salida;
}

export interface EntradaManagerTop {
  readonly username: string;
  readonly puntos: number;
  readonly esAdmin?: boolean;
  readonly envioValido?: boolean;
}

export function top3Managers(
  puntosPorManager: ReadonlyMap<string, EntradaManagerTop>,
  jornadaEtiqueta: string,
): readonly TopManagerRow[] {
  const candidatas: Array<{ managerId: string; username: string; puntos: number }> = [];
  for (const [managerId, entrada] of puntosPorManager) {
    if (entrada.esAdmin === true) {
      continue;
    }
    if (entrada.envioValido === false) {
      continue;
    }
    if (entrada.envioValido !== true && entrada.puntos === -10) {
      continue;
    }
    candidatas.push({ managerId, username: entrada.username, puntos: entrada.puntos });
  }
  candidatas.sort((a, b) => {
    if (b.puntos !== a.puntos) {
      return b.puntos - a.puntos;
    }
    const na = a.username.toLowerCase();
    const nb = b.username.toLowerCase();
    if (na < nb) {
      return -1;
    }
    if (na > nb) {
      return 1;
    }
    if (a.username < b.username) {
      return -1;
    }
    if (a.username > b.username) {
      return 1;
    }
    return 0;
  });
  const conPuesto = puestosOlimpicos(candidatas, (f) => f.puntos);
  return conPuesto.slice(0, 3).map((f) => ({
    managerId: f.managerId,
    username: f.username,
    puntos: f.puntos,
    jornadaEtiqueta,
    puesto: f.puesto,
  }));
}

export interface EntradaJugadorTop {
  readonly jugadorId: string;
  readonly nombre: string;
  readonly nombrePete?: string | null;
  readonly base: number;
  readonly esEntrenador?: boolean;
}

export function top3Jugadores(
  bases: readonly EntradaJugadorTop[],
  jornadaEtiqueta: string,
): readonly TopJugadorRow[] {
  const candidatas = bases.filter((b) => b.esEntrenador !== true);
  const ordenadas = [...candidatas].sort((a, b) => {
    if (b.base !== a.base) {
      return b.base - a.base;
    }
    const na = a.nombre.toLowerCase();
    const nb = b.nombre.toLowerCase();
    if (na < nb) {
      return -1;
    }
    if (na > nb) {
      return 1;
    }
    if (a.nombre < b.nombre) {
      return -1;
    }
    if (a.nombre > b.nombre) {
      return 1;
    }
    return 0;
  });
  const conPuesto = puestosOlimpicos(ordenadas, (f) => f.base);
  return conPuesto.slice(0, 3).map((f) => ({
    jugadorId: f.jugadorId,
    base: f.base,
    jornadaEtiqueta,
    puesto: f.puesto,
  }));
}
