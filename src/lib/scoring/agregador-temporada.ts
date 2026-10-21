import { redondearHalfUp } from "./redondeo";
import type {
  EstadoJugadorActa,
  EstadoJornada,
  ManagerId,
} from "./tipos";
import type { JornadaOrdenable } from "../dominio/tipos";

export interface ResultadoManagerJornada {
  readonly jornadaId: string;
  readonly managerId: ManagerId;
  readonly total: number;
}

export interface RendimientoJugadorJornada {
  readonly jornadaId: string;
  readonly jugadorId: string;
  readonly base: number;
  readonly estado: EstadoJugadorActa;
}

export interface TopManager {
  readonly managerId: string;
  readonly total: number;
}

export interface TopJugador {
  readonly jugadorId: string;
  readonly base: number;
}

export interface AgregadoTemporada {
  readonly puntosPorManager: Readonly<Record<string, number>>;
  readonly puestos: Readonly<Record<string, number>>;
  readonly top3ManagersUltimaCalculada: readonly TopManager[];
  readonly top3JugadoresUltimaCalculada: readonly TopJugador[];
  readonly mediaPorJugador: Readonly<Record<string, number | null>>;
  readonly ultimaCalculadaId: string | null;
}

function esCalculada(estado: EstadoJornada): boolean {
  return estado === "calculada";
}

export function agregarTemporada(
  jornadas: readonly JornadaOrdenable[],
  resultados: readonly ResultadoManagerJornada[],
  rendimientos: readonly RendimientoJugadorJornada[],
): AgregadoTemporada {
  const ordenadas = [...jornadas].sort((a, b) => {
    const porHora = a.horaPartido.getTime() - b.horaPartido.getTime();
    if (porHora !== 0) {
      return porHora;
    }
    return a.numeroJornada - b.numeroJornada;
  });
  const calculadas = ordenadas.filter((j) => esCalculada(j.estado));
  const idsCalculadas = new Set(calculadas.map((j) => j.jornadaId));
  let ultimaCalculadaId: string | null = null;
  for (const jornada of calculadas) {
    ultimaCalculadaId = jornada.jornadaId;
  }

  const puntosPorManager: Record<string, number> = {};
  for (const r of resultados) {
    if (!idsCalculadas.has(r.jornadaId)) {
      continue;
    }
    puntosPorManager[r.managerId] =
      (puntosPorManager[r.managerId] ?? 0) + r.total;
  }

  // Estable: los empates conservan el orden de entrada (determinista).
  const managersOrdenados = Object.entries(puntosPorManager).sort(
    ([, totalA], [, totalB]) => totalB - totalA,
  );
  const puestos: Record<string, number> = {};
  let managersConMasPuntos = 0;
  let puntosAnteriores: number | null = null;
  let puestoActual = 0;
  for (const [managerId, total] of managersOrdenados) {
    if (puntosAnteriores === null || total !== puntosAnteriores) {
      puestoActual = managersConMasPuntos + 1;
      puntosAnteriores = total;
    }
    puestos[managerId] = puestoActual;
    managersConMasPuntos += 1;
  }

  const resultadosUltima = resultados
    .filter((r) => r.jornadaId === ultimaCalculadaId)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((r) => ({ managerId: r.managerId, total: r.total }));

  const rendimientosUltima = rendimientos
    .filter(
      (r) => r.jornadaId === ultimaCalculadaId && r.estado === "jugo",
    )
    .sort((a, b) => b.base - a.base)
    .slice(0, 3)
    .map((r) => ({ jugadorId: r.jugadorId, base: r.base }));

  const stats = new Map<string, { suma: number; cuenta: number }>();
  for (const r of rendimientos) {
    if (!idsCalculadas.has(r.jornadaId)) {
      continue;
    }
    if (r.estado !== "jugo") {
      continue;
    }
    const actual = stats.get(r.jugadorId);
    if (actual === undefined) {
      stats.set(r.jugadorId, { suma: r.base, cuenta: 1 });
    } else {
      stats.set(r.jugadorId, {
        suma: actual.suma + r.base,
        cuenta: actual.cuenta + 1,
      });
    }
  }
  const jugadoresVistos = new Set<string>();
  for (const r of rendimientos) {
    jugadoresVistos.add(r.jugadorId);
  }
  const mediaPorJugador: Record<string, number | null> = {};
  for (const jugadorId of jugadoresVistos) {
    const stat = stats.get(jugadorId);
    if (stat === undefined) {
      mediaPorJugador[jugadorId] = null;
    } else {
      mediaPorJugador[jugadorId] =
        redondearHalfUp((stat.suma / stat.cuenta) * 10) / 10;
    }
  }

  return {
    puntosPorManager,
    puestos,
    top3ManagersUltimaCalculada: resultadosUltima,
    top3JugadoresUltimaCalculada: rendimientosUltima,
    mediaPorJugador,
    ultimaCalculadaId,
  };
}
