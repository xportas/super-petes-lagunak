import { traducir } from "@/src/lib/i18n";
import type { TopManagerRow } from "@/src/lib/home/tipos";

export function TopManagers(props: {
  readonly filas: readonly TopManagerRow[];
}): React.JSX.Element {
  const titulo = traducir("es", "ui.home.top_managers");
  const sinDatos = traducir("es", "ui.home.sin_datos");
  return (
    <section aria-label={titulo} className="flex w-full flex-col gap-2">
      <h2 className="text-base font-bold">{titulo}</h2>
      {props.filas.length === 0 ? (
        <p className="flex min-h-[44px] items-center text-sm">{sinDatos}</p>
      ) : (
        <ol className="flex w-full flex-col gap-1">
          {props.filas.map((f) => (
            <li
              key={f.managerId}
              className="flex min-h-[44px] items-center gap-2 rounded border px-3 text-sm"
            >
              <span>{`${f.puesto}. ${f.username} — ${f.puntos} (${f.jornadaEtiqueta})`}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
