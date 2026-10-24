"use client";

import { useSyncExternalStore } from "react";
import { traducir } from "@/src/lib/i18n";
import { parsearModoPete } from "@/src/lib/preferencias/cookies";
import type { ModoPete } from "@/src/lib/preferencias/tipos";

function leerPeteCliente(): ModoPete {
  try {
    if (typeof document === "undefined") {
      return "0";
    }
    const coincidencia = document.cookie.match(
      /(?:^|;\s*)modo_pete=([^;]*)/,
    );
    const crudo = coincidencia
      ? decodeURIComponent(coincidencia[1] ?? "")
      : null;
    return parsearModoPete(crudo);
  } catch {
    return "0";
  }
}

function suscribirNada(): () => void {
  return () => undefined;
}

function fotoPete(): ModoPete {
  return "0";
}

export function EjemploPete(): React.JSX.Element {
  const pete = useSyncExternalStore(
    suscribirNada,
    leerPeteCliente,
    fotoPete,
  );
  const nota = traducir("es", "ui.normas.nota_pete");
  const nombre =
    pete === "1"
      ? traducir("es", "ui.normas.ejemplo_nombre_pete")
      : traducir("es", "ui.normas.ejemplo_nombre");
  const src =
    pete === "1"
      ? "/players/placeholder-pete.webp"
      : "/players/placeholder.webp";
  return (
    <section aria-label={nota} className="brutal-card flex flex-col gap-2 p-3">
      <p className="text-sm">{nota}</p>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={64}
          height={64}
          className="border-on-surface h-16 w-16 rounded-xl border-[2px] object-cover shadow-[2px_2px_0px_var(--ink-shadow)]"
        />
        <span className="font-display flex min-h-[44px] items-center text-[16px] leading-[20px] font-bold uppercase">{nombre}</span>
      </div>
    </section>
  );
}
