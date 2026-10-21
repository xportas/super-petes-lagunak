import Link from "next/link";
import { traducir } from "@/src/lib/i18n";
import type { TopJugadorRow } from "@/src/lib/home/tipos";

export function TopJugadores(props: {
  readonly filas: readonly TopJugadorRow[];
  readonly nombres: ReadonlyMap<string, { readonly nombre: string; readonly nombrePete: string | null }>;
  readonly modoPete: boolean;
}): React.JSX.Element {
  const titulo = traducir("es", "ui.home.top_jugadores");
  const sinDatos = traducir("es", "ui.home.sin_datos");
  return (
    <section aria-label={titulo} className="flex w-full flex-col gap-2">
      <h2 className="text-base font-bold">{titulo}</h2>
      {props.filas.length === 0 ? (
        <p className="flex min-h-[44px] items-center text-sm">{sinDatos}</p>
      ) : (
        <ol className="flex w-full flex-col gap-1">
          {props.filas.map((f) => {
            const info = props.nombres.get(f.jugadorId);
            const nombre =
              info === undefined
                ? f.jugadorId
                : props.modoPete && info.nombrePete !== null
                  ? info.nombrePete
                  : info.nombre;
            return (
              <li key={f.jugadorId} className="w-full">
                <Link
                  href={`/jugadores/${f.jugadorId}`}
                  className="tappable flex min-h-[44px] items-center gap-2 rounded border px-3 text-sm"
                >
                  <span>{`${f.puesto}. ${nombre} — ${f.base} (${f.jornadaEtiqueta})`}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
