"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { IconoBrutal } from "@/src/components/ui/icono-brutal";

export interface FilaAcordeon {
  readonly id: string;
  readonly titulo: string;
  readonly contenido: ReactNode;
}

export function HistorialAcordeon(props: {
  readonly filas: readonly FilaAcordeon[];
}): React.JSX.Element {
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  return (
    <ul className="flex w-full flex-col gap-2">
      {props.filas.map((f) => {
        const abierta = abiertaId === f.id;
        return (
          <li key={f.id} className="brutal-card w-full">
            <button
              type="button"
              aria-expanded={abierta}
              onClick={() =>
                setAbiertaId((actual) => (actual === f.id ? null : f.id))
              }
              className="tappable flex min-h-[48px] w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold"
            >
              <span className="min-w-0 flex-1 truncate">{f.titulo}</span>
              <IconoBrutal
                nombre={abierta ? "cerrar" : "cambio"}
                clase={`h-4 w-4 shrink-0 transition-transform ${abierta ? "rotate-90" : ""}`}
              />
            </button>
            {abierta ? (
              <div className="border-t-[2px] border-[var(--ink-border)] px-3 py-2">{f.contenido}</div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
