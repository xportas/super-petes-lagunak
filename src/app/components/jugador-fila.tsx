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
  const lesionado = props.jugador.estadoSanitario === "lesionado";
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
        className="tappable brutal-card flex min-h-[44px] items-center gap-3 p-2"
      >
        <Image
          src={imgSrc}
          alt=""
          width={52}
          height={52}
          className="border-on-surface h-[52px] w-[52px] shrink-0 rounded-xl border-[2px] object-cover shadow-[2px_2px_0px_var(--ink-shadow)]"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display truncate text-[16px] leading-[20px] font-bold uppercase">
            {nombre}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
            <span className="brutal-chip brutal-chip-pos">{dorsal}</span>
            <span className="brutal-chip bg-surface-container border-on-surface border-[1.5px]">{posiciones}</span>
          </span>
        </span>
        <span className={lesionado ? "brutal-chip brutal-chip-bad shrink-0" : "brutal-chip brutal-chip-ok shrink-0"}>
          {lesionado
            ? traducir("es", "ui.ficha.lesionado")
            : traducir("es", "ui.ficha.disponible")}
        </span>
      </Link>
    </li>
  );
}
