"use client";

import { useState } from "react";
import { traducir } from "@/src/lib/i18n";
import type { JugadorElegibleEquipo } from "../_lib/preview-equipo";
import type { SlotPos } from "../_lib/validacion-equipo";
import type { Posicion } from "@/src/lib/scoring/tipos";

const FILTROS_POS: ReadonlyArray<Posicion | "TODOS"> = [
  "TODOS",
  "B",
  "E",
  "A",
  "AP",
  "P",
];

function coincideFiltroPos(
  j: JugadorElegibleEquipo,
  filtro: Posicion | "TODOS",
): boolean {
  if (filtro === "TODOS") {
    return true;
  }
  const validas = j.posicionesValidas;
  if (validas === null) {
    return false;
  }
  const esExterior = (p: string): boolean => p === "E" || p === "A";
  if (filtro === "E" || filtro === "A") {
    return validas.some((v) => esExterior(v));
  }
  return validas.includes(filtro);
}

export function SelectorJugadores(props: {
  readonly slot: SlotPos;
  readonly jugadores: readonly JugadorElegibleEquipo[];
  readonly ocupados: Readonly<Record<string, SlotPos>>;
  readonly modoPete: boolean;
  readonly alElegir: (id: string) => void;
  readonly alCerrar: () => void;
}): React.JSX.Element {
  const [filtro, setFiltro] = useState<Posicion | "TODOS">("TODOS");
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const titulo = traducir("es", "ui.equipo.selector.titulo", {
    slot: props.slot,
  });
  const textoTodos = traducir("es", "ui.equipo.selector.filtro_todos");
  const textoSolo = traducir("es", "ui.equipo.selector.solo_disponibles");
  const textoVacio = traducir("es", "ui.equipo.selector.vacio");
  const textoCerrar = traducir("es", "ui.equipo.selector.cerrar");
  const elegibles = props.jugadores.filter(
    (j) => j.activo && j.posicionesValidas !== null,
  );
  const filtrados = elegibles.filter((j) => {
    if (!coincideFiltroPos(j, filtro)) {
      return false;
    }
    if (soloDisponibles && j.estadoSanitario !== "disponible") {
      return false;
    }
    return true;
  });
  return (
    <div
      role="dialog"
      aria-label={titulo}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={props.alCerrar}
    >
      <div
        className="flex max-h-[80dvh] w-full min-w-[360px] max-w-[430px] flex-col gap-2 overflow-hidden rounded-t-2xl bg-[var(--background)] px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <div className="flex flex-row flex-wrap gap-1">
          {FILTROS_POS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={filtro === p}
              onClick={() => setFiltro(p)}
              className="tappable flex min-h-[44px] min-w-[44px] items-center justify-center rounded border px-2"
            >
              {p === "TODOS" ? textoTodos : p}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={soloDisponibles}
          onClick={() => setSoloDisponibles((v) => !v)}
          className="tappable flex min-h-[44px] items-center rounded border px-3"
        >
          {textoSolo}
        </button>
        <ul className="flex flex-col gap-1 overflow-y-auto pb-2">
          {filtrados.map((j) => {
            const ocupadoEn = props.ocupados[j.id];
            const ocupado = ocupadoEn !== undefined;
            const etiqueta =
              props.modoPete && j.nombrePete !== null ? j.nombrePete : j.nombre;
            const textoOcupado =
              ocupadoEn === undefined
                ? ""
                : traducir("es", "ui.equipo.selector.ocupado", {
                    slot: ocupadoEn,
                  });
            return (
              <li key={j.id}>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => props.alElegir(j.id)}
                  className="tappable flex min-h-[44px] w-full items-center justify-between gap-2 rounded border px-3 text-left disabled:opacity-50"
                >
                  <span>{etiqueta}</span>
                  {ocupado ? <span className="text-xs">{textoOcupado}</span> : null}
                </button>
              </li>
            );
          })}
          {filtrados.length === 0 ? <li className="py-2 text-sm">{textoVacio}</li> : null}
        </ul>
        <button
          type="button"
          onClick={props.alCerrar}
          className="tappable flex min-h-[44px] items-center justify-center rounded border font-semibold"
        >
          {textoCerrar}
        </button>
      </div>
    </div>
  );
}
