import type { Rol } from "@/src/lib/auth/tipos";

export type { Rol };

export type Tema = "light" | "dark";

export type ModoPete = "0" | "1";

export interface Preferencias {
  readonly modoPete: ModoPete;
  readonly tema: Tema;
}

export type RutaNav =
  | "/"
  | "/equipo"
  | "/mi-resultado"
  | "/clasificacion"
  | "/ajustes"
  | "/admin"
  | "/jugadores"
  | "/normas";

export interface ItemNav {
  readonly ruta: RutaNav;
  readonly claveEtiqueta:
    | "ui.nav.home"
    | "ui.nav.equipo"
    | "ui.nav.resultados"
    | "ui.nav.clasificacion"
    | "ui.nav.ajustes"
    | "ui.nav.admin"
    | "ui.nav.jugadores"
    | "ui.nav.normas";
  readonly ancla?: string;
}

export type BloqueNormas =
  | "cierre"
  | "base"
  | "entrenadores"
  | "posicion"
  | "racha"
  | "mvp"
  | "expulsion"
  | "orden";
