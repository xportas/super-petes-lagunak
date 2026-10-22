import { VENTANA_CALENDARIO_MS } from "./constantes";
import { fetchEsb } from "./cliente-esb";
import { esquemaMatchFnb } from "./esquemas";
import type { MatchFnbCrudo } from "./tipos";

export function decidirSyncCalendario(o: {
  readonly lastCalendarSync: Date | null;
  readonly ahora: Date;
}): boolean {
  if (o.lastCalendarSync === null) {
    return true;
  }
  return o.ahora.getTime() - o.lastCalendarSync.getTime() >= VENTANA_CALENDARIO_MS;
}

export async function descargarCalendario(
  fetchFn: typeof fetch = fetch,
): Promise<MatchFnbCrudo[]> {
  const crudo = await fetchEsb<unknown>("/Match/getByTeamAllSeason/11659", fetchFn);
  if (!Array.isArray(crudo)) {
    throw new Error("FNB_ESB_ERROR calendario no es array");
  }
  return crudo.map((item, i) => {
    const r = esquemaMatchFnb.safeParse(item);
    if (!r.success) {
      throw new Error(`FNB_ESB_ERROR calendario[${i}] inválido`);
    }
    return r.data;
  });
}
