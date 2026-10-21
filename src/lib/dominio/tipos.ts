import type { Entrenador, EstadoJornada, Posicion } from "../scoring/tipos";

export interface QuintetoInput {
  readonly jugadorIds: readonly [string, string, string, string, string];
  readonly posicionPorJugador: Readonly<Record<string, Posicion>>;
  readonly entrenador: Entrenador;
  readonly capitanId: string;
}

export interface AlineacionGuardada {
  readonly managerId: string;
  readonly jornadaId: string;
  readonly quinteto: QuintetoInput;
  readonly instanteInicio: Date;
}

export interface JornadaOrdenable {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly horaPartido: Date;
  readonly estado: EstadoJornada;
}

export interface EventoAparicion {
  readonly jugadorId: string;
  readonly jornadaId: string;
  readonly horaPartido: Date;
  readonly numeroJornada: number;
  readonly estadoJornada: EstadoJornada;
  readonly alineado: boolean;
  readonly quintetoValido: boolean;
}
