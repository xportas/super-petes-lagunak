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
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p>{texto}</p>
        <Link
          href="/onboarding?paso=2"
          className="tappable flex min-h-[44px] items-center justify-center rounded border font-semibold"
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
    <section className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {props.jugadores.map((j) => {
          const activo = seleccion.includes(j.id);
          const etiqueta =
            props.modoPete && j.nombrePete !== null ? j.nombrePete : j.nombre;
          return (
            <li key={j.id}>
              <button
                type="button"
                onClick={() => alternar(j.id)}
                aria-pressed={activo}
                className="tappable min-h-[44px] w-full rounded border px-3 text-left"
              >
                {etiqueta}
              </button>
              {activo ? (
                <div className="flex flex-row flex-wrap gap-1 pt-1">
                  {POSICIONES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        setPosiciones({ ...posiciones, [j.id]: p })
                      }
                      aria-pressed={posiciones[j.id] === p}
                      className="tappable min-h-[44px] min-w-[44px] rounded border px-2"
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
            className="tappable min-h-[44px] flex-1 rounded border"
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
            className="tappable min-h-[44px] min-w-[44px] rounded border px-2"
          >
            {id.slice(0, 4)}
          </button>
        ))}
      </div>
      {error !== null ? <p role="alert">{error}</p> : null}
      <button
        type="button"
        onClick={guardar}
        disabled={ocupado}
        className="tappable min-h-[44px] w-full rounded font-semibold"
      >
        {irPaso2}
      </button>
    </section>
  );
}
