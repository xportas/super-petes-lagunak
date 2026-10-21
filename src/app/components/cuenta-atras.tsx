"use client";

import { useEffect, useState } from "react";
import { traducir } from "@/src/lib/i18n";
import { formatearCuentaAtras } from "@/src/lib/home/resolver-jornada";

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
        className="flex min-h-[44px] items-center"
      >
        {cerradoTexto}
      </span>
    );
  }
  const tiempo = formatearCuentaAtras(resto);
  const texto = traducir("es", "ui.home.cuenta_atras", { time: tiempo });
  return (
    <span
      aria-live="polite"
      suppressHydrationWarning
      className="flex min-h-[44px] items-center"
    >
      {texto}
    </span>
  );
}
