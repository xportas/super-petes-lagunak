import { calcularCierre, ordenarJornadasCanonico } from "../dominio/cierre";
import { calcularRachas } from "../dominio/rachas";
import type { EventoAparicion } from "../dominio/tipos";
import { calcularJornada } from "../scoring/calcular-jornada";
import { PENALIZACION_SIN_QUINTETO } from "../scoring/constantes";
import type {
  EntradaJornada,
  EntradaJugador,
  Entrenador,
  EstadoJugadorActa,
  Posicion,
} from "../scoring/tipos";
import { aDesgloseVista, esElegible } from "./historial";
import type {
  DesgloseJornadaVista,
  JornadaHistorial,
} from "./tipos";

export interface ManagerTotales {
  readonly id: string;
  readonly username: string;
  readonly onboardingCompletadoAt: Date | null;
}

export interface AlineacionTotales {
  readonly id: string;
  readonly managerId: string;
  readonly jornadaId: string;
  readonly entrenador: Entrenador;
  readonly capitanJugadorId: string;
}

export interface SeleccionTotales {
  readonly alineacionId: string;
  readonly jugadorId: string;
  readonly posicionAlineada: Posicion;
}

export interface ActaJugadorTotales {
  readonly valoracion: number;
  readonly estado: EstadoJugadorActa;
  readonly expulsado: boolean;
}

export interface EntradaTotales {
  readonly jornadas: readonly JornadaHistorial[];
  readonly managers: readonly ManagerTotales[];
  readonly alineaciones: readonly AlineacionTotales[];
  readonly selecciones: readonly SeleccionTotales[];
  readonly actas: ReadonlyMap<
    string,
    ReadonlyMap<string, ActaJugadorTotales>
  >;
  readonly posiciones: ReadonlyMap<
    string,
    { readonly posicionesValidas: readonly [Posicion, Posicion] | null }
  >;
}

export interface SalidaTotales {
  readonly totalesPorManager: ReadonlyMap<
    string,
    ReadonlyMap<string, number>
  >;
  readonly desglosesPorManager: ReadonlyMap<
    string,
    ReadonlyMap<string, DesgloseJornadaVista>
  >;
}

function mapaAlineaciones(
  alineaciones: readonly AlineacionTotales[],
): ReadonlyMap<string, ReadonlyMap<string, AlineacionTotales>> {
  const porManager = new Map<string, Map<string, AlineacionTotales>>();
  for (const a of alineaciones) {
    let porJornada = porManager.get(a.managerId);
    if (porJornada === undefined) {
      porJornada = new Map<string, AlineacionTotales>();
      porManager.set(a.managerId, porJornada);
    }
    porJornada.set(a.jornadaId, a);
  }
  return porManager;
}

function mapaSelecciones(
  selecciones: readonly SeleccionTotales[],
): ReadonlyMap<string, readonly SeleccionTotales[]> {
  const porAlineacion = new Map<string, SeleccionTotales[]>();
  for (const s of selecciones) {
    const lista = porAlineacion.get(s.alineacionId);
    if (lista === undefined) {
      porAlineacion.set(s.alineacionId, [s]);
    } else {
      lista.push(s);
    }
  }
  return porAlineacion;
}

export function construirTotales(entrada: EntradaTotales): SalidaTotales {
  const ordenadas = ordenarJornadasCanonico(entrada.jornadas);
  const porManagerJornada = mapaAlineaciones(entrada.alineaciones);
  const porAlineacion = mapaSelecciones(entrada.selecciones);
  const totalesPorManager = new Map<string, Map<string, number>>();
  const desglosesPorManager = new Map<string, Map<string, DesgloseJornadaVista>>();
  for (const m of entrada.managers) {
    const totales = new Map<string, number>();
    const desgloses = new Map<string, DesgloseJornadaVista>();
    totalesPorManager.set(m.id, totales);
    desglosesPorManager.set(m.id, desgloses);
    const alineadosPorJornada = new Map<string, Set<string>>();
    for (const a of entrada.alineaciones) {
      if (a.managerId !== m.id) {
        continue;
      }
      const sels = porAlineacion.get(a.id) ?? [];
      let conjunto = alineadosPorJornada.get(a.jornadaId);
      if (conjunto === undefined) {
        conjunto = new Set<string>();
        alineadosPorJornada.set(a.jornadaId, conjunto);
      }
      for (const s of sels) {
        conjunto.add(s.jugadorId);
      }
    }
    const jugadoresVistos = new Set<string>();
    for (const conjunto of alineadosPorJornada.values()) {
      for (const id of conjunto) {
        jugadoresVistos.add(id);
      }
    }
    const tieneQuinteto = new Set<string>();
    for (const a of entrada.alineaciones) {
      if (a.managerId === m.id) {
        tieneQuinteto.add(a.jornadaId);
      }
    }
    for (const j of ordenadas) {
      if (j.estado !== "calculada") {
        continue;
      }
      const cierre = calcularCierre(j.horaPartido);
      const elegible = esElegible(m.onboardingCompletadoAt, cierre);
      const aline = porManagerJornada.get(m.id)?.get(j.jornadaId);
      if (aline === undefined) {
        if (elegible) {
          totales.set(j.jornadaId, PENALIZACION_SIN_QUINTETO);
        }
        continue;
      }
      if (!elegible) {
        continue;
      }
      const actaJornada = entrada.actas.get(j.jornadaId);
      if (actaJornada === undefined) {
        continue;
      }
      const eventos: EventoAparicion[] = [];
      for (const anterior of ordenadas) {
        const esAnterior =
          anterior.horaPartido.getTime() < j.horaPartido.getTime() ||
          (anterior.horaPartido.getTime() === j.horaPartido.getTime() &&
            anterior.numeroJornada < j.numeroJornada);
        if (!esAnterior) {
          continue;
        }
        const conjunto = alineadosPorJornada.get(anterior.jornadaId);
        for (const jugadorId of jugadoresVistos) {
          eventos.push({
            jugadorId,
            jornadaId: anterior.jornadaId,
            horaPartido: anterior.horaPartido,
            numeroJornada: anterior.numeroJornada,
            estadoJornada: anterior.estado,
            alineado: conjunto?.has(jugadorId) ?? false,
            quintetoValido: tieneQuinteto.has(anterior.jornadaId),
          });
        }
      }
      const rachas = calcularRachas(eventos);
      const sels = porAlineacion.get(aline.id) ?? [];
      if (sels.length !== 5) {
        continue;
      }
      const quinteto: EntradaJugador[] = [];
      let valida = true;
      let baseCapitan = 0;
      for (const s of sels) {
        const acta = actaJornada.get(s.jugadorId);
        const validas = entrada.posiciones.get(s.jugadorId)?.posicionesValidas ?? null;
        if (acta === undefined || validas === null) {
          valida = false;
          break;
        }
        if (s.jugadorId === aline.capitanJugadorId) {
          baseCapitan = acta.estado === "jugo" ? acta.valoracion : 0;
        }
        quinteto.push({
          jugadorId: s.jugadorId,
          valoracionFNB: acta.valoracion,
          estado: acta.estado,
          expulsado: acta.expulsado,
          posicionesValidas: validas,
          posicionAlineada: s.posicionAlineada,
          esCapitan: s.jugadorId === aline.capitanJugadorId,
        });
      }
      if (!valida) {
        continue;
      }
      const penalizacionRachaPorJugador: Record<string, number> = {};
      for (const q of quinteto) {
        penalizacionRachaPorJugador[q.jugadorId] =
          0 - (rachas.get(q.jugadorId) ?? 0);
      }
      let maxBase: number | null = null;
      let jugoAlguno = false;
      for (const acta of actaJornada.values()) {
        if (acta.estado === "jugo") {
          jugoAlguno = true;
          if (maxBase === null || acta.valoracion > maxBase) {
            maxBase = acta.valoracion;
          }
        }
      }
      const entradaJornada: EntradaJornada = {
        entrenador: aline.entrenador,
        quinteto,
        penalizacionRachaPorJugador,
        plantillaBaseMax: {
          maxBase,
          capitanEsMaximo: maxBase !== null && baseCapitan === maxBase,
          jugoAlguno,
        },
      };
      const calculado = calcularJornada(entradaJornada);
      if ("error" in calculado) {
        continue;
      }
      const metas = quinteto.map((q) => {
        const acta = actaJornada.get(q.jugadorId) as ActaJugadorTotales;
        return {
          jugadorId: q.jugadorId,
          posicionAlineada: q.posicionAlineada,
          esCapitan: q.esCapitan,
          icono:
            acta.estado === "lesionado"
              ? ("lesionado" as const)
              : acta.estado === "no_convocado"
                ? ("no_convocado" as const)
                : acta.estado === "dnp"
                  ? ("dnp" as const)
                  : ("jugo" as const),
          expulsado: acta.expulsado,
        };
      });
      const vista = aDesgloseVista({
        jornadaId: j.jornadaId,
        numeroJornada: j.numeroJornada,
        horaPartido: j.horaPartido,
        entrenador: aline.entrenador,
        resultado: calculado,
        metas,
      });
      desgloses.set(j.jornadaId, vista);
      totales.set(j.jornadaId, calculado.total);
    }
  }
  return { totalesPorManager, desglosesPorManager };
}
