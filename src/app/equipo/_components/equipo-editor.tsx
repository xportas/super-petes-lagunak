"use client";

import { useMemo, useState } from "react";
import { traducir } from "@/src/lib/i18n";
import { guardarAlineacion } from "../actions";
import {
  SLOTS_FIJOS,
  validarDraftLocal,
  type SlotPos,
} from "../_lib/validacion-equipo";
import { previewSlot, type JugadorElegibleEquipo } from "../_lib/preview-equipo";
import { SlotJugador } from "./slot-jugador";
import { SelectorJugadores } from "./selector-jugadores";
import { SelectorEntrenador } from "./selector-entrenador";
import { IconoAyuda } from "./icono-ayuda";

export interface InicialEquipo {
  readonly slots: Readonly<Record<SlotPos, string>>;
  readonly entrenador: "maider" | "pater";
  readonly capitan: string;
}

export function EquipoEditor(props: {
  readonly jornadaId: string;
  readonly jugadores: readonly JugadorElegibleEquipo[];
  readonly inicial: InicialEquipo | null;
  readonly rachas: Readonly<Record<string, number>>;
  readonly modoPete: boolean;
  readonly readonly: boolean;
}): React.JSX.Element {
  const [slots, setSlots] = useState<Readonly<Record<SlotPos, string | null>>>(
    () => {
      if (props.inicial === null) {
        return { B: null, E: null, A: null, AP: null, P: null };
      }
      return { ...props.inicial.slots };
    },
  );
  const [entrenador, setEntrenador] = useState<"maider" | "pater" | null>(
    props.inicial?.entrenador ?? null,
  );
  const [capitan, setCapitan] = useState<string | null>(
    props.inicial?.capitan ?? null,
  );
  const [selectorPara, setSelectorPara] = useState<SlotPos | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const porId = useMemo(() => {
    const mapa = new Map<string, JugadorElegibleEquipo>();
    for (const j of props.jugadores) {
      mapa.set(j.id, j);
    }
    return mapa;
  }, [props.jugadores]);

  const plantillaParaValidar = useMemo(() => {
    const mapa = new Map<string, { activo: boolean; nombre: string }>();
    for (const j of props.jugadores) {
      mapa.set(j.id, { activo: j.activo, nombre: j.nombre });
    }
    return mapa;
  }, [props.jugadores]);

  const ocupados = useMemo(() => {
    const mapa: Record<string, SlotPos> = {};
    for (const slot of SLOTS_FIJOS) {
      const id = slots[slot];
      if (id !== null) {
        mapa[id] = slot;
      }
    }
    return mapa;
  }, [slots]);

  const validacion = useMemo(() => {
    if (props.readonly) {
      return {
        puedeGuardar: false,
        motivoKey: "ui.equipo.motivo.cerrado",
        motivoVars: undefined,
      } as const;
    }
    return validarDraftLocal(
      { slots, entrenador, capitan },
      plantillaParaValidar,
    );
  }, [props.readonly, slots, entrenador, capitan, plantillaParaValidar]);

  const motivoTexto = useMemo(() => {
    if (validacion.puedeGuardar || validacion.motivoKey === undefined) {
      return null;
    }
    const locale: string = "es";
    const clave: string = validacion.motivoKey;
    const vars = validacion.motivoVars as
      | Record<string, string | number>
      | undefined;
    return vars === undefined
      ? traducir(locale, clave)
      : traducir(locale, clave, vars);
  }, [validacion]);

  function elegirEnSlot(slot: SlotPos, id: string): void {
    setSlots((prev) => ({ ...prev, [slot]: id }));
    setSelectorPara(null);
    setError(null);
  }

  function vaciarSlot(slot: SlotPos): void {
    setSlots((prev) => {
      const id = prev[slot];
      const siguiente = { ...prev, [slot]: null };
      void siguiente;
      if (id !== null && id === capitan) {
        setCapitan(null);
      }
      return siguiente;
    });
    setError(null);
  }

  function marcarCapitan(id: string): void {
    setCapitan(id);
    setError(null);
  }

  async function guardar(): Promise<void> {
    if (guardando || !validacion.puedeGuardar) {
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const llenos = {} as Record<SlotPos, string>;
      for (const slot of SLOTS_FIJOS) {
        const id = slots[slot];
        if (id === null) {
          setGuardando(false);
          return;
        }
        llenos[slot] = id;
      }
      if (entrenador === null || capitan === null) {
        setGuardando(false);
        return;
      }
      const r = await guardarAlineacion({
        jornadaId: props.jornadaId,
        slots: llenos,
        entrenadorId: entrenador,
        capitanId: capitan,
      });
      if (!r.ok) {
        const locale: string = "es";
        const clave: string = r.error;
        const esI18n =
          clave.startsWith("errors.") || clave.startsWith("ui.");
        setError(
          esI18n
            ? traducir(locale, clave)
            : traducir("es", "errors.equipo.red"),
        );
      }
    } catch {
      setError(traducir("es", "errors.equipo.red"));
    } finally {
      setGuardando(false);
    }
  }

  const textoGuardar = traducir("es", "ui.equipo.guardar");
  const textoGuardando = traducir("es", "ui.equipo.guardando");
  const textoCerrado = traducir("es", "ui.equipo.cerrado");
  const textoEnlaceCierre = traducir("es", "ui.equipo.cerrado_enlace");
  const textoVacio = traducir("es", "ui.equipo.vacio_cerrado");

  const previews = useMemo(() => {
    const mapa = {} as Record<SlotPos, ReturnType<typeof previewSlot>>;
    for (const slot of SLOTS_FIJOS) {
      const id = slots[slot];
      const jugador = id === null ? null : (porId.get(id) ?? null);
      const previa =
        id === null
          ? 0
          : (props.rachas[id] ?? 0);
      mapa[slot] = previewSlot(slot, jugador, previa);
    }
    return mapa;
  }, [slots, porId, props.rachas]);

  const sinEnvio = props.inicial === null;
  return (
    <section aria-label={traducir("es", "ui.equipo.titulo")} className="flex w-full flex-col gap-3">
      {props.readonly ? (
        <div className="flex flex-col gap-2 rounded border px-3 py-3">
          <p role="status" className="flex min-h-[44px] items-center gap-2">
            <span>{textoCerrado}</span>
            <IconoAyuda tipo="cierre" />
          </p>
          <a
            href="/normas#cierre"
            className="tappable flex min-h-[44px] items-center underline"
          >
            {textoEnlaceCierre}
          </a>
          {sinEnvio ? <p className="text-sm">{textoVacio}</p> : null}
        </div>
      ) : null}
      <ul className="flex flex-col gap-2">
        {SLOTS_FIJOS.map((slot) => {
          const id = slots[slot];
          const jugador = id === null ? null : (porId.get(id) ?? null);
          return (
            <SlotJugador
              key={slot}
              slot={slot}
              jugador={jugador}
              preview={previews[slot] as ReturnType<typeof previewSlot>}
              esCapitan={id !== null && id === capitan}
              entrenador={entrenador}
              modoPete={props.modoPete}
              deshabilitado={props.readonly}
              alAbrir={(s) => setSelectorPara(s)}
              alVaciar={vaciarSlot}
              alMarcarCapitan={marcarCapitan}
            />
          );
        })}
      </ul>
      <SelectorEntrenador
        valor={entrenador}
        deshabilitado={props.readonly}
        alElegir={(v) => {
          setEntrenador(v);
          setError(null);
        }}
      />
      {motivoTexto !== null && !props.readonly ? (
        <p role="status" className="min-h-[44px] text-sm">
          {motivoTexto}
        </p>
      ) : null}
      {error !== null ? (
        <p role="alert" className="min-h-[44px] rounded border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      {!props.readonly ? (
        <button
          type="button"
          disabled={!validacion.puedeGuardar || guardando}
          onClick={guardar}
          className="tappable flex min-h-[44px] w-full items-center justify-center rounded border font-semibold disabled:opacity-50"
        >
          {guardando ? textoGuardando : textoGuardar}
        </button>
      ) : null}
      {selectorPara !== null && !props.readonly ? (
        <SelectorJugadores
          slot={selectorPara}
          jugadores={props.jugadores}
          ocupados={ocupados}
          modoPete={props.modoPete}
          alElegir={(id) => elegirEnSlot(selectorPara, id)}
          alCerrar={() => setSelectorPara(null)}
        />
      ) : null}
    </section>
  );
}
