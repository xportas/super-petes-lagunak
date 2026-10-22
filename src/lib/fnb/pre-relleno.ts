// Compatibilidad consumida por spec-09; la lógica pura vive en sync-*/parseo-*.
// Prohibido parsear HTML aquí: solo OWC verificado (ver specs/10-scraping-fnb/).
// Cero escritura en BD: solo devuelve datos para pre-relleno revisable.
import type { ActaFilaInput } from "@/src/lib/admin/tipos";
import { normalizarJornada } from "./parseo-calendario";
import { descargarCalendario } from "./sync-calendario";
import { descargarActaPorId, descargarActaPorUuid } from "./sync-resultados";
import type { ActaNormalizada } from "./tipos";

export interface PartidoCalendarioFnb {
  readonly fnbMatchId: string;
  readonly rival: string;
  readonly horaPartido: Date;
  readonly esLocal: boolean;
  readonly numeroFnb: number | null;
}

export interface ActaFnb {
  readonly fnbMatchId: string;
  readonly universallyId: string | null;
  readonly state: string;
  readonly marcadorLocal: number | null;
  readonly marcadorVisitante: number | null;
  readonly filas: readonly ActaFilaInput[];
}

function aActaFnbCompat(
  acta: ActaNormalizada,
  calendario: { readonly state: string; readonly marcadorLocal: number | null; readonly marcadorVisitante: number | null },
): ActaFnb {
  return {
    fnbMatchId: acta.fnbMatchId,
    universallyId: acta.fnbUniversallyId,
    state: calendario.state,
    marcadorLocal: calendario.marcadorLocal,
    marcadorVisitante: calendario.marcadorVisitante,
    filas: acta.porJugador.map(
      (p) =>
        ({
          jugadorId: p.fnbUuid,
          valoracion: p.valoracionTruncada,
          estado: p.estadoPropuesto,
          expulsado: p.expulsado,
        }) as ActaFilaInput,
    ),
  };
}

export async function listarCalendarioFnb(
  fetchFn: typeof fetch = fetch,
): Promise<readonly PartidoCalendarioFnb[]> {
  const crudo = await descargarCalendario(fetchFn);
  const salida: PartidoCalendarioFnb[] = [];
  for (const m of crudo) {
    const j = normalizarJornada(m);
    if ("error" in j) {
      continue;
    }
    salida.push({
      fnbMatchId: j.fnbMatchId,
      rival: j.rival,
      horaPartido: j.horaPartido,
      esLocal: j.esLocal,
      numeroFnb: j.numeroJornadaFnb,
    });
  }
  return salida;
}

export async function descargarActaFnb(
  params: {
    readonly idMatch?: string | undefined;
    readonly uuid?: string | undefined;
  },
  fetchFn: typeof fetch = fetch,
): Promise<ActaFnb> {
  const acta =
    params.idMatch !== undefined && params.idMatch !== ""
      ? await descargarActaPorId(params.idMatch, fetchFn)
      : params.uuid !== undefined && params.uuid !== ""
        ? await descargarActaPorUuid(params.uuid, fetchFn)
        : ({ error: "URL_INVALIDA" } as const);
  if ("error" in acta) {
    if (acta.error === "NO_PERTENECE") {
      throw new Error("no pertenece a lagunak");
    }
    if (acta.error === "SIN_ACTA") {
      throw new Error("FNB sin acta en gracia");
    }
    if (acta.error === "URL_INVALIDA") {
      throw new Error("URL FNB inválida");
    }
    throw new Error(`FNB no responde (${acta.error})`);
  }
  const calendario = await descargarCalendario(fetchFn);
  const partido = calendario.find((c) => c.idMatch === acta.fnbMatchId) ?? null;
  const marcadorLocal =
    partido?.localScore === null || partido?.localScore === undefined || partido === null
      ? null
      : Number.parseInt(partido.localScore, 10);
  const marcadorVisitante =
    partido?.visitorScore === null || partido?.visitorScore === undefined || partido === null
      ? null
      : Number.parseInt(partido.visitorScore, 10);
  return aActaFnbCompat(acta, {
    state: partido?.state ?? "1",
    marcadorLocal: Number.isSafeInteger(marcadorLocal) ? (marcadorLocal as number) : null,
    marcadorVisitante: Number.isSafeInteger(marcadorVisitante) ? (marcadorVisitante as number) : null,
  });
}

export function truncarValoracion(v: number): number {
  return Math.trunc(v);
}
