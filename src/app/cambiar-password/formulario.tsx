"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { traducir } from "@/src/lib/i18n";
import { cambiarPassword } from "./actions";
import { cerrarSesion } from "@/src/app/login/actions";

export function FormularioCambiar(): React.JSX.Element {
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const titulo = traducir("es", "ui.auth.cambiar_titulo");
  const etiquetaActual = traducir("es", "ui.auth.actual");
  const etiquetaNueva = traducir("es", "ui.auth.nueva");
  const guardar = traducir("es", "ui.auth.guardar");
  const salir = traducir("es", "ui.auth.cerrar_sesion");
  const eFormato = traducir("es", "errors.auth.password_formato");
  const eNueva = traducir("es", "errors.auth.nueva_distinta");
  const eTemporal = traducir("es", "errors.auth.temporal_distinta");
  const eCred = traducir("es", "errors.auth.credenciales");
  const eBloqueo = traducir("es", "errors.auth.bloqueado_15m", {
    minutos: 15,
  });

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const r = await cambiarPassword({ actual, nueva });
      if (r.ok) {
        router.push(r.retomarOnboarding ? "/onboarding" : "/");
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

  async function salirSesion(): Promise<void> {
    await cerrarSesion();
    router.push("/login");
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col gap-4 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <h1 className="pt-8 text-xl font-bold">{titulo}</h1>
      <form onSubmit={enviar} className="flex flex-col gap-3">
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
        {error !== null ? <p role="alert">{error}</p> : null}
        <button
          type="submit"
          disabled={ocupado}
          className="tappable min-h-[44px] w-full rounded font-semibold"
        >
          {guardar}
        </button>
      </form>
      <button
        type="button"
        onClick={salirSesion}
        className="tappable min-h-[44px] w-full rounded border"
      >
        {salir}
      </button>
    </main>
  );
}
