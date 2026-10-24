import type es from "@/es/strings.json";

export type Locale = "es";

export type LocaleSolicitado = string;

export type Diccionario = {
  readonly [clave: string]: string | Diccionario;
};

type Rutas<T, Prefijo extends string = ""> = {
  [K in Extract<keyof T, string>]: T[K] extends string
    ? `${Prefijo}${K}`
    : Rutas<T[K], `${Prefijo}${K}.`>;
}[Extract<keyof T, string>];

export type ClaveI18n = Rutas<typeof es>;

/**
 * Variables `{var}` exigidas por cada clave en llamadas estáticas.
 *
 * Mapeo manual (no derivado del JSON): `resolveJsonModule` ensancha los
 * valores de `@/es/strings.json` a `string`, por lo que extraer las `{var}`
 * con un template-literal sobre el valor daría `never` y rompería RF-08.
 * Al añadir claves con `{var}` hay que ampliar este mapeo; los tests de
 * `diccionario` fijan las plantillas reales del JSON.
 */
export type VarsDe<K extends ClaveI18n> = K extends "ui.home.countdown"
  ? "time"
  : K extends "ui.home.cuenta_atras"
    ? "time"
    : K extends "ui.ejemplo.saludo"
      ? "nombre"
      : K extends "ui.auth.reset_info"
        ? "username"
        : K extends "ui.onboarding.paso2_texto"
          ? "horas"
          : K extends "errors.auth.bloqueado_15m"
            ? "minutos"
            : K extends "ui.ajustes.idioma"
              ? "idioma"
              : K extends "ui.normas.cierre_texto"
                ? "horas"
                : K extends "ui.normas.leyenda_posicion"
                  ? "bonus"
                  : K extends "ui.normas.leyenda_racha"
                    ? "segunda"
                    : K extends "ui.normas.leyenda_expulsado"
                      ? "penalizacion"
                      : K extends "ui.normas.leyenda_mvp"
                        ? "bonus"
                        : K extends "ui.normas.entrenadores_texto"
                  ?
                      | "factorNum"
                      | "factorDen"
                      | "ejBase"
                      | "ejCapitan"
                      | "ejBaseCero"
                      | "ejPater"
                  : K extends "ui.normas.posicion_texto"
                    ? "bonus"
                    : K extends "ui.normas.racha_texto"
                      ? "segunda" | "tercera"
                      : K extends "ui.normas.mvp_texto"
                        ? "bonus"
                        : K extends "ui.normas.expulsion_texto"
                          ? "penalizacion"
                          : K extends "ui.normas.orden_texto"
                            ? "sinQuinteto"
                            : K extends "ui.equipo.jornada"
                              ? "num" | "rival"
                              : K extends "ui.equipo.cierre_en"
                                ? "time"
                                : K extends "ui.equipo.motivo.falta_slot"
                                  ? "slot"
                                  : K extends "ui.equipo.motivo.hay_inactivo"
                                    ? "nombre"
                                    : K extends "ui.equipo.slot.vacio"
                                      ? "slot"
                                      : K extends "ui.equipo.selector.titulo"
                                        ? "slot"
                                        : K extends "ui.equipo.selector.ocupado"
                                          ? "slot"
                                          : K extends "ui.equipo.preview.racha"
                                            ? "n"
                                            : K extends "ui.ficha.racha"
                                              ? "n"
                                              : K extends "ui.equipo.preview.mas5"
                                                ? "bonus"
                                                : K extends "ui.equipo.entrenador.maider_info"
                                                  ? "factor"
                                                  : K extends "ui.resultados.fila_puntos"
                                                    ? "puntos" | "puesto"
                                                    : K extends "ui.resultados.nota_sin_envio"
                                                      ? "penalizacion" | "enlace"
                                                      : K extends "ui.resultados.aviso_excluida"
                                                        ? "numero"
                                                        : K extends "ui.resultados.total"
                                                          ? "total"
                                                          : K extends "ui.resultados.mvp"
                                                            ? "bonus"
                                                            : K extends
                                                                  | "ui.resultados.expulsion"
                                                                  | "ui.resultados.expulsion_pl"
                                                                  | "ui.resultados.racha"
                                                              ? "penalizacion"
                                                              : K extends "ui.resultados.posicion"
                                                                ? "bonus"
                                                                : K extends "ui.resultados.jornada"
                                                                  ? "numero"
                                                                  : K extends "ui.resultados.base"
                                                                    ? "base"
                                                                    : K extends "ui.resultados.efecto_entrenador"
                                                                      ? "valor"
                                                                      : K extends "ui.resultados.subtotal"
                                                                        ? "subtotal"
                                                                        : never;
