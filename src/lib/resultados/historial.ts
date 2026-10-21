import {
  calcularCierre,
  ordenarJornadasCanonico,
} from "../dominio/cierre";
import type {
  Entrenador,
  Posicion,
  ResultadoJornada,
} from "../scoring/tipos";
import type {
  AvisoJornadaExcluida,
  DesgloseJornadaVista,
  FilaHistorial,
  HistorialVista,
  IconoEstado,
  JornadaHistorial,
  ManagerPuesto,
} from "./tipos";

export type { JornadaHistorial };

export function esElegible(
  onboardingCompletadoAt: Date | null,
  cierre: Date,
): boolean {
  if (onboardingCompletadoAt === null) {
    return false;
  }
  return onboardingCompletadoAt.getTime() < cierre.getTime();
}

function sumaHasta(
  porJornada: ReadonlyMap<string, number> | undefined,
  calculadas: readonly { readonly jornadaId: string }[],
): number {
  let suma = 0;
  for (const j of calculadas) {
    suma += porJornada?.get(j.jornadaId) ?? 0;
  }
  return suma;
}

export function puestoAcumuladoTras(args: {
  readonly managerId: string;
  readonly hastaJornadaId: string;
  readonly jornadasAsc: readonly JornadaHistorial[];
  readonly totalesPorManager: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly managers: readonly ManagerPuesto[];
}): number {
  const ordenadas = ordenarJornadasCanonico(args.jornadasAsc);
  const indice = ordenadas.findIndex((j) => j.jornadaId === args.hastaJornadaId);
  const corte = indice < 0 ? [] : ordenadas.slice(0, indice + 1);
  const calculadas = corte.filter((j) => j.estado === "calculada");
  const propia = sumaHasta(
    args.totalesPorManager.get(args.managerId),
    calculadas,
  );
  let mejores = 0;
  for (const m of args.managers) {
    if (m.id === args.managerId) {
      continue;
    }
    const suma = sumaHasta(args.totalesPorManager.get(m.id), calculadas);
    if (suma > propia) {
      mejores += 1;
    }
  }
  return mejores + 1;
}

export interface MetaLineaVista {
  readonly jugadorId: string;
  readonly posicionAlineada: Posicion;
  readonly esCapitan: boolean;
  readonly icono: IconoEstado;
  readonly expulsado: boolean;
}

export function aDesgloseVista(args: {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly horaPartido: Date;
  readonly entrenador: Entrenador;
  readonly resultado: ResultadoJornada;
  readonly metas: readonly MetaLineaVista[];
}): DesgloseJornadaVista {
  const porMeta = new Map(args.metas.map((m) => [m.jugadorId, m] as const));
  const lineas = args.resultado.porJugador.map((d) => {
    const meta = porMeta.get(d.jugadorId);
    if (meta === undefined) {
      throw new Error(
        `[resultados] falta meta de ${d.jugadorId}: sin inventar cifras`,
      );
    }
    return {
      jugadorId: d.jugadorId,
      posicionAlineada: meta.posicionAlineada,
      esCapitan: meta.esCapitan,
      icono: meta.icono,
      expulsado: meta.expulsado,
      base: d.base,
      trasEntrenador: d.trasEntrenador,
      bonusPosicion: d.bonusPosicion,
      penalizacionRacha: d.penalizacionRacha,
      subtotal: d.subtotal,
    } as const;
  });
  const ordenadas = [...lineas].sort((a, b) =>
    a.jugadorId.localeCompare(b.jugadorId),
  );
  return {
    jornadaId: args.jornadaId,
    numeroJornada: args.numeroJornada,
    horaPartido: args.horaPartido,
    entrenador: args.entrenador,
    lineas: ordenadas,
    esMvp: args.resultado.esMvp,
    bonusMvp: args.resultado.bonusMvp,
    expulsiones: args.resultado.expulsiones,
    penalizacionExpulsion: args.resultado.penalizacionExpulsion,
    total: args.resultado.total,
  };
}

export function construirHistorial(args: {
  readonly managerId: string;
  readonly onboardingCompletadoAt: Date | null;
  readonly jornadas: readonly JornadaHistorial[];
  readonly desgloses: ReadonlyMap<string, DesgloseJornadaVista>;
  readonly totalesPorManager: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly managers: readonly ManagerPuesto[];
}): HistorialVista {
  const ordenadas = ordenarJornadasCanonico(args.jornadas);
  const filasAsc: FilaHistorial[] = [];
  const avisos: AvisoJornadaExcluida[] = [];
  let destacada: DesgloseJornadaVista | null = null;
  for (const o of ordenadas) {
    if (o.estado === "papel" || o.estado === "pendiente") {
      continue;
    }
    if (o.estado === "invalidada") {
      avisos.push({
        jornadaId: o.jornadaId,
        numeroJornada: o.numeroJornada,
        motivo: "invalidada",
      });
      continue;
    }
    const cierre = calcularCierre(o.horaPartido);
    if (!esElegible(args.onboardingCompletadoAt, cierre)) {
      continue;
    }
    const puesto = puestoAcumuladoTras({
      managerId: args.managerId,
      hastaJornadaId: o.jornadaId,
      jornadasAsc: args.jornadas,
      totalesPorManager: args.totalesPorManager,
      managers: args.managers,
    });
    const desglose = args.desgloses.get(o.jornadaId);
    if (desglose === undefined) {
      filasAsc.push({
        kind: "sin_envio",
        jornadaId: o.jornadaId,
        numeroJornada: o.numeroJornada,
        horaPartido: o.horaPartido,
        total: -10,
        puestoAcumulado: puesto,
      });
      continue;
    }
    filasAsc.push({
      kind: "calculada",
      desglose,
      puestoAcumulado: puesto,
    });
    destacada = desglose;
  }
  const filasDesc = [...filasAsc].reverse();
  return { destacada, filas: filasDesc, avisos };
}
