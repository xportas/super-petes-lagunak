import type { Rol } from "./tipos";

export type Capacidad =
  | "leer:plantilla"
  | "leer:jornadas"
  | "escribir:alineacion_propia"
  | "escribir:todo";

export function capacidadesDe(rol: Rol): readonly Capacidad[] {
  if (rol === "admin") {
    return ["leer:plantilla", "leer:jornadas", "escribir:todo"];
  }
  return ["leer:plantilla", "leer:jornadas", "escribir:alineacion_propia"];
}

export function puedeLeerPlantilla(rol: Rol): boolean {
  return capacidadesDe(rol).includes("leer:plantilla");
}

export function puedeLeerJornadas(rol: Rol): boolean {
  return capacidadesDe(rol).includes("leer:jornadas");
}

export function puedeEscribirAlineacionPropia(
  rol: Rol,
  esPropia: boolean,
): boolean {
  if (rol === "admin") {
    return false;
  }
  if (rol !== "manager") {
    return false;
  }
  return esPropia;
}

export function puedeAdminEscribir(rol: Rol): boolean {
  return rol === "admin";
}

export function rechazaAlineacionAdmin(rol: Rol): boolean {
  return rol === "admin";
}

export function excluyeAdminDeRanking(rol: Rol): boolean {
  return rol === "admin";
}

export function deniegaAnon(): false {
  return false;
}

export interface ConsultaAlineacionPropia {
  readonly managerId: string;
  readonly jornadaId: string;
}

export interface ConsultaActaJornada {
  readonly jornadaId: string;
}

export function construirClaveAlineacion(
  c: ConsultaAlineacionPropia,
): { readonly managerId: string; readonly jornadaId: string } {
  return { managerId: c.managerId, jornadaId: c.jornadaId };
}

export function construirClaveActa(
  c: ConsultaActaJornada,
): { readonly jornadaId: string } {
  return { jornadaId: c.jornadaId };
}
