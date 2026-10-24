import { traducir } from "@/src/lib/i18n";
import type { EstadoActualDosLineas } from "@/src/lib/ficha/tipos";
import { TooltipNormas } from "./tooltip-normas";

export function FichaEstado(props: {
  readonly estado: EstadoActualDosLineas;
}): React.JSX.Element {
  const titulo = traducir("es", "ui.ficha.estado");
  const disponible = traducir("es", "ui.ficha.disponible");
  const lesionado = traducir("es", "ui.ficha.lesionado");
  const baja = traducir("es", "ui.ficha.baja");
  const sinPenalizacion = traducir("es", "ui.ficha.sin_penalizacion");
  const noAplica = traducir("es", "ui.ficha.no_aplica");
  const esLesion = props.estado.lineaSanitaria === "lesionado";
  const esBaja = props.estado.lineaSanitaria !== "disponible" && props.estado.lineaSanitaria !== "lesionado";
  const lineaSanitaria =
    props.estado.lineaSanitaria === "disponible"
      ? disponible
      : props.estado.lineaSanitaria === "lesionado"
        ? lesionado
        : baja;
  const lineaRacha =
    props.estado.lineaRacha.tipo === "no_aplica"
      ? noAplica
      : props.estado.lineaRacha.penalizacion === 0
        ? sinPenalizacion
        : traducir("es", "ui.ficha.racha", {
            n: props.estado.lineaRacha.penalizacion,
          });
  const hayRacha =
    props.estado.lineaRacha.tipo !== "no_aplica" &&
    props.estado.lineaRacha.penalizacion !== 0;
  return (
    <section aria-label={titulo} className="brutal-card flex w-full flex-col gap-2 p-3">
      <h2 className="brutal-title text-[18px] leading-[22px]">{titulo}</h2>
      <p className="flex min-h-[44px] flex-wrap items-center gap-2 text-sm">
        <span className={esLesion || esBaja ? "brutal-chip brutal-chip-bad" : "brutal-chip brutal-chip-ok"}>
          {lineaSanitaria}
        </span>
        <TooltipNormas ancla="base" />
      </p>
      <p className="flex min-h-[44px] flex-wrap items-center gap-2 text-sm">
        <span className={hayRacha ? "brutal-chip brutal-chip-bad" : "brutal-chip bg-surface-container border-on-surface border-[1.5px]"}>
          {lineaRacha}
        </span>
        <TooltipNormas ancla="racha" />
      </p>
    </section>
  );
}
