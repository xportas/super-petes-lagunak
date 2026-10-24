import { traducir } from "@/src/lib/i18n";
import type { DesgloseJornadaVista } from "@/src/lib/resultados";
import {
  DetalleDesglose,
  type NombresJugadores,
} from "./_components/detalle-desglose";

export function Destacada(props: {
  readonly desglose: DesgloseJornadaVista;
  readonly nombres: NombresJugadores;
  readonly modoPete: boolean;
}): React.JSX.Element {
  const titulo = traducir("es", "ui.resultados.destacada_titulo");
  return (
    <section aria-label={titulo} className="brutal-card-lg flex w-full flex-col gap-2 p-3">
      <span className="brutal-hazard-bar" aria-hidden="true" />
      <h2 className="brutal-title text-[18px] leading-[22px]">{titulo}</h2>
      <DetalleDesglose
        desglose={props.desglose}
        nombres={props.nombres}
        modoPete={props.modoPete}
      />
    </section>
  );
}
