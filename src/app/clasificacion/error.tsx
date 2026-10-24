"use client";

import { traducir } from "@/src/lib/i18n";

export default function ErrorClasificacion(props: {
  readonly reset: () => void;
}): React.JSX.Element {
  const mensaje = traducir("es", "errors.resultados.bd");
  const reintentar = traducir("es", "ui.comun.reintentar");
  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-4 pb-28">
      <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface flex min-h-[44px] items-center rounded-xl border-[2.5px] px-3 text-sm font-bold shadow-[3px_3px_0px_var(--ink-shadow)]">
        {mensaje}
      </p>
      <button
        type="button"
        onClick={() => props.reset()}
        className="tappable brutal-btn brutal-btn-primary w-full text-sm"
      >
        {reintentar}
      </button>
    </main>
  );
}
