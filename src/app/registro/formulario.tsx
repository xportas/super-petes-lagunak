"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { traducir } from "@/src/lib/i18n";
import { registrar } from "./actions";

export function FormularioRegistro(): React.JSX.Element {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const titulo = traducir("es", "ui.auth.registro_titulo");
  const etiquetaUsuario = traducir("es", "ui.auth.username");
  const etiquetaClave = traducir("es", "ui.auth.password");
  const etiquetaCodigo = traducir("es", "ui.auth.codigo_invitacion");
  const crear = traducir("es", "ui.auth.crear_cuenta");
  const eInvitacion = traducir("es", "errors.auth.invitacion");
  const eFormato = traducir("es", "errors.auth.username_formato");
  const eDuplicado = traducir("es", "errors.auth.username_duplicado");
  const eClave = traducir("es", "errors.auth.password_formato");
  const eBloqueo = traducir("es", "errors.auth.bloqueado_15m", { minutos: 15 });

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const r = await registrar({ username, password, codigo });
      if (r.ok) {
        router.push("/onboarding");
        return;
      }
      if (r.codigo === "INVITACION") {
        setError(eInvitacion);
      } else if (r.codigo === "USERNAME") {
        const v = username.trim();
        setError(
          v.length >= 3 &&
            v.length <= 20 &&
            /^[A-Za-z0-9_-]+$/.test(v)
            ? eDuplicado
            : eFormato,
        );
      } else if (r.codigo === "PASSWORD") {
        setError(eClave);
      } else {
        setError(eBloqueo);
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col gap-4 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <h1 className="pt-8 text-xl font-bold">{titulo}</h1>
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span>{etiquetaUsuario}</span>
          <input
            className="min-h-[44px] w-full rounded border px-3"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>{etiquetaClave}</span>
          <input
            className="min-h-[44px] w-full rounded border px-3"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>{etiquetaCodigo}</span>
          <input
            className="min-h-[44px] w-full rounded border px-3"
            name="codigo"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </label>
        {error !== null ? <p role="alert">{error}</p> : null}
        <button
          type="submit"
          disabled={ocupado}
          className="tappable min-h-[44px] w-full rounded font-semibold"
        >
          {crear}
        </button>
      </form>
    </main>
  );
}
