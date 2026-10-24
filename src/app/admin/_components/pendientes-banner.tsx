"use client";

import { traducir } from "@/src/lib/i18n";

export function PendientesBanner(props: {
  readonly cantidad: number;
}): React.JSX.Element | null {
  if (props.cantidad === 0) {
    return null;
  }
  const texto = traducir("es", "ui.admin.jugadores.pendientes");
  const posicion = traducir("es", "ui.admin.jugadores.posicion_pendiente");
  return (
    <p role="alert" className="bg-primary-container text-on-primary-fixed border-on-surface min-h-[44px] w-full rounded-xl border-[2.5px] px-3 py-3 text-sm font-bold shadow-[3px_3px_0px_var(--ink-shadow)]">
      {`${texto}: ${props.cantidad} · ${posicion}`}
    </p>
  );
}
