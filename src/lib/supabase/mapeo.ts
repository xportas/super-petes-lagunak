import type { JugadorRow } from "./tipos";

export function normalizarUsername(u: unknown): string {
  if (typeof u !== "string") {
    throw new TypeError("username no es texto");
  }
  return u.trim().toLowerCase();
}

export function normalizarNombreFNB(n: string): string {
  return n
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function esVigenteEn(
  fechaAlta: Date,
  fechaBaja: Date | null,
  cierre: Date,
): boolean {
  if (!(fechaAlta instanceof Date) || Number.isNaN(fechaAlta.getTime())) {
    return false;
  }
  if (!(cierre instanceof Date) || Number.isNaN(cierre.getTime())) {
    return false;
  }
  if (fechaAlta.getTime() > cierre.getTime()) {
    return false;
  }
  if (fechaBaja === null) {
    return true;
  }
  if (!(fechaBaja instanceof Date) || Number.isNaN(fechaBaja.getTime())) {
    return false;
  }
  return fechaBaja.getTime() > cierre.getTime();
}

export function truncarValoracion(v: number): number {
  return Math.trunc(v);
}

export interface VinculoAuto {
  readonly estado: "auto";
  readonly jugador: JugadorRow;
  readonly coincidencias: readonly [JugadorRow];
}

export interface VinculoPendiente {
  readonly estado: "pendiente";
  readonly jugador?: undefined;
  readonly coincidencias: readonly JugadorRow[];
}

export type ResultadoVinculo = VinculoAuto | VinculoPendiente;

function nombresNormalizados(j: JugadorRow): readonly string[] {
  const base = [j.nombre, j.nombreFnb];
  const out: string[] = [];
  for (const n of base) {
    if (typeof n === "string" && n.trim().length > 0) {
      out.push(normalizarNombreFNB(n));
    }
  }
  return out;
}

export function resolverVinculoPorNombre(
  nombreActa: string,
  plantilla: readonly JugadorRow[],
): ResultadoVinculo {
  const buscado = normalizarNombreFNB(nombreActa);
  const coincidencias = plantilla.filter((j) =>
    nombresNormalizados(j).includes(buscado),
  );
  if (coincidencias.length === 1) {
    const unico = coincidencias[0] as JugadorRow;
    return { estado: "auto", jugador: unico, coincidencias: [unico] };
  }
  return { estado: "pendiente", coincidencias };
}

export function resolverJugadorFNB(
  entrada: { readonly uuid: string | null; readonly nombreActa: string },
  plantilla: readonly JugadorRow[],
): ResultadoVinculo {
  const uuid = entrada.uuid;
  if (typeof uuid === "string" && uuid.trim().length > 0) {
    const normalizado = uuid.trim().toLowerCase();
    const porUuid = plantilla.filter(
      (j) =>
        typeof j.fnbUuid === "string" &&
        j.fnbUuid.trim().toLowerCase() === normalizado,
    );
    if (porUuid.length === 1) {
      const unico = porUuid[0] as JugadorRow;
      return { estado: "auto", jugador: unico, coincidencias: [unico] };
    }
    if (porUuid.length > 1) {
      return { estado: "pendiente", coincidencias: porUuid };
    }
  }
  return resolverVinculoPorNombre(entrada.nombreActa, plantilla);
}

export function esUsernameDuplicado(a: string, b: string): boolean {
  return normalizarUsername(a) === normalizarUsername(b);
}

const MS_POR_HORA = 3600 * 1000;

export function puedeSincronizarCalendario(
  lastCalendarSync: Date | null,
  ahora: Date,
): boolean {
  if (lastCalendarSync === null) {
    return true;
  }
  return ahora.getTime() - lastCalendarSync.getTime() >= 24 * MS_POR_HORA;
}

export function puedeSincronizarResultados(
  lastResultSync: Date | null,
  horaPartido: Date,
  ahora: Date,
): boolean {
  if (ahora.getTime() < horaPartido.getTime() + 3 * MS_POR_HORA) {
    return false;
  }
  if (lastResultSync === null) {
    return true;
  }
  return ahora.getTime() - lastResultSync.getTime() >= 1 * MS_POR_HORA;
}

export function debeSaltarAutoPorManual(
  origenResultado: "manual" | "fnb" | null,
): boolean {
  return origenResultado === "manual";
}

export function debeReimportar(
  origenResultado: "manual" | "fnb" | null,
  esReimporteExplicito: boolean,
): boolean {
  if (esReimporteExplicito) {
    return true;
  }
  if (origenResultado === "manual") {
    return false;
  }
  return true;
}

export function esPartidoIgnorado(
  fnbMatchId: string,
  ignorados: readonly { readonly fnbMatchId: string }[],
): boolean {
  return ignorados.some((f) => f.fnbMatchId === fnbMatchId);
}

export function siguienteNumeroJornada(
  existentes: readonly { readonly numeroJornada: number }[],
): number {
  let max = 0;
  for (const j of existentes) {
    if (j.numeroJornada > max) {
      max = j.numeroJornada;
    }
  }
  return max + 1;
}
