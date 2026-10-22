import { ID_TEAM } from "./constantes";
import { parsearHoraMadrid } from "./normalizar";
import type { JornadaNormalizada, MatchFnbCrudo } from "./tipos";

function aEnteroONulo(valor: string | null): number | null {
  if (valor === null) {
    return null;
  }
  const t = valor.trim();
  if (t === "") {
    return null;
  }
  const n = Number.parseInt(t, 10);
  return Number.isSafeInteger(n) ? n : null;
}

export function normalizarJornada(
  m: MatchFnbCrudo,
): JornadaNormalizada | { readonly error: "SIN_HORA" } {
  const hora = parsearHoraMadrid(m.matchDay);
  if (hora === null) {
    return { error: "SIN_HORA" };
  }
  const esLocal = m.idLocalTeam === ID_TEAM;
  const rival = esLocal ? m.nameVisitorTeam : m.nameLocalTeam;
  return {
    fnbMatchId: m.idMatch,
    fnbUniversallyId: m.universallyid,
    numeroJornadaFnb: aEnteroONulo(m.numMatchDay),
    horaPartido: hora,
    esLocal,
    rival,
    campo: m.nameField,
    municipio: m.nameTown,
    finalizado: m.state === "1",
    marcadorLocal: aEnteroONulo(m.localScore),
    marcadorVisitante: aEnteroONulo(m.visitorScore),
  };
}

export interface ExistenteLiga {
  readonly fnbMatchId: string;
  readonly numeroJornada: number;
  readonly numeroJornadaFnb: number | null;
}

export function detectarSegundaFase(
  existentes: readonly ExistenteLiga[],
  entrantes: readonly MatchFnbCrudo[],
): boolean {
  const numerosExistentes = new Set(
    existentes.map((e) => e.numeroJornadaFnb).filter((n): n is number => n !== null),
  );
  const vistos = new Set<string>();
  for (const e of entrantes) {
    const clave = `${e.numMatchDay}|${e.idMatch}`;
    if (vistos.has(clave)) {
      continue;
    }
    vistos.add(clave);
    const n = Number.parseInt(e.numMatchDay, 10);
    if (!Number.isSafeInteger(n)) {
      continue;
    }
    const ya = existentes.find((x) => x.fnbMatchId === e.idMatch) ?? null;
    if (ya !== null) {
      continue;
    }
    if (numerosExistentes.has(n)) {
      return true;
    }
  }
  return false;
}

export interface FusionCalendario {
  readonly nuevas: readonly (JornadaNormalizada & { readonly numeroJornada: number })[];
  readonly actualizadas: readonly JornadaNormalizada[];
}

export function fusionarCalendario(o: {
  readonly existentes: readonly ExistenteLiga[];
  readonly entrantes: readonly JornadaNormalizada[];
  readonly ignorados: readonly string[];
  readonly maxNumeroLiga: number;
}): FusionCalendario {
  const ignorados = new Set(o.ignorados);
  const porId = new Map(o.existentes.map((e) => [e.fnbMatchId, e] as const));
  const nuevas: (JornadaNormalizada & { numeroJornada: number })[] = [];
  const actualizadas: JornadaNormalizada[] = [];
  let siguiente = o.maxNumeroLiga;
  const vistasNuevas = new Set<string>();
  for (const j of o.entrantes) {
    if (ignorados.has(j.fnbMatchId)) {
      continue;
    }
    const previa = porId.get(j.fnbMatchId) ?? null;
    if (previa !== null) {
      actualizadas.push(j);
      continue;
    }
    if (vistasNuevas.has(j.fnbMatchId)) {
      continue;
    }
    vistasNuevas.add(j.fnbMatchId);
    siguiente += 1;
    nuevas.push({ ...j, numeroJornada: siguiente });
  }
  return { nuevas, actualizadas };
}
