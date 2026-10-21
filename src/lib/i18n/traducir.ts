import * as diccionarioModulo from "./diccionario";
import type {
  ClaveI18n,
  Diccionario,
  Locale,
  LocaleSolicitado,
  VarsDe,
} from "./tipos";

export function traducir<K extends ClaveI18n>(
  locale: Locale,
  clave: K,
  ...args: [VarsDe<K>] extends [never]
    ? []
    : [params: Record<VarsDe<K>, string | number>]
): string;
export function traducir(
  locale: LocaleSolicitado,
  clave: string,
  params?: Record<string, unknown>,
): string;
export function traducir(
  locale: string,
  clave: string,
  params?: Record<string, unknown>,
): string {
  const diccionario = diccionarioModulo.cargarDiccionario(locale);
  const segmentos = clave.split(".");
  let actual: string | Diccionario | undefined = diccionario;
  for (const segmento of segmentos) {
    if (typeof actual !== "object" || actual === null) {
      actual = undefined;
      break;
    }
    actual = actual[segmento];
  }
  if (actual === undefined) {
    if (process.env["NODE_ENV"] !== "production") {
      console.error(
        `[i18n] Clave inexistente: "${clave}" (locale "${locale}") (E-03).`,
      );
    }
    return clave;
  }
  if (typeof actual !== "string") {
    throw new Error(`[i18n] Valor no-string para la clave "${clave}" (E-05).`);
  }
  const plantilla = actual;
  const coincidencias = plantilla.match(/\{([A-Za-z0-9_]+)\}/g);
  if (coincidencias === null) {
    return plantilla;
  }
  const nombres: string[] = [];
  for (const coincidencia of coincidencias) {
    const nombre = coincidencia.slice(1, -1);
    if (!nombres.includes(nombre)) {
      nombres.push(nombre);
    }
  }
  if (params === undefined) {
    if (process.env["NODE_ENV"] !== "production") {
      console.error(
        `[i18n] Falta parámetro para la clave "${clave}" (E-04). Se devuelve la clave.`,
      );
    }
    return clave;
  }
  let resultado = plantilla;
  for (const nombre of nombres) {
    const valor: unknown = params[nombre];
    if (typeof valor !== "string" && typeof valor !== "number") {
      if (process.env["NODE_ENV"] !== "production") {
        console.error(
          `[i18n] Falta la variable "{${nombre}}" para la clave "${clave}" (E-04). Se devuelve la clave.`,
        );
      }
      return clave;
    }
    resultado = resultado.split(`{${nombre}}`).join(String(valor));
  }
  return resultado;
}
