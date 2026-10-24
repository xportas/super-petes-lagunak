"use client";

import { useState } from "react";
import { traducir } from "@/src/lib/i18n";

export function TooltipNormas(props: {
  readonly ancla: "base" | "racha";
}): React.JSX.Element {
  const [abierto, setAbierto] = useState(false);
  const clave =
    props.ancla === "base"
      ? ("ui.equipo.ayuda.base" as const)
      : ("ui.equipo.ayuda.racha" as const);
  const etiqueta = traducir("es", clave);
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
            href={`/normas#${props.ancla}`}
            className="tappable flex min-h-[44px] items-center underline"
          >
            {etiqueta}
          </a>
        </span>
      ) : null}
    </span>
  );
}
