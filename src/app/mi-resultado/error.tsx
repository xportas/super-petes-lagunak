"use client";

import { traducir } from "@/src/lib/i18n";

export default function ErrorMiResultado(props: {
  readonly reset: () => void;
}): React.JSX.Element {
  const mensaje = traducir("es", "errors.resultados.bd");
  const reintentar = traducir("es", "ui.comun.reintentar");
  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
      <p role="alert" className="flex min-h-[44px] items-center text-sm">
        {mensaje}
      </p>
      <button
        type="button"
        onClick={() => props.reset()}
        className="tappable flex min-h-[44px] items-center justify-center rounded border px-3 text-sm"
      >
        {reintentar}
      </button>
    </main>
  );
}
