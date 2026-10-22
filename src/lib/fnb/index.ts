export { GRACIA_PAPEL_HORAS, HORAS_CIERRE, ID_TEAM, ESB_BASE, MSSTATS_BASE, VENTANA_CALENDARIO_MS, VENTANA_CIERRE_RESULTADOS_MS, VENTANA_RESULTADOS_MS } from "./constantes";
export type {
  ActaJugadorFnbCrudo,
  ActaJugadorNormalizada,
  ActaNormalizada,
  EntradaPapel,
  EntradaSyncResultado,
  EstadoPropuesto,
  EstadoResuelto,
  JornadaNormalizada,
  MatchFnbCrudo,
  OrigenResultadoFnb,
  PlantillaVinculo,
  ResultadoVinculo,
  VeredictoSync,
} from "./tipos";
export { normalizarNombreFNB, parsearHoraMadrid, resolverVinculo, truncarValoracion } from "./normalizar";
export { esquemaFitxaPartit, esquemaMatchFnb, esquemaMsStats, esquemaMsStatsPlayer, esquemaUrlFnb, parsearUrlFnb } from "./esquemas";
export { fetchEsb } from "./cliente-esb";
export { fetchMsStats } from "./cliente-msstats";
export { detectarSegundaFase, fusionarCalendario, normalizarJornada } from "./parseo-calendario";
export { normalizarActa } from "./parseo-acta";
export { decidirSyncCalendario, descargarCalendario } from "./sync-calendario";
export {
  debeAutoCrearPendiente,
  debeSaltarManual,
  decidirPapel,
  decidirSyncResultado,
  descargarActaPorId,
  descargarActaPorUuid,
  hayPendienteSinPosiciones,
  preRellenarActaDesdeUrl,
  resolverEstadoConLesionado,
  resolverEstadoJornadaTrasActa,
} from "./sync-resultados";
export { sincronizarCalendarioFNB, sincronizarResultadosFNB } from "./contratos";
export type { ActaFnb, PartidoCalendarioFnb } from "./pre-relleno";
export { descargarActaFnb, listarCalendarioFnb } from "./pre-relleno";
export { truncarValoracion as truncarValoracionPreRelleno } from "./pre-relleno";
