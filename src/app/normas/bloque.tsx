import { traducir } from "@/src/lib/i18n";
import type { BloqueNormas } from "@/src/lib/preferencias/tipos";
import { calcularJugador } from "@/src/lib/scoring/calcular-jugador";
import {
  BONUS_MVP,
  BONUS_POSICION,
  FACTOR_CAPITAN_DEN,
  FACTOR_CAPITAN_NUM,
  HORAS_CIERRE,
  PENALIZACION_POR_EXPULSADO,
  PENALIZACION_SIN_QUINTETO,
} from "@/src/lib/scoring/constantes";
import { penalizacionPara } from "@/src/lib/dominio/rachas";
import type { Posicion } from "@/src/lib/scoring/tipos";

function textoPara(bloque: BloqueNormas): string {
  if (bloque === "cierre") {
    return traducir("es", "ui.normas.cierre_texto", {
      horas: HORAS_CIERRE,
    });
  }
  if (bloque === "base") {
    return traducir("es", "ui.normas.base_texto");
  }
  if (bloque === "entrenadores") {
    const ejBase = 13;
    const cap = calcularJugador(
      {
        jugadorId: "ejemplo",
        valoracionFNB: ejBase,
        estado: "jugo",
        expulsado: false,
        posicionesValidas: ["B", "E"] as readonly [Posicion, Posicion],
        posicionAlineada: "P",
        esCapitan: true,
      },
      1,
      "maider",
    );
    const ejCapitan =
      "error" in cap ? ejBase : cap.trasEntrenador;
    const ejBaseCero = 0;
    const suelo = calcularJugador(
      {
        jugadorId: "ejemplo",
        valoracionFNB: 12,
        estado: "lesionado",
        expulsado: false,
        posicionesValidas: ["B", "E"] as readonly [Posicion, Posicion],
        posicionAlineada: "B",
        esCapitan: false,
      },
      1,
      "pater",
    );
    const ejPater = "error" in suelo ? ejBaseCero : suelo.trasEntrenador;
    return traducir("es", "ui.normas.entrenadores_texto", {
      factorNum: FACTOR_CAPITAN_NUM,
      factorDen: FACTOR_CAPITAN_DEN,
      ejBase,
      ejCapitan,
      ejBaseCero,
      ejPater,
    });
  }
  if (bloque === "posicion") {
    return traducir("es", "ui.normas.posicion_texto", {
      bonus: BONUS_POSICION,
    });
  }
  if (bloque === "racha") {
    return traducir("es", "ui.normas.racha_texto", {
      segunda: penalizacionPara(2),
      tercera: penalizacionPara(3),
    });
  }
  if (bloque === "mvp") {
    return traducir("es", "ui.normas.mvp_texto", {
      bonus: BONUS_MVP,
    });
  }
  if (bloque === "expulsion") {
    return traducir("es", "ui.normas.expulsion_texto", {
      penalizacion: PENALIZACION_POR_EXPULSADO,
    });
  }
  return traducir("es", "ui.normas.orden_texto", {
    sinQuinteto: PENALIZACION_SIN_QUINTETO,
  });
}

function tituloPara(bloque: BloqueNormas): string {
  if (bloque === "cierre") {
    return traducir("es", "ui.normas.cierre_titulo");
  }
  if (bloque === "base") {
    return traducir("es", "ui.normas.base_titulo");
  }
  if (bloque === "entrenadores") {
    return traducir("es", "ui.normas.entrenadores_titulo");
  }
  if (bloque === "posicion") {
    return traducir("es", "ui.normas.posicion_titulo");
  }
  if (bloque === "racha") {
    return traducir("es", "ui.normas.racha_titulo");
  }
  if (bloque === "mvp") {
    return traducir("es", "ui.normas.mvp_titulo");
  }
  if (bloque === "expulsion") {
    return traducir("es", "ui.normas.expulsion_titulo");
  }
  return traducir("es", "ui.normas.orden_titulo");
}

export function Bloque(props: {
  readonly bloque: BloqueNormas;
}): React.JSX.Element {
  const titulo = tituloPara(props.bloque);
  const texto = textoPara(props.bloque);
  return (
    <details className="brutal-card w-full">
      <summary className="tappable brutal-title flex min-h-[48px] cursor-pointer items-center px-3 text-[16px] leading-[20px]">
        {titulo}
      </summary>
      <p className="border-t-[2px] border-[var(--ink-border)] px-3 pt-2 pb-3 text-sm">{texto}</p>
    </details>
  );
}
