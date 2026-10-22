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
    <div className="flex w-full flex-col gap-3">
      <p className="min-h-[44px] text-sm">{tUnaVez}</p>
      {codigo !== null ? <p className="min-h-[44px] text-sm">{codigo}</p> : null}
      {error !== null ? <p role="alert" className="text-sm">{error}</p> : null}
      <button
        type="button"
        disabled={ocupado}
        onClick={rotar}
        className="tappable min-h-[44px] w-full rounded border px-3 text-sm font-semibold"
      >
        {tRotar}
      </button>
    </div>
  );
}
