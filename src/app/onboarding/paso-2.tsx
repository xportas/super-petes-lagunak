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
    <section className="brutal-card-lg flex flex-col gap-3 p-3">
      <span className="brutal-hazard-bar" aria-hidden="true" />
      <h2 className="brutal-title text-[18px] leading-[22px]">{titulo}</h2>
      <p className="text-sm">{texto}</p>
      <Link
        href={enlace}
        className="tappable brutal-btn brutal-btn-ghost w-full text-sm"
      >
        {enlace}
      </Link>
      <label className="bg-surface-container-low border-on-surface flex min-h-[44px] flex-row items-center gap-2 rounded-lg border-[2px] px-3 shadow-[2px_2px_0px_var(--ink-shadow)]">
        <input
          type="checkbox"
          className="border-on-surface h-6 w-6 rounded border-[2.5px] accent-[#00e676]"
          checked={entendido}
          onChange={(e) => setEntendido(e.target.checked)}
        />
        <span className="text-sm font-semibold">{textoConfirmar}</span>
      </label>
      <button
        type="button"
        onClick={confirmarPaso}
        disabled={!entendido || ocupado}
        className="tappable brutal-btn brutal-btn-primary w-full text-sm disabled:opacity-50"
      >
        {textoConfirmar}
      </button>
      <Link
        href="/onboarding?paso=1"
        className="tappable brutal-btn brutal-btn-ghost w-full text-sm"
      >
        {volver}
      </Link>
    </section>
  );
}
