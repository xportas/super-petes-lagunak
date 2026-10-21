import type { Posicion } from "@/src/lib/scoring/tipos";

export type { Posicion };
export type Rol = "manager" | "admin";
export type EstadoSanitario = "disponible" | "lesionado";
export type EstadoActa = "jugo" | "lesionado" | "no_convocado" | "dnp";
export type EstadoJornada = "pendiente" | "calculada" | "papel" | "invalidada";
export type OrigenResultado = "manual" | "fnb";
export type EntrenadorSlug = "maider" | "pater";

export interface JugadorRow {
  readonly id: string;
  readonly nombre: string;
  readonly nombreFnb: string;
  readonly dorsal: number | null;
  readonly posicionesValidas: readonly [Posicion, Posicion] | null;
  readonly nombrePete: string | null;
  readonly img: string;
  readonly imgPete: string;
  readonly descripcion: string;
  readonly fnbUuid: string | null;
  readonly estadoSanitario: EstadoSanitario;
  readonly activo: boolean;
  readonly fechaAlta: Date;
  readonly fechaBaja: Date | null;
}

export interface EntrenadorRow {
  readonly slug: EntrenadorSlug;
  readonly nombre: string;
  readonly img: string;
  readonly fnbUuid: string;
}

export interface JornadaRow {
  readonly id: string;
  readonly numeroJornada: number;
  readonly numeroJornadaFnb: number | null;
  readonly rival: string;
  readonly esLocal: boolean;
  readonly campo: string | null;
  readonly municipio: string | null;
  readonly horaPartido: Date;
  readonly estado: EstadoJornada;
  readonly fnbMatchId: string | null;
  readonly fnbUniversallyId: string | null;
  readonly marcadorLocal: number | null;
  readonly marcadorVisitante: number | null;
  readonly origenResultado: OrigenResultado | null;
  readonly lastCalendarSync: Date | null;
  readonly lastResultSync: Date | null;
}

export interface AlineacionRow {
  readonly id: string;
  readonly managerId: string;
  readonly jornadaId: string;
  readonly entrenador: EntrenadorSlug;
  readonly capitanJugadorId: string;
  readonly instanteInicio: Date;
}

export interface AlineacionSeleccionRow {
  readonly alineacionId: string;
  readonly jugadorId: string;
  readonly posicionAlineada: Posicion;
}

export interface ResultadoJugadorRow {
  readonly jornadaId: string;
  readonly jugadorId: string;
  readonly valoracion: number;
  readonly estado: EstadoActa;
  readonly expulsado: boolean;
}

export interface UsuarioRow {
  readonly id: string;
  readonly username: string;
  readonly usernameNormalizado: string;
  readonly passwordHash: string;
  readonly esTemporal: boolean;
  readonly onboardingPaso: number;
  readonly onboardingCompletadoAt: Date | null;
  readonly rol: Rol;
  readonly creadoAt: Date;
}

export interface SesionRow {
  readonly id: string;
  readonly usuarioId: string;
  readonly tokenHash: string;
  readonly expiraAt: Date;
  readonly ultimaRenovacionAt: Date;
  readonly revocadaAt: Date | null;
}

export interface InvitacionRow {
  readonly id: string;
  readonly codigo: string;
  readonly vigente: boolean;
  readonly creadaAt: Date;
}

export interface RateLimitRow {
  readonly alcance: string;
  readonly sujeto: string;
  readonly intentos: number;
  readonly primerFalloAt: Date;
  readonly bloqueadoHasta: Date | null;
}

export interface FnbPartidoIgnoradoRow {
  readonly fnbMatchId: string;
  readonly eliminadoAt: Date;
}
