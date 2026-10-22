import type { PlantillaVinculo, ResultadoVinculo } from "./tipos";

export function normalizarNombreFNB(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function ultimoDomingo(year: number, mes1_12: number): number {
  const ultimoDia = new Date(Date.UTC(year, mes1_12, 0)).getUTCDate();
  const diaSemanaUltimo = new Date(Date.UTC(year, mes1_12 - 1, ultimoDia)).getUTCDay();
  return ultimoDia - diaSemanaUltimo;
}

function offsetMadridMinutos(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number {
  const inicioDST = ultimoDomingo(year, 3);
  const finDST = ultimoDomingo(year, 10);
  const despuesInicio =
    month > 3 ||
    (month === 3 && (day > inicioDST || (day === inicioDST && (hour > 2 || (hour === 2 && minute >= 0)))));
  const antesFin =
    month < 10 ||
    (month === 10 && (day < finDST || (day === finDST && (hour < 3 || (hour === 3 && minute < 0)))));
  const enDST = despuesInicio && antesFin;
  return enDST ? 120 : 60;
}

const RE_HORA = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

export function parsearHoraMadrid(s: string): Date | null {
  const m = RE_HORA.exec(s);
  if (m === null || m[1] === undefined || m[2] === undefined || m[3] === undefined || m[4] === undefined || m[5] === undefined || m[6] === undefined) {
    return null;
  }
  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  const day = Number.parseInt(m[3], 10);
  const hour = Number.parseInt(m[4], 10);
  const minute = Number.parseInt(m[5], 10);
  const second = Number.parseInt(m[6], 10);
  if (
    !Number.isSafeInteger(year) ||
    !Number.isSafeInteger(month) ||
    !Number.isSafeInteger(day) ||
    !Number.isSafeInteger(hour) ||
    !Number.isSafeInteger(minute) ||
    !Number.isSafeInteger(second)
  ) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return null;
  }
  const offsetMin = offsetMadridMinutos(year, month, day, hour, minute);
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMin * 60 * 1000;
  const d = new Date(utcMs);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const deVueltaMs = d.getTime() + offsetMin * 60 * 1000;
  const deVuelta = new Date(deVueltaMs);
  if (
    deVuelta.getUTCFullYear() !== year ||
    deVuelta.getUTCMonth() !== month - 1 ||
    deVuelta.getUTCDate() !== day ||
    deVuelta.getUTCHours() !== hour ||
    deVuelta.getUTCMinutes() !== minute ||
    deVuelta.getUTCSeconds() !== second
  ) {
    return null;
  }
  return d;
}

export function truncarValoracion(v: number): number {
  return Math.trunc(v);
}

export function resolverVinculo(
  nombreActa: string,
  plantilla: readonly PlantillaVinculo[],
  fnbUuid: string | null = null,
): ResultadoVinculo {
  if (fnbUuid !== null && fnbUuid !== "") {
    const porUuid = plantilla.find((p) => p.fnbUuid === fnbUuid) ?? null;
    if (porUuid !== null) {
      return { tipo: "uuid", id: porUuid.id };
    }
  }
  const objetivo = normalizarNombreFNB(nombreActa);
  const coincidencias = plantilla.filter((p) => normalizarNombreFNB(p.nombreFnb) === objetivo);
  if (coincidencias.length === 1 && coincidencias[0] !== undefined) {
    return { tipo: "nombre-unico", id: coincidencias[0].id };
  }
  return { tipo: "pendiente" };
}
