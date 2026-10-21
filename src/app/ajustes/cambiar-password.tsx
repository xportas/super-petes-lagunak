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
    <details className="w-full rounded border">
      <summary className="tappable flex min-h-[44px] cursor-pointer items-center px-3">
        {resumen}
      </summary>
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-3 p-3">
        <label className="flex flex-col gap-1">
          <span>{etiquetaActual}</span>
          <input
            className="min-h-[44px] w-full rounded border px-3"
            name="actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>{etiquetaNueva}</span>
          <input
            className="min-h-[44px] w-full rounded border px-3"
            name="nueva"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>{etiquetaNueva}</span>
          <input
            className="min-h-[44px] w-full rounded border px-3"
            name="confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
        </label>
        {error !== null ? <p role="alert">{error}</p> : null}
        {ok ? <p role="status">{guardar}</p> : null}
        <button
          type="submit"
          disabled={ocupado}
          className="tappable min-h-[44px] w-full rounded font-semibold"
        >
          {guardar}
        </button>
      </form>
    </details>
  );
}
