"use client";

import { useRouter } from "next/navigation";
import { traducir } from "@/src/lib/i18n";

export default function ErrorFicha(): React.JSX.Element {
  const router = useRouter();
  const titulo = traducir("es", "errors.carga");
  const reintentar = traducir("es", "errors.reintentar");
  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-4 pb-28">
      <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface flex min-h-[44px] items-center rounded-xl border-[2.5px] px-3 text-sm font-bold shadow-[3px_3px_0px_var(--ink-shadow)]">
        {titulo}
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="tappable brutal-btn brutal-btn-primary w-full text-sm"
      >
        {reintentar}
      </button>
    </main>
  );
}
