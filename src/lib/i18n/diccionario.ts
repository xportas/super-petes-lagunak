import esJson from "@/es/strings.json";
import type { Diccionario } from "./tipos";

function esDiccionarioValido(valor: unknown): valor is Diccionario {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Devuelve el diccionario del locale solicitado.
 * Si el locale no dispone de diccionario (p. ej. `eu` en v1), avisa por
 * `console.error` en desarrollo y aplica fallback a `es` (E-07).
 * Si `es` falta o es inválido, lanza un error visible (E-06).
 */
export function cargarDiccionario(locale: string): Diccionario {
  if (!esDiccionarioValido(esJson)) {
    throw new Error(
      '[i18n] Diccionario "es" ausente o inválido: no se puede completar la fundación (E-06).',
    );
  }
  const es: Diccionario = esJson;
  if (locale === "es") {
    return es;
  }
  if (process.env["NODE_ENV"] !== "production") {
    console.error(
      `[i18n] Locale sin diccionario: "${locale}". Se aplica fallback a "es" (E-07).`,
    );
  }
  return es;
}
