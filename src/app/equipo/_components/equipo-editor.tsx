"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { traducir } from "@/src/lib/i18n";
import { guardarAlineacion } from "../actions";
import {
  SLOTS_FIJOS,
  validarDraftLocal,
  type SlotPos,
} from "../_lib/validacion-equipo";
import { previewSlot, type JugadorElegibleEquipo } from "../_lib/preview-equipo";
import { BONUS_POSICION } from "@/src/lib/scoring/constantes";
import { SlotJugador } from "./slot-jugador";
import { SelectorJugadores } from "./selector-jugadores";
import { SelectorEntrenador } from "./selector-entrenador";
import { IconoAyuda } from "./icono-ayuda";
import { IconoBrutal } from "@/src/components/ui/icono-brutal";

export interface InicialEquipo {
  readonly slots: Readonly<Record<SlotPos, string>>;
  readonly entrenador: "maider" | "pater";
  readonly capitan: string;
}

const POS_PISTA: Record<SlotPos, string> = {
  B: "left-1/2 bottom-[8%] -translate-x-1/2",
  E: "left-[3%] top-[42%]",
  A: "right-[3%] top-[42%]",
  AP: "left-[12%] top-[7%]",
  P: "right-[12%] top-[7%]",
};

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
  const tituloPista = traducir("es", "ui.equipo.pista.titulo");
  const ayudaPista = traducir("es", "ui.equipo.pista.ayuda");
  const textoCapitan = traducir("es", "ui.equipo.slot.capitan");
  const textoFaltaCapitan = traducir("es", "ui.equipo.motivo.falta_capitan");

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

  const ocupadosCount = SLOTS_FIJOS.filter((s) => slots[s] !== null).length;
  const sinEnvio = props.inicial === null;
  return (
    <section aria-label={traducir("es", "ui.equipo.titulo")} className="flex w-full flex-col gap-4">
      {props.readonly ? (
        <div className="brutal-card flex flex-col gap-2 p-3">
          <p role="status" className="flex min-h-[44px] items-center gap-2">
            <span className="font-display text-sm font-bold uppercase">{textoCerrado}</span>
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
      <div className="brutal-card-lg flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={ocupadosCount === 5 ? "brutal-chip brutal-chip-ok" : "brutal-chip bg-surface-container border-on-surface border-[1.5px]"}>
            <IconoBrutal nombre="check" clase="h-3 w-3" />
            {ocupadosCount}/{SLOTS_FIJOS.length}
          </span>
          <span className={entrenador !== null ? "brutal-chip brutal-chip-ok" : "brutal-chip bg-surface-container border-on-surface border-[1.5px]"}>
            {entrenador !== null ? 1 : 0}/{1}
          </span>
          <span className={capitan !== null ? "brutal-chip brutal-chip-live" : "brutal-chip bg-surface-container border-on-surface border-[1.5px]"}>
            {capitan !== null ? textoCapitan : textoFaltaCapitan}
          </span>
        </div>
      </div>
      <div className="brutal-card-lg flex flex-col p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className="brutal-title flex items-center gap-1.5 text-[16px] leading-[20px]">
            <IconoBrutal nombre="balon" clase="h-5 w-5" />
            {tituloPista} ({SLOTS_FIJOS.length})
          </span>
          <span className="brutal-chip bg-surface-container border-on-surface border-[1.5px]">{ayudaPista}</span>
        </div>
        <div className="bg-surface-container-high border-on-surface relative aspect-[4/5] w-full overflow-hidden rounded-lg border-[2px] p-2 select-none">
          <svg className="stroke-on-surface/30 pointer-events-none absolute inset-0 h-full w-full" fill="none" strokeWidth={2} aria-hidden="true">
            <path d="M 30,0 L 30,120 A 150,150 0 0,0 330,120 L 330,0" vectorEffect="non-scaling-stroke" />
            <rect height="150" width="120" x="120" y="0" vectorEffect="non-scaling-stroke" />
            <circle cx="180" cy="150" r="45" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
            <path d="M 160,25 A 20,20 0 0,0 200,25" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2="360" y1="360" y2="360" vectorEffect="non-scaling-stroke" />
            <path d="M 130,360 A 50,50 0 0,1 230,360" vectorEffect="non-scaling-stroke" />
          </svg>
          {SLOTS_FIJOS.map((slot) => {
            const id = slots[slot];
            const jugador = id === null ? null : (porId.get(id) ?? null);
            const esCap = id !== null && id === capitan;
            const preview = previews[slot] as ReturnType<typeof previewSlot>;
            const nombre =
              jugador === null
                ? slot
                : props.modoPete && jugador.nombrePete !== null
                  ? jugador.nombrePete
                  : jugador.nombre;
            const imgSrc =
              jugador === null
                ? null
                : normalizarImg(
                    props.modoPete ? jugador.imgPete : jugador.img,
                    props.modoPete ? "/players/placeholder-pete.webp" : "/players/placeholder.webp",
                  );
            const miniTexto =
              jugador === null
                ? slot
                : preview.baseCero === "lesionado"
                  ? traducir("es", "ui.equipo.preview.base0_lesion")
                  : preview.baseCero === "inactivo"
                    ? traducir("es", "ui.equipo.preview.base0_baja")
                    : preview.muestraMas5
                      ? traducir("es", "ui.equipo.preview.mas5", { bonus: BONUS_POSICION })
                      : preview.penalizacionRacha !== null
                        ? traducir("es", "ui.equipo.preview.racha", { n: preview.penalizacionRacha })
                        : traducir("es", "ui.equipo.preview.estreno");
            return (
              <button
                key={slot}
                type="button"
                disabled={props.readonly}
                onClick={() => setSelectorPara(slot)}
                aria-label={slot}
                className={`absolute z-10 flex flex-col items-center ${POS_PISTA[slot]}`}
              >
                <span className={`bg-surface-container-lowest border-on-surface relative flex w-24 flex-col items-center rounded-xl border-[2.5px] p-1 shadow-[3px_3px_0px_var(--ink-shadow)] transition-transform active:scale-95 ${id === null ? "opacity-90" : ""}`}>
                  {esCap ? (
                    <span className="brutal-chip brutal-chip-live absolute -top-3 -right-2 shadow-[1px_1px_0px_var(--ink-shadow)]">
                      {textoCapitan}
                    </span>
                  ) : null}
                  <span className="brutal-chip brutal-chip-pos absolute -top-2.5 -left-2">
                    {slot}
                  </span>
                  <span className="bg-surface-container border-on-surface mt-1 mb-1 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-[2px]">
                    {imgSrc === null ? (
                      <IconoBrutal nombre="usuario" clase="h-5 w-5 opacity-60" />
                    ) : (
                      <Image src={imgSrc} alt="" width={44} height={44} className="h-11 w-11 object-cover" />
                    )}
                  </span>
                  <span className="w-full px-0.5 text-center">
                    <span className="font-display block truncate text-[10px] leading-[14px] font-bold uppercase">
                      {jugador === null ? slot : nombre}
                    </span>
                    <span className="font-display block truncate rounded bg-[var(--surface-container)] px-1 py-0.5 text-[10px] leading-[14px] font-bold">
                      {miniTexto}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
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
        <p role="status" className="brutal-card min-h-[44px] px-3 py-2 text-sm">{motivoTexto}</p>
      ) : null}
      {error !== null ? (
        <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface min-h-[44px] rounded-xl border-[2.5px] px-3 py-2 text-sm shadow-[3px_3px_0px_var(--ink-shadow)]">
          {error}
        </p>
      ) : null}
      {!props.readonly ? (
        <button
          type="button"
          disabled={!validacion.puedeGuardar || guardando}
          onClick={guardar}
          className="tappable brutal-btn brutal-btn-primary w-full disabled:opacity-50"
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
