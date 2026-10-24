import { traducir } from "@/src/lib/i18n";
import type {
  MediaTemporada,
  UltimaValoracion,
} from "@/src/lib/ficha/tipos";
import { formatearMediaES } from "@/src/lib/ficha/media-evolucion";
import { TooltipNormas } from "./tooltip-normas";

function iconoActa(estado: "jugo" | "lesionado" | "no_convocado" | "dnp"): string {
  if (estado === "jugo") {
    return traducir("es", "ui.resultados.icono_jugo");
  }
  if (estado === "lesionado") {
    return traducir("es", "ui.resultados.icono_lesionado");
  }
  return traducir("es", "ui.resultados.icono_ausente");
}

export function FichaMedia(props: {
  readonly media: MediaTemporada;
  readonly ultima: UltimaValoracion;
}): React.JSX.Element {
  const tituloMedia = traducir("es", "ui.ficha.media");
  const tituloUltima = traducir("es", "ui.ficha.ultima");
  const sinDatos = traducir("es", "ui.home.sin_datos");
  const textoMedia =
    props.media.tipo === "sin_datos"
      ? sinDatos
      : formatearMediaES(props.media.media);
  const textoUltima =
    props.ultima.tipo === "sin_datos"
      ? sinDatos
      : `${props.ultima.base} ${iconoActa(props.ultima.estado)} (${props.ultima.jornadaEtiqueta})`;
  return (
    <section className="grid w-full grid-cols-2 gap-2">
      <div className="bg-primary-container text-on-primary-fixed border-on-surface flex flex-col items-center rounded-xl border-[2.5px] p-2 shadow-[3px_3px_0px_var(--ink-shadow)]">
        <h2 className="font-display text-[10px] leading-[14px] font-bold tracking-[0.06em] uppercase">
          {tituloMedia}
        </h2>
        <p className="font-display tabular-brutal text-[24px] leading-[28px] font-bold">
          {textoMedia}
        </p>
        <TooltipNormas ancla="base" />
      </div>
      <div className="brutal-card flex flex-col items-center p-2 text-center">
        <h2 className="font-display text-[10px] leading-[14px] font-bold tracking-[0.06em] uppercase">
          {tituloUltima}
        </h2>
        <p className="tabular-brutal text-sm font-bold">{textoUltima}</p>
      </div>
    </section>
  );
}
