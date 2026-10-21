import type { JornadaOrdenable } from "@/src/lib/dominio/tipos";

export type { JornadaOrdenable };

export type EstadoHome =
  | "cuenta_atras"
  | "cerrado"
  | "sin_proxima"
  | "vacia";

export interface JornadaActivaView {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly horaPartido: Date;
  readonly estado: string;
}

export interface TopManagerRow {
  readonly managerId: string;
  readonly username: string;
  readonly puntos: number;
  readonly jornadaEtiqueta: string;
  readonly puesto: number;
}

export interface TopJugadorRow {
  readonly jugadorId: string;
  readonly base: number;
  readonly jornadaEtiqueta: string;
  readonly puesto: number;
}

export type ResolucionActiva<T extends JornadaOrdenable> =
  | { readonly tipo: "activa"; readonly jornada: T; readonly cerrada: boolean }
  | { readonly tipo: "sin_proxima"; readonly ultima: T | null }
  | { readonly tipo: "vacia" };
