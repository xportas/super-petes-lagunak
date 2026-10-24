"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
  const sinCuenta = traducir("es", "ui.auth.sin_cuenta");
  const crearCuenta = traducir("es", "ui.auth.crear_cuenta");
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
      <section className="brutal-card-lg mt-8 flex flex-col gap-3 p-4">
        <span className="brutal-hazard-bar" aria-hidden="true" />
        <span className="flex items-center gap-2">
          <Image
            src="/players/escudo-lgnk.jpg"
            alt=""
            width={48}
            height={48}
            className="border-on-surface h-12 w-12 rounded-xl border-[2px] object-cover shadow-[2px_2px_0px_var(--ink-shadow)]"
            priority
          />
          <span className="brutal-title text-[22px] leading-[26px]">{titulo}</span>
        </span>
        <form onSubmit={enviar} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{etiquetaUsuario}</span>
            <input
              className="brutal-input"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{etiquetaClave}</span>
            <input
              className="brutal-input"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {codigo === "BLOQUEADO" ? (
            <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
              {bloqueado}
            </p>
          ) : null}
          {codigo !== null && codigo !== "BLOQUEADO" ? (
            <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
              {credenciales}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={ocupado}
            className="tappable brutal-btn brutal-btn-primary w-full disabled:opacity-50"
          >
            {entrar}
          </button>
        </form>
      </section>
      <div className="brutal-card flex flex-col gap-2 p-3">
        <p className="text-center text-sm font-semibold">{sinCuenta}</p>
        <Link
          href="/registro"
          className="tappable brutal-btn brutal-btn-secondary w-full text-sm"
        >
          {crearCuenta}
        </Link>
      </div>
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
    <div className="brutal-card flex flex-col gap-2 p-3">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="tappable brutal-btn brutal-btn-ghost w-full text-sm"
      >
        {props.etiqueta}
      </button>
      {visible ? <p className="text-sm">{props.texto}</p> : null}
    </div>
  );
}
