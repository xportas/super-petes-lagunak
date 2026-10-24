"use client";

import { useState } from "react";
import { traducir } from "@/src/lib/i18n";
import { POSICIONES } from "@/src/lib/admin/tipos";
import { upsertJugador } from "../actions";

export function JugadorForm(): React.JSX.Element {
  const [nombre, setNombre] = useState("");
  const [p1, setP1] = useState<string>(POSICIONES[0] as string);
  const [p2, setP2] = useState<string>(POSICIONES[1] as string);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const tGuardar = traducir("es", "ui.admin.jugadores.nuevo");

  async function enviar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const r = await upsertJugador({
        nombre,
        posicionesValidas: [p1, p2],
        estadoSanitario: "disponible",
      });
      if (!r.ok) {
        setError(traducir("es", r.error));
        return;
      }
      setNombre("");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar} className="brutal-card flex w-full flex-col gap-3 p-3">
      <label className="flex flex-col gap-1">
        <input
          className="brutal-input"
          value={nombre}
          onChange={(ev) => setNombre(ev.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>
      <div className="flex gap-2">
        <select
          className="brutal-input flex-1"
          value={p1}
          onChange={(ev) => setP1(ev.target.value)}
        >
          {POSICIONES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="brutal-input flex-1"
          value={p2}
          onChange={(ev) => setP2(ev.target.value)}
        >
          {POSICIONES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      {error !== null ? (
        <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={ocupado}
        className="tappable brutal-btn brutal-btn-primary w-full text-sm disabled:opacity-50"
      >
        {tGuardar}
      </button>
    </form>
  );
}
