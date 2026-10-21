import type { Posicion } from "../scoring/tipos";
import { esquemaQuintetoInput } from "./esquemas";
import type { QuintetoInput } from "./tipos";

export interface PlantillaJugador {
  readonly activo: boolean;
  readonly posicionesValidas: readonly [Posicion, Posicion] | null;
}

export type ResultadoValidacion =
  | { readonly ok: true; readonly valor: QuintetoInput }
  | { readonly ok: false; readonly errores: string[] };

const ENTRENADORES_EN_QUINTETO = new Set(["maider", "pater"]);

export function validarQuinteto(
  input: unknown,
  plantilla: ReadonlyMap<string, { readonly activo: boolean; readonly posicionesValidas: readonly [Posicion, Posicion] | null }>,
): ResultadoValidacion {
  const parseado = esquemaQuintetoInput.safeParse(input);
  if (!parseado.success) {
    const errores: string[] = [];
    for (const problema of parseado.error.issues) {
      if (problema.message === "duplicados") {
        errores.push("duplicados");
      } else if (problema.message === "capitan_fuera") {
        errores.push("capitan_fuera");
      } else if (problema.path[0] === "entrenador") {
        errores.push("entrenador_invalido");
      } else if (problema.path[0] === "capitanId") {
        errores.push("sin_capitan");
      } else {
        errores.push("posicion_invalida");
      }
    }
    return { ok: false, errores: [...new Set(errores)] };
  }
  const valor = parseado.data;
  const errores: string[] = [];

  for (const id of valor.jugadorIds) {
    if (ENTRENADORES_EN_QUINTETO.has(id.toLowerCase())) {
      errores.push("entrenador_en_quinteto");
    }
  }

  for (const id of valor.jugadorIds) {
    const ficha = plantilla.get(id);
    if (ficha === undefined || ficha.posicionesValidas === null) {
      errores.push("jugador_pendiente");
    } else if (!ficha.activo) {
      errores.push("jugador_inactivo");
    }
  }

  for (const id of valor.jugadorIds) {
    const posicion = valor.posicionPorJugador[id];
    if (posicion === undefined) {
      errores.push("sin_posicion");
    }
  }

  if (errores.length > 0) {
    return { ok: false, errores: [...new Set(errores)] };
  }
  const ids = valor.jugadorIds as unknown as readonly [
    string,
    string,
    string,
    string,
    string,
  ];
  const quinteto: QuintetoInput = {
    jugadorIds: [ids[0], ids[1], ids[2], ids[3], ids[4]],
    posicionPorJugador: valor.posicionPorJugador,
    entrenador: valor.entrenador,
    capitanId: valor.capitanId,
  };
  return { ok: true, valor: quinteto };
}
