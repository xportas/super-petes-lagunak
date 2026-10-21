"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { traducir } from "@/src/lib/i18n";
import { iniciarSesion } from "./actions";

export function FormularioLogin(): React.JSX.Element {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const titulo = traducir("es", "ui.auth.login_titulo");
  const etiquetaUsuario = traducir("es", "ui.auth.username");
  const etiquetaClave = traducir("es", "ui.auth.password");
  const entrar = traducir("es", "ui.auth.entrar");
  const pedirReset = traducir("es", "ui.auth.pedir_reset");
  const infoReset = traducir("es", "ui.auth.reset_info", {
    username: username.trim().length > 0 ? username.trim() : "-",
  });
  const credenciales = traducir("es", "errors.auth.credenciales");
  const bloqueado = traducir("es", "errors.auth.bloqueado_15m", {
    minutos: 15,
  });

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setCodigo(null);
    try {
      const r = await iniciarSesion({ username, password });
      if (r.ok) {
        router.push("/");
        return;
      }
      setCodigo(r.codigo ?? "CREDENCIALES");
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {codigo === "BLOQUEADO" ? <p role="alert">{bloqueado}</p> : null}
        {codigo !== null && codigo !== "BLOQUEADO" ? (
          <p role="alert">{credenciales}</p>
        ) : null}
        <button
          type="submit"
          disabled={ocupado}
          className="tappable min-h-[44px] w-full rounded font-semibold"
        >
          {entrar}
        </button>
      </form>
      <InformacionReset
        etiqueta={pedirReset}
        texto={infoReset}
      />
    </main>
  );
}

function InformacionReset(props: {
  readonly etiqueta: string;
  readonly texto: string;
}): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="tappable min-h-[44px] w-full rounded border"
      >
        {props.etiqueta}
      </button>
      {visible ? <p>{props.texto}</p> : null}
    </div>
  );
}
