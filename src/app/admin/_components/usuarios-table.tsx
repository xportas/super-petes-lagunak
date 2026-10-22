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
          <li key={u.id} className="flex min-h-[44px] items-center gap-2 rounded border px-3 py-2">
            <span className="flex-1 text-sm">{u.username}</span>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => generar(u.id)}
              className="tappable min-h-[44px] rounded border px-3 text-sm"
            >
              {tCopiar}
            </button>
          </li>
        ))}
      </ul>
      {temporal !== null ? <p className="min-h-[44px] text-sm">{temporal}</p> : null}
      {error !== null ? <p role="alert" className="text-sm">{error}</p> : null}
    </div>
  );
}
