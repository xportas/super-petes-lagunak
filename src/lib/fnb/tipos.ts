import type { ConteosFaltas, EstadoJornada } from "../scoring/tipos";

export interface MatchFnbCrudo {
  readonly idMatch: string;
  readonly universallyid: string | null;
  readonly numMatchDay: string;
  readonly matchDay: string;
  readonly state: string;
  readonly idLocalTeam: string;
  readonly nameLocalTeam: string;
  readonly idVisitorTeam: string;
  readonly nameVisitorTeam: string;
  readonly nameField: string | null;
  readonly adressField: string | null;
  readonly nameTown: string | null;
  readonly localScore: string | null;
  readonly visitorScore: string | null;
}

export interface ActaJugadorFnbCrudo {
  readonly uuid: string;
  readonly name: string;
  readonly dorsal: string;
  readonly timePlayed: number;
  readonly valoracion: number;
  readonly conteos: ConteosFaltas;
}

export interface JornadaNormalizada {
  readonly fnbMatchId: string;
  readonly fnbUniversallyId: string | null;
  readonly numeroJornadaFnb: number | null;
  readonly horaPartido: Date;
  readonly esLocal: boolean;
  readonly rival: string;
  readonly campo: string | null;
  readonly municipio: string | null;
  readonly finalizado: boolean;
  readonly marcadorLocal: number | null;
  readonly marcadorVisitante: number | null;
}

export type EstadoPropuesto = "jugo" | "no_convocado" | "dnp";

export type EstadoResuelto = "jugo" | "lesionado" | "no_convocado" | "dnp";

export interface ActaJugadorNormalizada {
  readonly fnbUuid: string;
  readonly nombreActa: string;
  readonly dorsal: string;
  readonly minutos: number;
  readonly valoracionTruncada: number;
  readonly estadoPropuesto: EstadoPropuesto;
  readonly expulsado: boolean;
}

export interface ActaNormalizada {
  readonly fnbMatchId: string;
  readonly fnbUniversallyId: string;
  readonly porJugador: readonly ActaJugadorNormalizada[];
}

export type VeredictoSync =
  | { readonly accion: "nada" }
  | { readonly accion: "calendario" }
  | { readonly accion: "importar-acta"; readonly acta: ActaNormalizada }
  | {
      readonly accion: "papel";
      readonly marcadorLocal: number;
      readonly marcadorVisitante: number;
    };

export interface PlantillaVinculo {
  readonly id: string;
  readonly nombreFnb: string;
  readonly fnbUuid: string | null;
}

export type ResultadoVinculo =
  | { readonly tipo: "uuid"; readonly id: string }
  | { readonly tipo: "nombre-unico"; readonly id: string }
  | { readonly tipo: "pendiente" };

export type OrigenResultadoFnb = "manual" | "fnb" | null;

export interface EntradaSyncResultado {
  readonly horaPartido: Date;
  readonly estado: EstadoJornada;
  readonly origen: OrigenResultadoFnb;
  readonly lastResultSync: Date | null;
  readonly ahora: Date;
}

export interface EntradaPapel {
  readonly state: string;
  readonly universallyid: string | null;
  readonly horaPartido: Date;
  readonly ahora: Date;
}
