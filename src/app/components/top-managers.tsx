import { traducir } from "@/src/lib/i18n";
import type { TopManagerRow } from "@/src/lib/home/tipos";
import { IconoBrutal } from "@/src/components/ui/icono-brutal";

function clasePuesto(puesto: number): string {
  if (puesto === 1) {
    return "bg-primary-container text-on-primary-fixed";
  }
  if (puesto === 2) {
    return "bg-surface-container-high text-on-surface";
  }
  return "bg-surface-container text-on-surface";
}

export function TopManagers(props: {
  readonly filas: readonly TopManagerRow[];
}): React.JSX.Element {
  const titulo = traducir("es", "ui.home.top_managers");
  const sinDatos = traducir("es", "ui.home.sin_datos");
  return (
    <section aria-label={titulo} className="brutal-card flex w-full flex-col gap-2 p-3">
      <h2 className="brutal-title flex items-center gap-1.5 text-[18px] leading-[22px]">
        <IconoBrutal nombre="trofeo" clase="h-5 w-5" />
        {titulo}
      </h2>
      {props.filas.length === 0 ? (
        <p className="flex min-h-[44px] items-center text-sm">{sinDatos}</p>
      ) : (
        <ol className="flex w-full flex-col gap-2">
          {props.filas.map((f) => (
            <li
              key={f.managerId}
              className="bg-surface-container-low border-on-surface flex min-h-[44px] items-center gap-2 rounded-lg border-[2px] px-2 py-1.5 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]"
            >
              <span
                aria-hidden="true"
                className={`font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-[2px] border-[var(--ink-border)] text-[14px] font-bold shadow-[1px_1px_0px_var(--ink-shadow)] ${clasePuesto(f.puesto)}`}
              >
                {f.puesto}
              </span>
              <span className="tabular-brutal min-w-0 flex-1 truncate font-semibold">
                {f.username}
              </span>
              <span className="brutal-chip brutal-chip-live tabular-brutal shrink-0">
                {f.puntos}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
