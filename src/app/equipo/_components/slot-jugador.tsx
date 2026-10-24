"use client";

import Image from "next/image";
import { traducir } from "@/src/lib/i18n";
import type {
  JugadorElegibleEquipo,
  PreviewSlot,
} from "../_lib/preview-equipo";
import type { SlotPos } from "../_lib/validacion-equipo";
import { PreviewModificadores } from "./preview-modificadores";

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

export function SlotJugador(props: {
  readonly slot: SlotPos;
  readonly jugador: JugadorElegibleEquipo | null;
  readonly preview: PreviewSlot;
  readonly esCapitan: boolean;
  readonly entrenador: "maider" | "pater" | null;
  readonly modoPete: boolean;
  readonly deshabilitado: boolean;
  readonly alAbrir: (slot: SlotPos) => void;
  readonly alVaciar: (slot: SlotPos) => void;
  readonly alMarcarCapitan: (id: string) => void;
}): React.JSX.Element {
  const { slot, jugador } = props;
  const nombre =
    jugador === null
      ? traducir("es", "ui.equipo.slot.vacio", { slot })
      : props.modoPete && jugador.nombrePete !== null
        ? jugador.nombrePete
        : jugador.nombre;
  const textoCambiar = traducir("es", "ui.equipo.slot.cambiar");
  const textoVaciar = traducir("es", "ui.equipo.slot.vaciar");
  const textoCapitan = traducir("es", "ui.equipo.slot.capitan");
  const textoEsCapitan = traducir("es", "ui.equipo.slot.es_capitan");
  const imgSrc =
    jugador === null
      ? null
      : normalizarImg(
          props.modoPete ? jugador.imgPete : jugador.img,
          props.modoPete ? "/players/placeholder-pete.webp" : "/players/placeholder.webp",
        );
  return (
    <li className="brutal-card flex flex-col gap-2 p-3">
      <div className="flex min-h-[44px] flex-row items-center gap-2">
        <span aria-hidden="true" className="brutal-chip brutal-chip-pos shrink-0">
          {slot}
        </span>
        {imgSrc !== null ? (
          <Image
            src={imgSrc}
            alt=""
            width={44}
            height={44}
            className="border-on-surface h-11 w-11 shrink-0 rounded-full border-[2px] object-cover"
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-left font-semibold">{nombre}</span>
        {props.esCapitan ? (
          <span aria-label={textoEsCapitan} className="brutal-chip brutal-chip-live shrink-0">
            {textoCapitan}
          </span>
        ) : null}
      </div>
      {jugador !== null ? (
        <PreviewModificadores
          preview={props.preview}
          entrenador={props.entrenador}
        />
      ) : null}
      <div className="flex flex-row flex-wrap gap-2">
        <button
          type="button"
          disabled={props.deshabilitado}
          onClick={() => props.alAbrir(slot)}
          className="tappable brutal-btn brutal-btn-ghost min-h-[44px] flex-1 px-3 text-sm disabled:opacity-50"
        >
          {jugador === null ? nombre : textoCambiar}
        </button>
        {jugador !== null ? (
          <button
            type="button"
            disabled={props.deshabilitado}
            onClick={() => props.alVaciar(slot)}
            className="tappable brutal-btn brutal-btn-ghost min-h-[44px] px-3 text-sm disabled:opacity-50"
          >
            {textoVaciar}
          </button>
        ) : null}
        {jugador !== null && !props.esCapitan ? (
          <button
            type="button"
            disabled={props.deshabilitado}
            onClick={() => props.alMarcarCapitan(jugador.id)}
            aria-pressed={false}
            className="tappable brutal-btn brutal-btn-secondary min-h-[44px] px-3 text-sm disabled:opacity-50"
          >
            {textoCapitan}
          </button>
        ) : null}
      </div>
    </li>
  );
}
