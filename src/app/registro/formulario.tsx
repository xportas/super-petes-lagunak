"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
  const conCuenta = traducir("es", "ui.auth.con_cuenta");
  const entrar = traducir("es", "ui.auth.entrar");
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{etiquetaCodigo}</span>
            <input
              className="brutal-input"
              name="codigo"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </label>
          {error !== null ? (
            <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={ocupado}
            className="tappable brutal-btn brutal-btn-primary w-full disabled:opacity-50"
          >
            {crear}
          </button>
        </form>
      </section>
      <div className="brutal-card flex flex-col gap-2 p-3">
        <p className="text-center text-sm font-semibold">{conCuenta}</p>
        <Link
          href="/login"
          className="tappable brutal-btn brutal-btn-secondary w-full text-sm"
        >
          {entrar}
        </Link>
      </div>
    </main>
  );
}
