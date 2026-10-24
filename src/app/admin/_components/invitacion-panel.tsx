"use client";

import { useState } from "react";
import { traducir } from "@/src/lib/i18n";
import { rotarInvitacion } from "../actions";

export function InvitacionPanel(props: {
  readonly vigente: string | null;
}): React.JSX.Element {
  const [codigo, setCodigo] = useState<string | null>(props.vigente);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tRotar = traducir("es", "ui.admin.usuarios.invitacion_rotar");
  const tUnaVez = traducir("es", "ui.admin.usuarios.mostrar_una_vez");

  async function rotar(): Promise<void> {
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const r = await rotarInvitacion();
      if (!r.ok) {
        setError(traducir("es", r.error));
        return;
      }
      setCodigo(r["codigo"] as unknown as string);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="brutal-card flex w-full flex-col gap-3 p-3">
      <p className="min-h-[44px] text-sm">{tUnaVez}</p>
      {codigo !== null ? (
        <p className="brutal-chip brutal-chip-live tabular-brutal w-fit break-all">{codigo}</p>
      ) : null}
      {error !== null ? (
        <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={ocupado}
        onClick={rotar}
        className="tappable brutal-btn brutal-btn-primary w-full text-sm disabled:opacity-50"
      >
        {tRotar}
      </button>
    </div>
  );
}
