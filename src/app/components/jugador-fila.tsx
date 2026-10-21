import Link from "next/link";
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

export function JugadorFila(props: {
  readonly jugador: JugadorRow;
  readonly modoPete: boolean;
}): React.JSX.Element {
  const sinDorsal = traducir("es", "ui.jugadores.sin_dorsal");
  const posicionPendiente = traducir("es", "ui.jugadores.posicion_pendiente");
  const nombre =
    props.modoPete && props.jugador.nombrePete !== null
      ? props.jugador.nombrePete
      : props.jugador.nombre;
  const dorsal =
    props.jugador.dorsal === null ? sinDorsal : `${props.jugador.dorsal}`;
  const posiciones =
    props.jugador.posicionesValidas === null
      ? posicionPendiente
      : `[${props.jugador.posicionesValidas[0]},${props.jugador.posicionesValidas[1]}]`;
  const icono = props.jugador.estadoSanitario === "lesionado" ? "🚑" : "✅";
  const imgSrc = normalizarImg(
    props.modoPete ? props.jugador.imgPete : props.jugador.img,
    props.modoPete
      ? "/players/placeholder-pete.webp"
      : "/players/placeholder.webp",
  );
  return (
    <li className="w-full">
      <Link
        href={`/jugadores/${props.jugador.id}`}
        className="tappable flex min-h-[44px] items-center gap-3 rounded border px-3 py-2"
      >
        <Image
          src={imgSrc}
          alt={nombre}
          width={44}
          height={44}
          className="h-[44px] w-[44px] shrink-0 rounded object-cover"
        />
        <span className="flex flex-1 flex-col">
          <span className="font-semibold">{nombre}</span>
          <span className="text-sm">{`${dorsal} · ${posiciones} · ${icono}`}</span>
        </span>
      </Link>
    </li>
  );
}
