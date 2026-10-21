"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { traducir } from "@/src/lib/i18n";
import { HORAS_CIERRE } from "@/src/lib/scoring/constantes";
import { confirmarPaso2 } from "./actions";

export function Paso2(): React.JSX.Element {
  const router = useRouter();
  const [entendido, setEntendido] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const titulo = traducir("es", "ui.onboarding.paso2_titulo");
  const texto = traducir("es", "ui.onboarding.paso2_texto", {
    horas: HORAS_CIERRE,
  });
  const enlace = traducir("es", "ui.onboarding.paso2_enlace");
  const textoConfirmar = traducir("es", "ui.onboarding.confirmar");
  const volver = traducir("es", "ui.onboarding.volver_paso1");

  async function confirmarPaso(): Promise<void> {
    if (ocupado || !entendido) {
      return;
    }
    setOcupado(true);
    try {
      const r = await confirmarPaso2({ entendido: true });
      if (r.ok) {
        router.push("/");
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p>{texto}</p>
      <Link
        href={enlace}
        className="tappable flex min-h-[44px] items-center justify-center rounded border"
      >
        {enlace}
      </Link>
      <label className="flex min-h-[44px] flex-row items-center gap-2">
        <input
          type="checkbox"
          className="h-[24px] w-[24px]"
          checked={entendido}
          onChange={(e) => setEntendido(e.target.checked)}
        />
        <span>{textoConfirmar}</span>
      </label>
      <button
        type="button"
        onClick={confirmarPaso}
        disabled={!entendido || ocupado}
        className="tappable min-h-[44px] w-full rounded font-semibold"
      >
        {textoConfirmar}
      </button>
      <Link
        href="/onboarding?paso=1"
        className="tappable flex min-h-[44px] items-center justify-center rounded border"
      >
        {volver}
      </Link>
    </section>
  );
}
