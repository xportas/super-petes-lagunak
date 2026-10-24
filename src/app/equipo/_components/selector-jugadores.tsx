"use client";

import { useState } from "react";
import Image from "next/image";
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

function normalizarImg(path: string, fallback: string): string {
  if (path.trim().length === 0) {
    return fallback;
  }
  if (path.startsWith("public/")) {
    return `/${path.slice("public/".length)}`;
  }
  if (path.startsWith("/")) {
    return path;
  }
  return `/${path}`;
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
        className="brutal-sheet flex max-h-[80dvh] w-full min-w-[360px] max-w-[430px] flex-col gap-2 overflow-hidden px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="brutal-hazard-bar" aria-hidden="true" />
        <h2 className="brutal-title text-[18px] leading-[22px]">{titulo}</h2>
        <div className="flex flex-row flex-wrap gap-1">
          {FILTROS_POS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={filtro === p}
              onClick={() => setFiltro(p)}
              className={
                filtro === p
                  ? "tappable bg-primary-container border-on-surface flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-[2px] px-2 text-sm font-bold shadow-[2px_2px_0px_var(--ink-shadow)]"
                  : "tappable bg-surface-container-lowest border-on-surface flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-[2px] px-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]"
              }
            >
              {p === "TODOS" ? textoTodos : p}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={soloDisponibles}
          onClick={() => setSoloDisponibles((v) => !v)}
          className={
            soloDisponibles
              ? "tappable bg-secondary-container border-on-surface flex min-h-[44px] items-center rounded-lg border-[2px] px-3 text-sm font-bold shadow-[2px_2px_0px_var(--ink-shadow)]"
              : "tappable bg-surface-container-lowest border-on-surface flex min-h-[44px] items-center rounded-lg border-[2px] px-3 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]"
          }
        >
          {textoSolo}
        </button>
        <ul className="flex flex-col gap-2 overflow-y-auto pb-2" style={{ overscrollBehavior: "contain" }}>
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
            const imgSrc = normalizarImg(
              props.modoPete ? j.imgPete : j.img,
              props.modoPete ? "/players/placeholder-pete.webp" : "/players/placeholder.webp",
            );
            const posiciones =
              j.posicionesValidas === null
                ? ""
                : `[${j.posicionesValidas[0]},${j.posicionesValidas[1]}]`;
            return (
              <li key={j.id}>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => props.alElegir(j.id)}
                  className="tappable bg-surface-container-lowest border-on-surface flex min-h-[44px] w-full items-center gap-2 rounded-xl border-[2px] px-2 py-1.5 text-left shadow-[2px_2px_0px_var(--ink-shadow)] disabled:opacity-50"
                >
                  <Image
                    src={imgSrc}
                    alt=""
                    width={40}
                    height={40}
                    className="border-on-surface h-10 w-10 shrink-0 rounded-full border-[2px] object-cover"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{etiqueta}</span>
                    <span className="text-on-surface-variant text-xs">{posiciones}</span>
                  </span>
                  {ocupado ? <span className="brutal-chip bg-surface-container border-on-surface shrink-0 border-[1.5px] text-xs">{textoOcupado}</span> : null}
                </button>
              </li>
            );
          })}
          {filtrados.length === 0 ? <li className="py-2 text-sm">{textoVacio}</li> : null}
        </ul>
        <button
          type="button"
          onClick={props.alCerrar}
          className="tappable brutal-btn brutal-btn-ghost min-h-[44px] w-full"
        >
          {textoCerrar}
        </button>
      </div>
    </div>
  );
}
