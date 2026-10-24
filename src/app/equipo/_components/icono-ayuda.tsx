"use client";

import { useState } from "react";
import { traducir } from "@/src/lib/i18n";

export type TipoAyuda = "base" | "posicion" | "racha" | "cierre" | "entrenadores";

const ANCLA_POR_TIPO: Readonly<Record<TipoAyuda, string>> = {
  base: "base",
  posicion: "posicion",
  racha: "racha",
  cierre: "cierre",
  entrenadores: "entrenadores",
};

const CLAVE_POR_TIPO = {
  base: "ui.equipo.ayuda.base",
  posicion: "ui.equipo.ayuda.posicion",
  racha: "ui.equipo.ayuda.racha",
  cierre: "ui.equipo.ayuda.cierre",
  entrenadores: "ui.equipo.ayuda.entrenadores",
} as const;

export function IconoAyuda(props: {
  readonly tipo: TipoAyuda;
}): React.JSX.Element {
  const [abierto, setAbierto] = useState(false);
  const clave = CLAVE_POR_TIPO[props.tipo];
  const etiqueta = traducir("es", clave);
  const ancla = ANCLA_POR_TIPO[props.tipo];
  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        aria-expanded={abierto}
        aria-label={etiqueta}
        onClick={() => setAbierto((v) => !v)}
        className="tappable bg-surface-container-lowest border-on-surface flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-[2px] px-2 text-sm font-bold shadow-[2px_2px_0px_var(--ink-shadow)]"
      >
        ?
      </button>
      {abierto ? (
        <span className="bg-surface-container-lowest border-on-surface ml-2 inline-flex min-h-[44px] items-center rounded-lg border-[2px] px-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
          <a
            href={`/normas#${ancla}`}
            className="tappable flex min-h-[44px] items-center underline"
          >
            {etiqueta}
          </a>
        </span>
      ) : null}
    </span>
  );
}
