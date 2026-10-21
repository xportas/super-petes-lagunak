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
    <section aria-label={titulo} className="flex w-full flex-col gap-2">
      <h2 className="text-base font-bold">{titulo}</h2>
      <DetalleDesglose
        desglose={props.desglose}
        nombres={props.nombres}
        modoPete={props.modoPete}
      />
    </section>
  );
}
