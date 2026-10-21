"use client";

import { traducir } from "@/src/lib/i18n";
import type {
  JugadorElegibleEquipo,
  PreviewSlot,
} from "../_lib/preview-equipo";
import type { SlotPos } from "../_lib/validacion-equipo";
import { PreviewModificadores } from "./preview-modificadores";

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
  return (
    <li className="flex flex-col gap-1 rounded border px-3 py-2">
      <div className="flex min-h-[44px] flex-row items-center justify-between gap-2">
        <span className="font-semibold" aria-hidden="true">
          {slot}
        </span>
        <span className="flex-1 text-left">{nombre}</span>
        {props.esCapitan ? (
          <span aria-label={textoEsCapitan} className="text-sm font-bold">
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
          className="tappable flex min-h-[44px] flex-1 items-center justify-center rounded border px-3 disabled:opacity-50"
        >
          {jugador === null ? nombre : textoCambiar}
        </button>
        {jugador !== null ? (
          <button
            type="button"
            disabled={props.deshabilitado}
            onClick={() => props.alVaciar(slot)}
            className="tappable flex min-h-[44px] items-center justify-center rounded border px-3 disabled:opacity-50"
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
            className="tappable flex min-h-[44px] items-center justify-center rounded border px-3 disabled:opacity-50"
          >
            {textoCapitan}
          </button>
        ) : null}
      </div>
    </li>
  );
}
