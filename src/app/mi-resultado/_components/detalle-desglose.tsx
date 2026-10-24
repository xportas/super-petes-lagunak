import { traducir } from "@/src/lib/i18n";
import type { DesgloseJornadaVista } from "@/src/lib/resultados";

export type NombresJugadores = ReadonlyMap<
  string,
  { readonly nombre: string; readonly nombrePete: string | null }
>;

function iconoClave(icono: DesgloseJornadaVista["lineas"][number]["icono"]) {
  if (icono === "lesionado") {
    return "ui.resultados.icono_lesionado" as const;
  }
  if (icono === "no_convocado" || icono === "dnp") {
    return "ui.resultados.icono_ausente" as const;
  }
  return "ui.resultados.icono_jugo" as const;
}

export function DetalleDesglose(props: {
  readonly desglose: DesgloseJornadaVista;
  readonly nombres: NombresJugadores;
  readonly modoPete: boolean;
}): React.JSX.Element {
  const d = props.desglose;
  const verNormas = traducir("es", "ui.resultados.ver_normas");
  const etiquetaEntrenador =
    d.entrenador === "maider"
      ? traducir("es", "ui.equipo.entrenador.maider")
      : traducir("es", "ui.equipo.entrenador.pater");
  const textoMvp = d.esMvp
    ? traducir("es", "ui.resultados.mvp", { bonus: d.bonusMvp })
    : null;
  const textoExpulsion =
    d.expulsiones === 1
      ? traducir("es", "ui.resultados.expulsion", {
          penalizacion: d.penalizacionExpulsion,
        })
      : d.expulsiones > 1
        ? traducir("es", "ui.resultados.expulsion_pl", {
            penalizacion: d.penalizacionExpulsion,
          })
        : null;
  const textoTotal = traducir("es", "ui.resultados.total", { total: d.total });
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 text-sm">
        <span className="brutal-chip brutal-chip-live">{etiquetaEntrenador}</span>
        <a
          href="/normas#orden"
          className="tappable flex min-h-[44px] items-center text-xs underline"
        >
          {verNormas}
        </a>
      </p>
      <ul className="flex w-full flex-col gap-2">
        {d.lineas.map((linea) => {
          const info = props.nombres.get(linea.jugadorId);
          const nombre =
            props.modoPete && info?.nombrePete !== null && info?.nombrePete !== undefined
              ? (info.nombrePete as string)
              : (info?.nombre ?? linea.jugadorId);
          const icono = traducir("es", iconoClave(linea.icono));
          const capitan = linea.esCapitan
            ? traducir("es", "ui.resultados.capitan")
            : null;
          const marcaExpulsado = linea.expulsado
            ? traducir("es", "ui.resultados.expulsado")
            : null;
          const base = traducir("es", "ui.resultados.base", {
            base: linea.base,
          });
          const efecto = traducir("es", "ui.resultados.efecto_entrenador", {
            valor: linea.trasEntrenador,
          });
          const pos = traducir("es", "ui.resultados.posicion", {
            bonus: linea.bonusPosicion,
          });
          const racha = traducir("es", "ui.resultados.racha", {
            penalizacion: linea.penalizacionRacha,
          });
          const subtotal = traducir("es", "ui.resultados.subtotal", {
            subtotal: linea.subtotal,
          });
          return (
            <li
              key={linea.jugadorId}
              className="bg-surface-container-low border-on-surface flex w-full flex-col gap-1 rounded-lg border-[2px] px-3 py-2 text-sm shadow-[2px_2px_0px_var(--ink-shadow)]"
            >
              <span className="flex flex-wrap items-center gap-1 font-semibold break-words">
                <span className="brutal-chip brutal-chip-pos">{linea.posicionAlineada}</span>
                <span className="min-w-0 flex-1 truncate">{nombre}</span>
                {capitan === null ? null : (
                  <span className="brutal-chip brutal-chip-live">{capitan}</span>
                )}
                <span aria-hidden="true" className="text-xs">{icono}</span>
                {marcaExpulsado === null ? null : (
                  <span className="brutal-chip brutal-chip-bad">{marcaExpulsado}</span>
                )}
              </span>
              <span className="flex flex-wrap gap-1 break-words">
                <span className="brutal-chip bg-surface-container-lowest border-on-surface border-[1.5px]">{base}</span>
                <span className="brutal-chip bg-surface-container-lowest border-on-surface border-[1.5px]">{efecto}</span>
                <span className="brutal-chip brutal-chip-ok">{pos}</span>
                <span className={linea.penalizacionRacha === 0 ? "brutal-chip bg-surface-container border-on-surface border-[1.5px]" : "brutal-chip brutal-chip-bad"}>{racha}</span>
                <span className="brutal-chip bg-surface-container border-on-surface border-[1.5px]">{subtotal}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="flex min-h-[44px] flex-wrap items-center gap-2 text-sm font-semibold">
        {textoMvp === null ? null : <span className="brutal-chip brutal-chip-ok">{textoMvp}</span>}
        {textoExpulsion === null ? null : <span className="brutal-chip brutal-chip-bad">{textoExpulsion}</span>}
        <span className="brutal-chip brutal-chip-live tabular-brutal">{textoTotal}</span>
      </p>
    </div>
  );
}
