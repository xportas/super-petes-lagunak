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
    <p role="alert" className="min-h-[44px] w-full rounded border px-3 py-3 text-sm">
      {`${texto}: ${props.cantidad} · ${posicion}`}
    </p>
  );
}
