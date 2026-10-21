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
  const sinDorsal = traducir("es", "ui.ficha.sin_dorsal");
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
    <section aria-label={nombre} className="flex w-full flex-col gap-2 rounded border px-3 py-3">
      <div className="flex items-center gap-3">
        <Image
          src={imgSrc}
          alt={nombre}
          width={64}
          height={64}
          className="h-[64px] w-[64px] shrink-0 rounded object-cover"
        />
        <div className="flex flex-col">
          <h1 className="text-xl font-bold">{nombre}</h1>
          <p className="text-sm">{`${dorsal} · ${posiciones}`}</p>
        </div>
      </div>
      <p className="text-sm">{descripcion}</p>
    </section>
  );
}
