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
      <p className="min-h-[44px] text-sm">{tOrigen}</p>
      <form onSubmit={preRellenar} className="flex gap-2">
        <input
          className="min-h-[44px] flex-1 rounded border px-3 text-base"
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
          className="tappable min-h-[44px] rounded border px-3 text-sm"
        >
          {tPegar}
        </button>
      </form>
      <ul className="flex flex-col gap-2">
        {filas.map((f) => {
          const esNoJugo = f.estado !== "jugo";
          return (
            <li key={f.jugadorId} className="flex flex-col gap-1 rounded border p-2">
              <span className="text-sm">{f.nombre}</span>
              <div className="flex gap-2">
                <select
                  className="min-h-[44px] flex-1 rounded border px-2 text-base"
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
                  className="min-h-[44px] w-20 rounded border px-2 text-base"
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
      {error !== null ? <p role="alert" className="text-sm">{error}</p> : null}
      <button
        type="button"
        disabled={ocupado}
        onClick={guardar}
        className="tappable min-h-[44px] w-full rounded border px-3 text-sm font-semibold"
      >
        {tGuardar}
      </button>
      <button
        type="button"
        disabled={ocupado}
        onClick={reimportar}
        className="tappable min-h-[44px] w-full rounded border px-3 text-sm"
      >
        {tReimportar}
      </button>
    </div>
  );
}
