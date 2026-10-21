import type { EstadoJornada } from "../scoring/tipos";
import { debeColorear } from "./colores";
import type { ClasificacionVista, EntradaGeneral } from "./tipos";

export interface ManagerGeneral {
  readonly id: string;
  readonly username: string;
  readonly rol: "manager" | "admin";
}

export interface JornadaGeneral {
  readonly jornadaId: string;
  readonly estado: EstadoJornada;
}

interface FilaSinPuesto {
  readonly managerId: string;
  readonly username: string;
  readonly acumulado: number;
}

export function ordenarGeneral(
  filas: readonly FilaSinPuesto[],
): FilaSinPuesto[] {
  return [...filas].sort((a, b) => {
    if (b.acumulado !== a.acumulado) {
      return b.acumulado - a.acumulado;
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
}

export function numeracionOlimpica(
  ordenadas: readonly FilaSinPuesto[],
): EntradaGeneral[] {
  const salida: EntradaGeneral[] = [];
  let valorPrevio: number | null = null;
  let puestoActual = 0;
  for (const [i, fila] of ordenadas.entries()) {
    if (valorPrevio === null || fila.acumulado !== valorPrevio) {
      puestoActual = i + 1;
      valorPrevio = fila.acumulado;
    }
    salida.push({
      managerId: fila.managerId,
      username: fila.username,
      acumulado: fila.acumulado,
      puesto: puestoActual,
    });
  }
  return salida;
}

export function construirGeneral(args: {
  readonly managers: readonly ManagerGeneral[];
  readonly jornadas: readonly JornadaGeneral[];
  readonly totales: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly miManagerId: string;
}): ClasificacionVista {
  const calculadas = args.jornadas.filter((j) => j.estado === "calculada");
  const hayCalculada = calculadas.length > 0;
  const elegibles = args.managers.filter((m) => m.rol !== "admin");
  const sinPuesto: FilaSinPuesto[] = [];
  for (const m of elegibles) {
    let acumulado = 0;
    const porJornada = args.totales.get(m.id);
    for (const j of calculadas) {
      acumulado += porJornada?.get(j.jornadaId) ?? 0;
    }
    sinPuesto.push({ managerId: m.id, username: m.username, acumulado });
  }
  const ordenadas = ordenarGeneral(sinPuesto);
  const filas = numeracionOlimpica(ordenadas);
  const todosCero = filas.length === 0 || filas.every((f) => f.acumulado === 0);
  return {
    filas,
    hayColores: debeColorear({ hayCalculada, todosCero }),
    miManagerId: args.miManagerId,
  };
}
