"use client";

import { useEffect, useState } from "react";
import { traducir } from "@/src/lib/i18n";
import { formatearCuentaAtras } from "@/src/lib/home/resolver-jornada";
import { IconoBrutal } from "@/src/components/ui/icono-brutal";

export function CuentaAtras(props: {
  readonly cierreIso: string;
}): React.JSX.Element {
  const [ahora, setAhora] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      setAhora(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  const cerradoTexto = traducir("es", "ui.home.cerrado");
  const cierreMs = new Date(props.cierreIso).getTime();
  const resto = cierreMs - ahora;
  if (!Number.isFinite(cierreMs) || resto <= 0) {
    return (
      <span
        aria-live="polite"
        suppressHydrationWarning
        className="flex min-h-[44px] items-center gap-2"
      >
        <span
          aria-hidden="true"
          className="bg-tertiary inline-block h-2.5 w-2.5 rounded-full"
        />
        <span className="font-display text-[12px] font-bold tracking-[0.06em] uppercase">
          {cerradoTexto}
        </span>
      </span>
    );
  }
  const tiempo = formatearCuentaAtras(resto);
  const texto = traducir("es", "ui.home.cuenta_atras", { time: tiempo });
  return (
    <span
      aria-live="polite"
      suppressHydrationWarning
      className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 border-b-[2px] border-[var(--ink-border)] pb-2"
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="bg-secondary inline-block h-2.5 w-2.5 animate-pulse rounded-full"
        />
        <span className="font-display text-[12px] font-bold tracking-[0.06em] uppercase">
          {texto}
        </span>
      </span>
      <span className="brutal-chip brutal-chip-live tabular-brutal">
        <IconoBrutal nombre="rayo" clase="h-3 w-3" />
        {tiempo}
      </span>
    </span>
  );
}
