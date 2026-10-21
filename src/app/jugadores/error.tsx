"use client";

import { useRouter } from "next/navigation";
import { traducir } from "@/src/lib/i18n";

export default function ErrorJugadores(): React.JSX.Element {
  const router = useRouter();
  const titulo = traducir("es", "errors.carga");
  const reintentar = traducir("es", "errors.reintentar");
  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
      <p role="alert" className="flex min-h-[44px] items-center rounded border px-3 text-sm">
        {titulo}
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="tappable flex min-h-[44px] items-center justify-center rounded border px-3 font-semibold"
      >
        {reintentar}
      </button>
    </main>
  );
}
