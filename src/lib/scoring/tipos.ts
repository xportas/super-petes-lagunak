export type Posicion = "B" | "E" | "A" | "AP" | "P";
export type Entrenador = "maider" | "pater";
export type EstadoJugadorActa = "jugo" | "lesionado" | "no_convocado" | "dnp";
export type EstadoJornada = "pendiente" | "calculada" | "papel" | "invalidada";
export type JugadorId = string;
export type ManagerId = string;

export interface ConteosFaltas {
  readonly descalificacion: number;
  readonly pelea: number;
  readonly antideportivas: number;
  readonly tecnicas: number;
  readonly tecnicaEntrenador: number;
  readonly personales: number;
}

export interface EntradaJugador {
  readonly jugadorId: JugadorId;
  readonly valoracionFNB: number | null | undefined;
  readonly estado: EstadoJugadorActa;
  readonly expulsado: boolean;
  readonly posicionesValidas: readonly [Posicion, Posicion] | null | undefined;
  readonly posicionAlineada: Posicion;
  readonly esCapitan: boolean;
}

export interface PlantillaBaseMax {
  readonly maxBase: number | null;
  readonly capitanEsMaximo: boolean;
  readonly jugoAlguno: boolean;
}

export interface EntradaJornada {
  readonly entrenador: Entrenador;
  readonly quinteto: readonly EntradaJugador[];
  readonly penalizacionRachaPorJugador: Readonly<Record<JugadorId, number>>;
  readonly plantillaBaseMax: PlantillaBaseMax;
}

export interface DesgloseJugador {
  readonly jugadorId: JugadorId;
  readonly base: number;
  readonly trasEntrenador: number;
  readonly bonusPosicion: 0 | 5;
  readonly penalizacionRacha: number;
  readonly subtotal: number;
}

export interface ResultadoJornada {
  readonly porJugador: readonly DesgloseJugador[];
  readonly esMvp: boolean;
  readonly bonusMvp: 0 | 3;
  readonly expulsiones: number;
  readonly penalizacionExpulsion: number;
  readonly total: number;
}

export type ErrorCalculo =
  | { readonly codigo: "DATO_AUSENTE"; readonly jugadorId?: JugadorId }
  | { readonly codigo: "POSICIONES_INVALIDAS"; readonly jugadorId: JugadorId }
  | { readonly codigo: "LESION_EXPULSION_EXCLUYENTES"; readonly jugadorId: JugadorId };
