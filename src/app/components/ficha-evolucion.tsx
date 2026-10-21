import { traducir } from "@/src/lib/i18n";
import type { EvolucionFila } from "@/src/lib/ficha/tipos";
import { TooltipNormas } from "./tooltip-normas";

function iconoEstado(estado: EvolucionFila["estado"]): string {
  if (estado === "jugo") {
    return "✅";
  }
  if (estado === "lesionado") {
    return "🚑";
  }
  return "❌";
}

export function FichaEvolucion(props: {
  readonly filas: readonly EvolucionFila[];
}): React.JSX.Element {
  const titulo = traducir("es", "ui.ficha.evolucion");
  const sinDatos = traducir("es", "ui.home.sin_datos");
  if (props.filas.length === 0) {
    return (
      <section aria-label={titulo} className="flex w-full flex-col gap-2">
        <h2 className="text-base font-bold">{titulo}</h2>
        <p className="flex min-h-[44px] items-center text-sm">{sinDatos}</p>
      </section>
    );
  }
  return (
    <section aria-label={titulo} className="flex w-full flex-col gap-2">
      <h2 className="text-base font-bold">{titulo}</h2>
      <div className="w-full overflow-x-clip rounded border">
        <table className="w-full table-fixed text-sm">
          <tbody>
            {props.filas.map((f) => (
              <tr key={f.jornadaId} className="border-b last:border-0">
                <td className="px-3 py-2">{f.etiqueta}</td>
                <td className="px-3 py-2 text-right">{`${f.base} ${iconoEstado(f.estado)}`}</td>
                <td className="w-[44px] px-1 py-2 text-center">
                  <TooltipNormas ancla="base" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
