import { traducir } from "@/src/lib/i18n";
import type { EvolucionFila } from "@/src/lib/ficha/tipos";
import { TooltipNormas } from "./tooltip-normas";

function iconoEstado(estado: EvolucionFila["estado"]): string {
  if (estado === "jugo") {
    return traducir("es", "ui.resultados.icono_jugo");
  }
  if (estado === "lesionado") {
    return traducir("es", "ui.resultados.icono_lesionado");
  }
  return traducir("es", "ui.resultados.icono_ausente");
}

function claseSello(base: number): string {
  if (base > 0) {
    return "bg-primary-container text-on-primary-fixed";
  }
  if (base < 0) {
    return "bg-tertiary-container text-on-tertiary-container";
  }
  return "bg-surface-container-high text-on-surface";
}

export function FichaEvolucion(props: {
  readonly filas: readonly EvolucionFila[];
}): React.JSX.Element {
  const titulo = traducir("es", "ui.ficha.evolucion");
  const sinDatos = traducir("es", "ui.home.sin_datos");
  if (props.filas.length === 0) {
    return (
      <section aria-label={titulo} className="brutal-card flex w-full flex-col gap-2 p-3">
        <h2 className="brutal-title text-[18px] leading-[22px]">{titulo}</h2>
        <p className="flex min-h-[44px] items-center text-sm">{sinDatos}</p>
      </section>
    );
  }
  const maxAbs = Math.max(1, ...props.filas.map((f) => Math.abs(f.base)));
  return (
    <section aria-label={titulo} className="brutal-card flex w-full flex-col gap-2 p-3">
      <h2 className="brutal-title text-[18px] leading-[22px]">{titulo}</h2>
      <ul className="flex w-full flex-col gap-2">
        {props.filas.map((f) => {
          const ancho = Math.min(100, Math.round((Math.abs(f.base) / maxAbs) * 100));
          return (
            <li
              key={f.jornadaId}
              className="bg-surface-container-low border-on-surface flex items-center justify-between gap-2 rounded-lg border-[2px] p-2 shadow-[2px_2px_0px_var(--ink-shadow)]"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-bold">{f.etiqueta}</span>
                <span className="bg-surface-container-highest flex h-2 w-16 overflow-hidden rounded-full">
                  <span
                    className={f.base >= 0 ? "bg-secondary h-full rounded-full" : "bg-tertiary h-full rounded-full"}
                    style={{ width: `${ancho}%` }}
                  />
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span aria-hidden="true" className="text-xs">{iconoEstado(f.estado)}</span>
                <span className={`font-display tabular-brutal min-w-[46px] rounded border-[1.5px] border-[var(--ink-border)] px-2 py-1 text-center text-[18px] leading-[22px] font-bold shadow-[1.5px_1.5px_0px_var(--ink-shadow)] ${claseSello(f.base)}`}>
                  {f.base}
                </span>
                <TooltipNormas ancla="base" />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
