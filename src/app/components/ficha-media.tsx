import { traducir } from "@/src/lib/i18n";
import type {
  MediaTemporada,
  UltimaValoracion,
} from "@/src/lib/ficha/tipos";
import { formatearMediaES } from "@/src/lib/ficha/media-evolucion";
import { TooltipNormas } from "./tooltip-normas";

function iconoActa(estado: "jugo" | "lesionado" | "no_convocado" | "dnp"): string {
  if (estado === "jugo") {
    return "✅";
  }
  if (estado === "lesionado") {
    return "🚑";
  }
  return "❌";
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
    <section className="flex w-full flex-col gap-2 rounded border px-3 py-3">
      <div className="flex min-h-[44px] flex-col justify-center gap-1">
        <h2 className="text-base font-bold">{tituloMedia}</h2>
        <p className="flex items-center gap-2 text-sm">
          <span>{textoMedia}</span>
          <TooltipNormas ancla="base" />
        </p>
      </div>
      <div className="flex min-h-[44px] flex-col justify-center gap-1">
        <h2 className="text-base font-bold">{tituloUltima}</h2>
        <p className="text-sm">{textoUltima}</p>
      </div>
    </section>
  );
}
