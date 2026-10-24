"use client";

import { useState } from "react";
import { traducir } from "@/src/lib/i18n";
import { generarTemporal } from "../actions";

export interface UsuarioFila {
  readonly id: string;
  readonly username: string;
  readonly esTemporal: boolean;
}

export function UsuariosTable(props: {
  readonly filas: readonly UsuarioFila[];
}): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [temporal, setTemporal] = useState<string | null>(null);
  const tCopiar = traducir("es", "ui.admin.usuarios.temporal_copiar");

  async function generar(id: string): Promise<void> {
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const r = await generarTemporal(id);
      if (!r.ok) {
        setError(traducir("es", r.error));
        return;
      }
      setTemporal(r["temporal"] as unknown as string);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {props.filas.map((u) => (
          <li key={u.id} className="brutal-card flex min-h-[44px] items-center gap-2 p-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{u.username}</span>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => generar(u.id)}
              className="tappable brutal-btn brutal-btn-ghost min-h-[44px] shrink-0 px-3 text-xs disabled:opacity-50"
            >
              {tCopiar}
            </button>
          </li>
        ))}
      </ul>
      {temporal !== null ? (
        <p className="brutal-chip brutal-chip-ok w-fit tabular-brutal break-all">{temporal}</p>
      ) : null}
      {error !== null ? (
        <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
