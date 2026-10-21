import type {
  Entrenador,
  EstadoJornada,
  Posicion,
} from "../scoring/tipos";

export type IconoEstado = "jugo" | "lesionado" | "no_convocado" | "dnp";

export interface LineaJugadorVista {
  readonly jugadorId: string;
  readonly posicionAlineada: Posicion;
  readonly esCapitan: boolean;
  readonly icono: IconoEstado;
  readonly expulsado: boolean;
  readonly base: number;
  readonly trasEntrenador: number;
  readonly bonusPosicion: 0 | 5;
  readonly penalizacionRacha: number;
  readonly subtotal: number;
}

export interface DesgloseJornadaVista {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly horaPartido: Date;
  readonly entrenador: Entrenador;
  readonly lineas: readonly LineaJugadorVista[];
  readonly esMvp: boolean;
  readonly bonusMvp: 0 | 3;
  readonly expulsiones: number;
  readonly penalizacionExpulsion: number;
  readonly total: number;
}

export type FilaHistorial =
  | {
      readonly kind: "calculada";
      readonly desglose: DesgloseJornadaVista;
      readonly puestoAcumulado: number;
    }
  | {
      readonly kind: "sin_envio";
      readonly jornadaId: string;
      readonly numeroJornada: number;
      readonly horaPartido: Date;
      readonly total: -10;
      readonly puestoAcumulado: number;
    };

export interface AvisoJornadaExcluida {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly motivo: "invalidada";
}

export interface HistorialVista {
  readonly destacada: DesgloseJornadaVista | null;
  readonly filas: readonly FilaHistorial[];
  readonly avisos: readonly AvisoJornadaExcluida[];
}

export interface EntradaGeneral {
  readonly managerId: string;
  readonly username: string;
  readonly acumulado: number;
  readonly puesto: number;
}

export interface ClasificacionVista {
  readonly filas: readonly EntradaGeneral[];
  readonly hayColores: boolean;
  readonly miManagerId: string;
}

export type Medalla = "oro" | "plata" | "bronce" | null;

export interface JornadaHistorial {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly horaPartido: Date;
  readonly estado: EstadoJornada;
}

export interface ManagerPuesto {
  readonly id: string;
  readonly username: string;
}
