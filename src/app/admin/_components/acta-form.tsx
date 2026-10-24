"use client";

import { useState } from "react";
import { traducir } from "@/src/lib/i18n";
import { guardarActa, preRellenarActa, reimportarDesdeFnb } from "../actions";

interface FilaEditable {
  readonly jugadorId: string;
  readonly nombre: string;
  valoracion: number;
  estado: "jugo" | "lesionado" | "no_convocado" | "dnp";
}

export function ActaForm(props: {
  readonly jornadaId: string;
  readonly filas: readonly FilaEditable[];
}): React.JSX.Element {
  const [filas, setFilas] = useState<FilaEditable[]>(
    props.filas.map((f) => ({ ...f })),
  );
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const tGuardar = traducir("es", "ui.admin.resultados.confirmar");
  const tOrigen = traducir("es", "ui.admin.resultados.manual");
  const tPegar = traducir("es", "ui.admin.jornadas.pegar_url");
  const tReimportar = traducir("es", "ui.admin.jornadas.reimportar");

  function cambiarEstado(id: string, estado: FilaEditable["estado"]): void {
    setFilas((prev) =>
      prev.map((f) =>
        f.jugadorId === id
          ? { ...f, estado, valoracion: estado === "jugo" ? f.valoracion : 0 }
          : f,
      ),
    );
  }

  function cambiarValoracion(id: string, valor: number): void {
    setFilas((prev) =>
      prev.map((f) => (f.jugadorId === id ? { ...f, valoracion: valor } : f)),
    );
  }

  async function preRellenar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const r = await preRellenarActa(url);
      if (!r.ok) {
        setError(traducir("es", r.error));
        return;
      }
      const pre = r["filas"] as unknown as Array<{
        jugadorId: string;
        valoracion: number;
        estado: FilaEditable["estado"];
      }>;
      setFilas((prev) =>
        prev.map((f) => {
          const hallada = pre.find((p) => p.jugadorId === f.jugadorId);
          if (hallada === undefined) {
            return f;
          }
          return { ...f, valoracion: hallada.valoracion, estado: hallada.estado };
        }),
      );
    } finally {
      setOcupado(false);
    }
  }

  async function guardar(): Promise<void> {
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const r = await guardarActa(
        props.jornadaId,
        filas.map((f) => ({
          jugadorId: f.jugadorId,
          valoracion: f.estado === "jugo" ? f.valoracion : 0,
          estado: f.estado,
          expulsado: false,
        })),
        null,
      );
      if (!r.ok) {
        setError(traducir("es", r.error));
      }
    } finally {
      setOcupado(false);
    }
  }

  async function reimportar(): Promise<void> {
    if (ocupado || !confirmando) {
      setConfirmando(true);
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const r = await reimportarDesdeFnb(props.jornadaId);
      if (!r.ok) {
        setError(traducir("es", r.error));
      }
      setConfirmando(false);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="brutal-chip bg-surface-container border-on-surface w-fit border-[1.5px] text-xs">{tOrigen}</p>
      <form onSubmit={preRellenar} className="brutal-card flex gap-2 p-2">
        <input
          className="brutal-input flex-1"
          value={url}
          onChange={(ev) => setUrl(ev.target.value)}
          placeholder={tPegar}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
        />
        <button
          type="submit"
          disabled={ocupado}
          className="tappable brutal-btn brutal-btn-ghost min-h-[44px] shrink-0 px-3 text-xs disabled:opacity-50"
        >
          {tPegar}
        </button>
      </form>
      <ul className="flex flex-col gap-2">
        {filas.map((f) => {
          const esNoJugo = f.estado !== "jugo";
          return (
            <li key={f.jugadorId} className="brutal-card flex flex-col gap-2 p-2">
              <span className="truncate text-sm font-semibold">{f.nombre}</span>
              <div className="flex gap-2">
                <select
                  className="brutal-input flex-1"
                  value={f.estado}
                  onChange={(ev) =>
                    cambiarEstado(f.jugadorId, ev.target.value as FilaEditable["estado"])
                  }
                >
                  <option value="jugo">jugo</option>
                  <option value="lesionado">lesionado</option>
                  <option value="no_convocado">no_convocado</option>
                  <option value="dnp">dnp</option>
                </select>
                <input
                  className="brutal-input w-20 shrink-0"
                  type="number"
                  step={1}
                  value={f.valoracion}
                  disabled={esNoJugo}
                  onChange={(ev) =>
                    cambiarValoracion(f.jugadorId, Number(ev.target.value))
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
      {error !== null ? (
        <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={ocupado}
        onClick={guardar}
        className="tappable brutal-btn brutal-btn-primary w-full text-sm disabled:opacity-50"
      >
        {tGuardar}
      </button>
      <button
        type="button"
        disabled={ocupado}
        onClick={reimportar}
        className="tappable brutal-btn brutal-btn-ghost w-full text-sm disabled:opacity-50"
      >
        {tReimportar}
      </button>
    </div>
  );
}
