"use client";

import { useState } from "react";
import { traducir } from "@/src/lib/i18n";
import { cambiarPassword } from "./actions";

export function CambiarPassword(): React.JSX.Element {
  const resumen = traducir("es", "ui.ajustes.cambiar_password");
  const etiquetaActual = traducir("es", "ui.auth.actual");
  const etiquetaNueva = traducir("es", "ui.auth.nueva");
  const guardar = traducir("es", "ui.auth.guardar");
  const eFormato = traducir("es", "errors.auth.password_formato");
  const eNueva = traducir("es", "errors.auth.nueva_distinta");
  const eTemporal = traducir("es", "errors.auth.temporal_distinta");
  const eCred = traducir("es", "errors.auth.credenciales");
  const eBloqueo = traducir("es", "errors.auth.bloqueado_15m", {
    minutos: 15,
  });
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setError(null);
    setOk(false);
    try {
      if (confirmar.length > 0 && confirmar !== nueva) {
        setError(eFormato);
        return;
      }
      const r = await cambiarPassword({ actual, nueva });
      if (r.ok) {
        setOk(true);
        setActual("");
        setNueva("");
        setConfirmar("");
        return;
      }
      if (r.codigo === "NUEVA_DISTINTA" || r.codigo === "TEMPORAL_DISTINTA") {
        setError(r.codigo === "TEMPORAL_DISTINTA" ? eTemporal : eNueva);
      } else if (r.codigo === "BLOQUEADO") {
        setError(eBloqueo);
      } else if (r.codigo === "CREDENCIALES") {
        setError(eCred);
      } else {
        setError(eFormato);
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <details className="brutal-card w-full">
      <summary className="tappable brutal-title flex min-h-[48px] cursor-pointer items-center px-3 text-[16px] leading-[20px]">
        {resumen}
      </summary>
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-3 border-t-[2px] border-[var(--ink-border)] p-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{etiquetaActual}</span>
          <input
            className="brutal-input"
            name="actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{etiquetaNueva}</span>
          <input
            className="brutal-input"
            name="nueva"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{etiquetaNueva}</span>
          <input
            className="brutal-input"
            name="confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
        </label>
        {error !== null ? (
          <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p role="status" className="brutal-chip brutal-chip-ok w-fit">{guardar}</p>
        ) : null}
        <button
          type="submit"
          disabled={ocupado}
          className="tappable brutal-btn brutal-btn-primary w-full disabled:opacity-50"
        >
          {guardar}
        </button>
      </form>
    </details>
  );
}
