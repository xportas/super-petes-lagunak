"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { traducir } from "@/src/lib/i18n";
import { guardarQuintetoOnboarding } from "./actions";

export interface JugadorElegible {
  readonly id: string;
  readonly nombre: string;
  readonly nombrePete: string | null;
}

export function Paso1(props: {
  readonly jugadores: readonly JugadorElegible[];
  readonly precarga: {
    readonly jugadorIds: readonly string[];
    readonly posicionPorJugador: Readonly<Record<string, string>>;
    readonly entrenador: string;
    readonly capitanId: string;
  } | null;
  readonly modo: "requerido" | "sin_jornada" | "cierre_pasado" | "listo";
  readonly modoPete: boolean;
}): React.JSX.Element {
  const titulo = traducir("es", "ui.onboarding.paso1_titulo");
  const sinJornada = traducir("es", "ui.onboarding.paso1_sin_jornada");
  const cierrePasado = traducir("es", "ui.onboarding.paso1_cierre_pasado");
  const irPaso2 = traducir("es", "ui.onboarding.ir_paso2");
  const eCierre = traducir("es", "errors.close.passed");
  if (props.modo !== "requerido") {
    const texto = props.modo === "cierre_pasado" ? cierrePasado : sinJornada;
    return (
      <section className="brutal-card flex flex-col gap-3 p-3">
        <h2 className="brutal-title text-[18px] leading-[22px]">{titulo}</h2>
        <p className="text-sm">{texto}</p>
        <Link
          href="/onboarding?paso=2"
          className="tappable brutal-btn brutal-btn-primary w-full text-sm"
        >
          {irPaso2}
        </Link>
      </section>
    );
  }
  return (
    <SelectorQuinteto
      jugadores={props.jugadores}
      precarga={props.precarga}
      modoPete={props.modoPete}
      textoCierre={eCierre}
    />
  );
}

const POSICIONES = ["B", "E", "A", "AP", "P"] as const;

function SelectorQuinteto(props: {
  readonly jugadores: readonly JugadorElegible[];
  readonly precarga: {
    readonly jugadorIds: readonly string[];
    readonly posicionPorJugador: Readonly<Record<string, string>>;
    readonly entrenador: string;
    readonly capitanId: string;
  } | null;
  readonly modoPete: boolean;
  readonly textoCierre: string;
}): React.JSX.Element {
  const [seleccion, setSeleccion] = useState<readonly string[]>(
    props.precarga?.jugadorIds ?? [],
  );
  const [posiciones, setPosiciones] = useState<Readonly<Record<string, string>>>(
    props.precarga?.posicionPorJugador ?? {},
  );
  const [entrenador, setEntrenador] = useState<string>(
    props.precarga?.entrenador ?? "maider",
  );
  const [capitan, setCapitan] = useState<string>(
    props.precarga?.capitanId ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const router = useRouter();
  const irPaso2 = traducir("es", "ui.onboarding.ir_paso2");

  function alternar(id: string): void {
    if (seleccion.includes(id)) {
      setSeleccion(seleccion.filter((x) => x !== id));
      if (capitan === id) {
        setCapitan("");
      }
      return;
    }
    if (seleccion.length >= 5) {
      return;
    }
    setSeleccion([...seleccion, id]);
  }

  async function guardar(): Promise<void> {
    if (ocupado) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const r = await guardarQuintetoOnboarding({
        jugadorIds: [...seleccion],
        posicionPorJugador: { ...posiciones },
        entrenador,
        capitanId: capitan,
      });
      if (r.ok) {
        router.push("/onboarding?paso=2");
        return;
      }
      setError(props.textoCierre);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="brutal-card flex flex-col gap-3 p-3">
      <ul className="flex flex-col gap-2">
        {props.jugadores.map((j) => {
          const activo = seleccion.includes(j.id);
          const etiqueta =
            props.modoPete && j.nombrePete !== null ? j.nombrePete : j.nombre;
          return (
            <li key={j.id} className="bg-surface-container-low border-on-surface rounded-xl border-[2px] p-2 shadow-[2px_2px_0px_var(--ink-shadow)]">
              <button
                type="button"
                onClick={() => alternar(j.id)}
                aria-pressed={activo}
                className={
                  activo
                    ? "tappable bg-primary-container border-on-surface min-h-[44px] w-full rounded-lg border-[2px] px-3 text-left text-sm font-bold shadow-[2px_2px_0px_var(--ink-shadow)]"
                    : "tappable bg-surface-container-lowest border-on-surface min-h-[44px] w-full rounded-lg border-[2px] px-3 text-left text-sm shadow-[2px_2px_0px_var(--ink-shadow)]"
                }
              >
                {etiqueta}
              </button>
              {activo ? (
                <div className="flex flex-row flex-wrap gap-1 pt-2">
                  {POSICIONES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        setPosiciones({ ...posiciones, [j.id]: p })
                      }
                      aria-pressed={posiciones[j.id] === p}
                      className={
                        posiciones[j.id] === p
                          ? "tappable bg-secondary-container border-on-surface flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-[2px] px-2 text-sm font-bold shadow-[2px_2px_0px_var(--ink-shadow)]"
                          : "tappable bg-surface-container-lowest border-on-surface flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-[2px] px-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]"
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-row gap-2">
        {(["maider", "pater"] as const).map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEntrenador(e)}
            aria-pressed={entrenador === e}
            className={
              entrenador === e
                ? "tappable bg-primary-container border-on-surface min-h-[44px] flex-1 rounded-lg border-[2.5px] px-2 text-sm font-bold shadow-[3px_3px_0px_var(--ink-shadow)]"
                : "tappable bg-surface-container-lowest border-on-surface min-h-[44px] flex-1 rounded-lg border-[2px] px-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]"
            }
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex flex-row flex-wrap gap-1">
        {seleccion.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setCapitan(id)}
            aria-pressed={capitan === id}
            className={
              capitan === id
                ? "tappable bg-secondary-container border-on-surface min-h-[44px] min-w-[44px] rounded-lg border-[2px] px-2 text-xs font-bold shadow-[2px_2px_0px_var(--ink-shadow)]"
                : "tappable bg-surface-container-lowest border-on-surface min-h-[44px] min-w-[44px] rounded-lg border-[2px] px-2 text-xs shadow-[2px_2px_0px_var(--ink-shadow)]"
            }
          >
            {id.slice(0, 4)}
          </button>
        ))}
      </div>
      {error !== null ? (
        <p role="alert" className="bg-tertiary-container text-on-tertiary-container border-on-surface rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={guardar}
        disabled={ocupado}
        className="tappable brutal-btn brutal-btn-primary w-full text-sm disabled:opacity-50"
      >
        {irPaso2}
      </button>
    </section>
  );
}
