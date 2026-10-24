import Link from "next/link";
import Image from "next/image";
import { traducir } from "@/src/lib/i18n";
import type { TopJugadorRow } from "@/src/lib/home/tipos";
import { IconoBrutal } from "@/src/components/ui/icono-brutal";

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

export function TopJugadores(props: {
  readonly filas: readonly TopJugadorRow[];
  readonly nombres: ReadonlyMap<string, { readonly nombre: string; readonly nombrePete: string | null }>;
  readonly modoPete: boolean;
  readonly imagenPorJugador?: ReadonlyMap<string, string>;
}): React.JSX.Element {
  const titulo = traducir("es", "ui.home.top_jugadores");
  const sinDatos = traducir("es", "ui.home.sin_datos");
  return (
    <section aria-label={titulo} className="brutal-card flex w-full flex-col gap-2 p-3">
      <h2 className="brutal-title flex items-center gap-1.5 text-[18px] leading-[22px]">
        <IconoBrutal nombre="fuego" clase="h-5 w-5" />
        {titulo}
      </h2>
      {props.filas.length === 0 ? (
        <p className="flex min-h-[44px] items-center text-sm">{sinDatos}</p>
      ) : (
        <ol className="flex w-full flex-col gap-2">
          {props.filas.map((f) => {
            const info = props.nombres.get(f.jugadorId);
            const nombre =
              info === undefined
                ? f.jugadorId
                : props.modoPete && info.nombrePete !== null
                  ? info.nombrePete
                  : info.nombre;
            const img = props.imagenPorJugador?.get(f.jugadorId);
            const fallback = props.modoPete
              ? "/players/placeholder-pete.webp"
              : "/players/placeholder.webp";
            const src = img === undefined ? fallback : normalizarImg(img, fallback);
            return (
              <li key={f.jugadorId} className="w-full">
                <Link
                  href={`/jugadores/${f.jugadorId}`}
                  className="tappable bg-surface-container-lowest border-on-surface flex min-h-[44px] items-center gap-2 rounded-lg border-[2px] px-2 py-1.5 shadow-[2px_2px_0px_var(--ink-shadow)]"
                >
                  <Image
                    src={src}
                    alt=""
                    width={36}
                    height={36}
                    className="border-on-surface h-9 w-9 shrink-0 rounded-full border-[2px] object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{nombre}</span>
                  <span className="brutal-chip brutal-chip-ok tabular-brutal shrink-0">
                    {f.base}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
