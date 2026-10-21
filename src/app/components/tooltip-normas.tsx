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
        className="tappable flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border px-2 text-sm"
      >
        ?
      </button>
      {abierto ? (
        <span className="ml-2 inline-flex min-h-[44px] items-center rounded border px-2 text-sm">
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
