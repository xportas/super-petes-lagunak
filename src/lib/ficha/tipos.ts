import type { EstadoJornada, EstadoJugadorActa } from "@/src/lib/scoring/tipos";

export interface ActaMedia {
  readonly base: number;
  readonly estado: EstadoJugadorActa;
  readonly estadoJornada: EstadoJornada;
}

export type MediaTemporada =
  | { readonly tipo: "valor"; readonly media: number; readonly jugados: number }
  | { readonly tipo: "sin_datos" };

export interface ActaConJornada {
  readonly jornadaId: string;
  readonly etiqueta: string;
  readonly base: number;
  readonly estado: EstadoJugadorActa;
  readonly estadoJornada: EstadoJornada;
  readonly horaPartido: Date;
  readonly numeroJornada: number;
}

export interface VigenciaJugador {
  readonly fechaAlta: Date;
  readonly fechaBaja: Date | null;
}

export interface EvolucionFila {
  readonly jornadaId: string;
  readonly etiqueta: string;
  readonly base: number;
  readonly estado: EstadoJugadorActa;
}

export type UltimaValoracion =
  | {
      readonly tipo: "valor";
      readonly base: number;
      readonly estado: EstadoJugadorActa;
      readonly jornadaEtiqueta: string;
    }
  | { readonly tipo: "sin_datos" };

export interface FichaCabecera {
  readonly jugadorId: string;
  readonly esBaja: boolean;
}

export type LineaSanitaria = "disponible" | "lesionado" | "baja";

export type EstadoActualDosLineas = {
  readonly lineaSanitaria: LineaSanitaria;
  readonly lineaRacha:
    | { readonly tipo: "valor"; readonly penalizacion: number }
    | { readonly tipo: "no_aplica" };
};
