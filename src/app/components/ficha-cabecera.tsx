import Image from "next/image";
import { traducir } from "@/src/lib/i18n";
import type { JugadorRow } from "@/src/lib/supabase/tipos";

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

export function FichaCabecera(props: {
  readonly jugador: JugadorRow;
  readonly modoPete: boolean;
}): React.JSX.Element {
  const sinDorsal = traducir("es", "ui.jugadores.sin_dorsal");
  const sinDescripcion = traducir("es", "ui.ficha.sin_descripcion");
  const posicionPendiente = traducir("es", "ui.jugadores.posicion_pendiente");
  const nombre =
    props.modoPete && props.jugador.nombrePete !== null
      ? props.jugador.nombrePete
      : props.jugador.nombre;
  const imgSrc = normalizarImg(
    props.modoPete ? props.jugador.imgPete : props.jugador.img,
    props.modoPete
      ? "/players/placeholder-pete.webp"
      : "/players/placeholder.webp",
  );
  const dorsal =
    props.jugador.dorsal === null ? sinDorsal : `${props.jugador.dorsal}`;
  const posiciones =
    props.jugador.posicionesValidas === null
      ? posicionPendiente
      : `[${props.jugador.posicionesValidas[0]},${props.jugador.posicionesValidas[1]}]`;
  const descripcion =
    props.jugador.descripcion.trim().length === 0
      ? sinDescripcion
      : props.jugador.descripcion;
  return (
    <section aria-label={nombre} className="brutal-card-lg flex w-full flex-col gap-2 p-3">
      <span className="brutal-hazard-bar" aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="brutal-chip brutal-chip-pos w-fit">
            {dorsal} · {posiciones}
          </span>
          <h1 className="font-display text-[32px] leading-[36px] font-bold tracking-[-0.03em] break-words uppercase">
            {nombre}
          </h1>
        </div>
      </div>
      <div className="bg-surface-container border-on-surface overflow-hidden rounded-lg border-[2px] shadow-[2px_2px_0px_var(--ink-shadow)]">
        <Image
          src={imgSrc}
          alt=""
          width={640}
          height={360}
          className="h-56 w-full object-cover object-top"
          priority
        />
      </div>
      <blockquote className="bg-surface-container-low border-on-surface rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]">
        {descripcion}
      </blockquote>
    </section>
  );
}
