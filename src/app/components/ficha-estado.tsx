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
  return (
    <section aria-label={titulo} className="flex w-full flex-col gap-2 rounded border px-3 py-3">
      <h2 className="text-base font-bold">{titulo}</h2>
      <p className="flex min-h-[44px] flex-wrap items-center gap-2 text-sm">
        <span>{lineaSanitaria}</span>
        <TooltipNormas ancla="base" />
      </p>
      <p className="flex min-h-[44px] flex-wrap items-center gap-2 text-sm">
        <span>{lineaRacha}</span>
        <TooltipNormas ancla="racha" />
      </p>
    </section>
  );
}
