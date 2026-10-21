"use client";

import { traducir } from "@/src/lib/i18n";
import {
  FACTOR_CAPITAN_DEN,
  FACTOR_CAPITAN_NUM,
} from "@/src/lib/scoring/constantes";
import { IconoAyuda } from "./icono-ayuda";

export function SelectorEntrenador(props: {
  readonly valor: "maider" | "pater" | null;
  readonly deshabilitado: boolean;
  readonly alElegir: (v: "maider" | "pater") => void;
}): React.JSX.Element {
  const titulo = traducir("es", "ui.equipo.entrenador.titulo");
  const nombreMaider = traducir("es", "ui.equipo.entrenador.maider");
  const nombrePater = traducir("es", "ui.equipo.entrenador.pater");
  const infoMaider = traducir("es", "ui.equipo.entrenador.maider_info", {
    factor: FACTOR_CAPITAN_NUM / FACTOR_CAPITAN_DEN,
  });
  const infoPater = traducir("es", "ui.equipo.entrenador.pater_info");
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="font-semibold">{titulo}</h2>
      <div className="flex flex-row gap-2">
        <button
          type="button"
          aria-pressed={props.valor === "maider"}
          disabled={props.deshabilitado}
          onClick={() => props.alElegir("maider")}
          className="tappable flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded border px-3 py-2 disabled:opacity-50"
        >
          <span className="font-semibold">{nombreMaider}</span>
          <span className="text-xs">{infoMaider}</span>
        </button>
        <button
          type="button"
          aria-pressed={props.valor === "pater"}
          disabled={props.deshabilitado}
          onClick={() => props.alElegir("pater")}
          className="tappable flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded border px-3 py-2 disabled:opacity-50"
        >
          <span className="font-semibold">{nombrePater}</span>
          <span className="text-xs">{infoPater}</span>
        </button>
      </div>
      <span className="flex items-center gap-2">
        <IconoAyuda tipo="entrenadores" />
      </span>
    </section>
  );
}
