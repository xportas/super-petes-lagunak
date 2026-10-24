"use client";

import Image from "next/image";
import { traducir } from "@/src/lib/i18n";
import {
  FACTOR_CAPITAN_DEN,
  FACTOR_CAPITAN_NUM,
} from "@/src/lib/scoring/constantes";
import { IconoAyuda } from "./icono-ayuda";
import { IconoBrutal } from "@/src/components/ui/icono-brutal";

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
  const seleccionado = traducir("es", "ui.equipo.entrenador.seleccionado");
  const activo = traducir("es", "ui.equipo.entrenador.activo");
  return (
    <section aria-label={titulo} className="brutal-card-lg flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="brutal-title flex items-center gap-1.5 text-[14px] leading-[18px]">
          <IconoBrutal nombre="entrenador" clase="h-5 w-5" />
          {seleccionado}
        </h2>
        {props.valor !== null ? (
          <span className="brutal-chip brutal-chip-ok">{activo}</span>
        ) : null}
      </div>
      <div className="flex flex-row gap-2">
        <button
          type="button"
          aria-pressed={props.valor === "maider"}
          disabled={props.deshabilitado}
          onClick={() => props.alElegir("maider")}
          className={
            props.valor === "maider"
              ? "tappable bg-primary-container border-on-surface flex min-h-[44px] flex-1 flex-col items-center gap-1 rounded-lg border-[2.5px] px-2 py-2 shadow-[3px_3px_0px_var(--ink-shadow)] disabled:opacity-50"
              : "tappable bg-surface-container-lowest border-on-surface flex min-h-[44px] flex-1 flex-col items-center gap-1 rounded-lg border-[2px] px-2 py-2 shadow-[2px_2px_0px_var(--ink-shadow)] disabled:opacity-50"
          }
        >
          <Image
            src="/coaches/maider.webp"
            alt=""
            width={48}
            height={48}
            className="border-on-surface h-12 w-12 rounded-xl border-[2px] object-cover shadow-[2px_2px_0px_var(--ink-shadow)]"
          />
          <span className="font-display text-sm font-bold uppercase">{nombreMaider}</span>
          <span className="text-center text-xs">{infoMaider}</span>
        </button>
        <button
          type="button"
          aria-pressed={props.valor === "pater"}
          disabled={props.deshabilitado}
          onClick={() => props.alElegir("pater")}
          className={
            props.valor === "pater"
              ? "tappable bg-primary-container border-on-surface flex min-h-[44px] flex-1 flex-col items-center gap-1 rounded-lg border-[2.5px] px-2 py-2 shadow-[3px_3px_0px_var(--ink-shadow)] disabled:opacity-50"
              : "tappable bg-surface-container-lowest border-on-surface flex min-h-[44px] flex-1 flex-col items-center gap-1 rounded-lg border-[2px] px-2 py-2 shadow-[2px_2px_0px_var(--ink-shadow)] disabled:opacity-50"
          }
        >
          <Image
            src="/coaches/pater.webp"
            alt=""
            width={48}
            height={48}
            className="border-on-surface h-12 w-12 rounded-xl border-[2px] object-cover shadow-[2px_2px_0px_var(--ink-shadow)]"
          />
          <span className="font-display text-sm font-bold uppercase">{nombrePater}</span>
          <span className="text-center text-xs">{infoPater}</span>
        </button>
      </div>
      <span className="flex items-center gap-2">
        <IconoAyuda tipo="entrenadores" />
      </span>
    </section>
  );
}
