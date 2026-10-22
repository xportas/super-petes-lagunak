import { esExpulsion } from "../scoring/expulsion";
import { esquemaMsStats } from "./esquemas";
import { ID_TEAM } from "./constantes";
import { truncarValoracion } from "./normalizar";
import type { ActaNormalizada } from "./tipos";

export function normalizarActa(
  raw: unknown,
  teamId: string = ID_TEAM,
  ids: { readonly fnbMatchId: string; readonly fnbUniversallyId: string },
): ActaNormalizada | { readonly error: string } {
  const r = esquemaMsStats.safeParse(raw);
  if (!r.success) {
    return { error: "ACTA_INVALIDA" };
  }
  const esperado = Number.parseInt(teamId, 10);
  const equipo =
    r.data.teams.find((t) => t.teamIdExtern === (Number.isSafeInteger(esperado) ? esperado : 11659)) ?? null;
  if (equipo === null) {
    return { error: "SIN_EQUIPO" };
  }
  const porJugador = equipo.players.map((p) => {
    const conteos = {
      descalificacion: p.data.disqualification,
      pelea: p.data.scuffle,
      antideportivas: p.data.unsportsmanslike,
      tecnicas: p.data.technique + (p.data.benchTechnical ?? 0),
      tecnicaEntrenador: p.data.coachTechnical,
      personales: p.data.personal,
    };
    return {
      fnbUuid: p.uuid,
      nombreActa: p.name,
      dorsal: p.dorsal,
      minutos: p.timePlayed,
      valoracionTruncada: truncarValoracion(p.data.valoration),
      estadoPropuesto: (p.timePlayed > 0 ? "jugo" : "dnp") as "jugo" | "dnp",
      expulsado: esExpulsion(conteos),
    } as const;
  });
  return {
    fnbMatchId: ids.fnbMatchId,
    fnbUniversallyId: ids.fnbUniversallyId,
    porJugador,
  };
}
