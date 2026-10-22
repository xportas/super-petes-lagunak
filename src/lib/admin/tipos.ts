import type { ClaveI18n } from "@/src/lib/i18n";

export type Posicion = "B" | "E" | "A" | "AP" | "P";

export const POSICIONES: readonly Posicion[] = ["B", "E", "A", "AP", "P"];
export type EstadoJornada =
  | "pendiente"
  | "calculada"
  | "papel"
  | "invalidada";
export type OrigenResultado = "manual" | "fnb";
export type EstadoActa = "jugo" | "lesionado" | "no_convocado" | "dnp";
export type TabAdmin =
  | "jornadas"
  | "jugadores"
  | "resultados"
  | "usuarios"
  | "invitacion";

export interface JornadaInput {
  readonly rival: string;
  readonly horaPartido: string;
  readonly localVisitante: "local" | "visitante";
  readonly numeroLiga?: number | undefined;
  readonly campo?: string | undefined;
  readonly municipio?: string | undefined;
  readonly marcadorLocal?: number | undefined;
  readonly marcadorVisitante?: number | undefined;
}

export interface JugadorInput {
  readonly nombre: string;
  readonly posicionesValidas: readonly [Posicion, Posicion];
  readonly dorsal?: string | undefined;
  readonly img?: string | undefined;
  readonly imgPete?: string | undefined;
  readonly nombrePete?: string | undefined;
  readonly descripcion?: string | undefined;
  readonly fnbUuid?: string | undefined;
  readonly estadoSanitario: "disponible" | "lesionado";
}

export interface ActaFilaInput {
  readonly jugadorId: string;
  readonly valoracion: number;
  readonly estado: EstadoActa;
  readonly expulsado: boolean;
}

export interface CandidatoVigencia {
  readonly id: string;
  readonly fechaAlta: Date;
  readonly fechaBaja: Date | null;
}

export type ErrorAdmin = { readonly ok: false; readonly error: ClaveI18n };
export type OkAdmin<T> = { readonly ok: true; readonly valor: T };
