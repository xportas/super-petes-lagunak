import { jugadorSchema } from "./esquemas";
import type { JugadorInput, Posicion } from "./tipos";
import type { ClaveI18n } from "@/src/lib/i18n";

export type ResultadoValidacionJugador =
  | { readonly ok: true; readonly valor: JugadorInput }
  | { readonly ok: false; readonly error: ClaveI18n };

export function validarJugador(
  entrada: unknown,
): ResultadoValidacionJugador {
  const r = jugadorSchema.safeParse(entrada);
  if (!r.success) {
    return { ok: false, error: "errors.admin.sin_rival_hora" };
  }
  return { ok: true, valor: r.data as JugadorInput };
}

export function esPendiente(ficha: {
  readonly activo: boolean;
  readonly posicionesValidas:
    | readonly [Posicion, Posicion]
    | null
    | undefined;
}): boolean {
  return ficha.activo === true && ficha.posicionesValidas == null;
}

export type AvisoImg = "ok" | "fallback";

// img/imgPete valida existencia en public/ con fallback placeholder sin bloquear.
export function avisarImg(
  ruta: string | undefined,
  existeArchivo: (ruta: string) => boolean,
): AvisoImg {
  if (typeof ruta !== "string" || ruta.trim().length === 0) {
    return "fallback";
  }
  try {
    return existeArchivo(ruta) ? "ok" : "fallback";
  } catch {
    return "fallback";
  }
}
