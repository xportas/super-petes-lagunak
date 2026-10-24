"use client";

import { useState } from "react";
import { traducir } from "@/src/lib/i18n";
import { crearJornada } from "../actions";

export function JornadaForm(): React.JSX.Element {
  const [rival, setRival] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState("local");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const tGuardar = traducir("es", "ui.admin.jornadas.guardar");
  const tRival = traducir("es", "ui.admin.jornadas.rival");
  const tHora = traducir("es", "ui.admin.jornadas.hora");
  const tLocal = traducir("es", "ui.admin.jornadas.local_visitante");

  async function enviar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const r = await crearJornada({
        rival,
        horaPartido: hora,
        localVisitante: local,
      });
      if (!r.ok) {
        setError(traducir("es", r.error));
        return;
      }
      setRival("");
      setHora("");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar} className="brutal-card flex w-full flex-col gap-3 p-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{tRival}</span>
        <input
          className="brutal-input"
          value={rival}
          onChange={(ev) => setRival(ev.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{tHora}</span>
        <input
          className="brutal-input"
          type="datetime-local"
          value={hora}
          onChange={(ev) => setHora(ev.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{tLocal}</span>
        <select
          className="brutal-input"
          value={local}
          onChange={(ev) => setLocal(ev.target.value)}
        >
          <option value="local">local</option>
          <option value="visitante">visitante</option>
        </select>
      </label>
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
