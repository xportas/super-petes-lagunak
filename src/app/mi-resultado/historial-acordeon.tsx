"use client";

import { useState } from "react";
import type { ReactNode } from "react";

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
          <li key={f.id} className="w-full rounded border">
            <button
              type="button"
              aria-expanded={abierta}
              onClick={() =>
                setAbiertaId((actual) => (actual === f.id ? null : f.id))
              }
              className="tappable flex min-h-[44px] w-full items-center px-3 py-2 text-left text-sm"
            >
              <span className="flex-1">{f.titulo}</span>
            </button>
            {abierta ? (
              <div className="border-t px-3 py-2">{f.contenido}</div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
