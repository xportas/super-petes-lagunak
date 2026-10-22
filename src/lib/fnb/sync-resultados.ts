import type { EstadoJornada } from "../scoring/tipos";
import { GRACIA_PAPEL_HORAS, ID_TEAM, VENTANA_CIERRE_RESULTADOS_MS, VENTANA_RESULTADOS_MS } from "./constantes";
import { fetchEsb } from "./cliente-esb";
import { fetchMsStats } from "./cliente-msstats";
import { esquemaFitxaPartit, parsearUrlFnb } from "./esquemas";
import { normalizarActa } from "./parseo-acta";
import { descargarCalendario } from "./sync-calendario";
import type {
  ActaNormalizada,
  EntradaPapel,
  EntradaSyncResultado,
  EstadoPropuesto,
  EstadoResuelto,
  OrigenResultadoFnb,
  ResultadoVinculo,
} from "./tipos";

export function decidirSyncResultado(o: EntradaSyncResultado): boolean {
  if (o.horaPartido.getTime() + VENTANA_CIERRE_RESULTADOS_MS > o.ahora.getTime()) {
    return false;
  }
  if (o.estado === "papel") {
    return false;
  }
  if (o.origen === "manual") {
    return false;
  }
  if (o.estado !== "pendiente" && o.origen !== "fnb") {
    return false;
  }
  if (o.lastResultSync !== null && o.ahora.getTime() - o.lastResultSync.getTime() < VENTANA_RESULTADOS_MS) {
    return false;
  }
  return true;
}

export function decidirPapel(o: EntradaPapel): "pendiente" | "papel" {
  if (o.state !== "1") {
    return "pendiente";
  }
  if (o.universallyid !== null) {
    return "pendiente";
  }
  const limite = o.horaPartido.getTime() + GRACIA_PAPEL_HORAS * 3600 * 1000;
  return o.ahora.getTime() >= limite ? "papel" : "pendiente";
}

export function debeSaltarManual(origen: OrigenResultadoFnb, esReimporte: boolean): boolean {
  if (origen !== "manual") {
    return false;
  }
  return !esReimporte;
}

export function resolverEstadoConLesionado(o: {
  readonly estadoPropuesto: EstadoPropuesto;
  readonly lesionadoPrevio: boolean;
  readonly minutos: number;
}): EstadoResuelto {
  if (o.lesionadoPrevio && o.minutos > 0) {
    return "jugo";
  }
  if (o.lesionadoPrevio && o.minutos <= 0) {
    return "lesionado";
  }
  return o.estadoPropuesto;
}

export function debeAutoCrearPendiente(vinculo: ResultadoVinculo): boolean {
  return vinculo.tipo === "pendiente";
}

export function hayPendienteSinPosiciones(
  plantilla: readonly { readonly posicionesValidas: readonly [string, string] | null | undefined }[],
): boolean {
  return plantilla.some((p) => p.posicionesValidas === null || p.posicionesValidas === undefined);
}

export function resolverEstadoJornadaTrasActa(o: {
  readonly estadoPrevio: EstadoJornada;
  readonly hayPendiente: boolean;
  readonly actaCompleta: boolean;
}): EstadoJornada {
  if (!o.actaCompleta || o.hayPendiente) {
    return o.estadoPrevio === "calculada" ? "invalidada" : "pendiente";
  }
  return "calculada";
}

export type ErrorDescarga =
  | { readonly error: "URL_INVALIDA" }
  | { readonly error: "NO_PERTENECE" }
  | { readonly error: "SIN_ACTA" }
  | { readonly error: "ID_DUPLICADO" }
  | { readonly error: "ACTA_INVALIDA" }
  | { readonly error: "SIN_EQUIPO" };

function perteneceALagunak(idLocal: string, idVisitante: string): boolean {
  return idLocal === ID_TEAM || idVisitante === ID_TEAM;
}

export async function descargarActaPorId(
  idMatch: string,
  fetchFn: typeof fetch = fetch,
): Promise<ActaNormalizada | ErrorDescarga> {
  const crudo = await fetchEsb<unknown>(`/FCBQWeb/fitxaPartit/${idMatch}`, fetchFn);
  const parsed = esquemaFitxaPartit.safeParse(crudo);
  if (!parsed.success) {
    return { error: "ACTA_INVALIDA" };
  }
  const m = parsed.data.match;
  if (!perteneceALagunak(m.idLocalTeam, m.idVisitorTeam)) {
    return { error: "NO_PERTENECE" };
  }
  if (m.universallyid === null) {
    return { error: "SIN_ACTA" };
  }
  const stats = await fetchMsStats<unknown>(`/getJsonWithMatchStats/${m.universallyid}?currentSeason=true`, fetchFn);
  const acta = normalizarActa(stats, ID_TEAM, { fnbMatchId: m.idMatch, fnbUniversallyId: m.universallyid });
  if ("error" in acta) {
    return { error: "ACTA_INVALIDA" };
  }
  return acta;
}

export async function descargarActaPorUuid(
  uuid: string,
  fetchFn: typeof fetch = fetch,
): Promise<ActaNormalizada | ErrorDescarga> {
  const calendario = await descargarCalendario(fetchFn);
  const partido = calendario.find((c) => c.universallyid === uuid) ?? null;
  if (partido === null) {
    return { error: "NO_PERTENECE" };
  }
  return descargarActaPorId(partido.idMatch, fetchFn);
}

export async function preRellenarActaDesdeUrl(
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<ActaNormalizada | ErrorDescarga> {
  const parsed = parsearUrlFnb(url);
  if (parsed === null) {
    return { error: "URL_INVALIDA" };
  }
  if ("idMatch" in parsed) {
    return descargarActaPorId(parsed.idMatch, fetchFn);
  }
  return descargarActaPorUuid(parsed.uuid, fetchFn);
}
