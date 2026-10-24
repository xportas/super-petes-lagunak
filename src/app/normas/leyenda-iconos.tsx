import { traducir } from "@/src/lib/i18n";
import {
  BONUS_MVP,
  BONUS_POSICION,
  PENALIZACION_POR_EXPULSADO,
} from "@/src/lib/scoring/constantes";
import { penalizacionPara } from "@/src/lib/dominio/rachas";

export function LeyendaIconos(): React.JSX.Element {
  const titulo = traducir("es", "ui.normas.leyenda_titulo");
  const intro = traducir("es", "ui.normas.leyenda_intro");
  const iconoJugo = traducir("es", "ui.resultados.icono_jugo");
  const textoJugo = traducir("es", "ui.normas.leyenda_jugo");
  const iconoLesionado = traducir("es", "ui.resultados.icono_lesionado");
  const textoLesionado = traducir("es", "ui.normas.leyenda_lesionado");
  const iconoAusente = traducir("es", "ui.resultados.icono_ausente");
  const textoAusente = traducir("es", "ui.normas.leyenda_ausente");
  const chipPosicion = traducir("es", "ui.equipo.preview.mas5", {
    bonus: BONUS_POSICION,
  });
  const textoPosicion = traducir("es", "ui.normas.leyenda_posicion", {
    bonus: BONUS_POSICION,
  });
  const ejemploRacha = penalizacionPara(2);
  const chipRacha = traducir("es", "ui.equipo.preview.racha", {
    n: ejemploRacha,
  });
  const textoRacha = traducir("es", "ui.normas.leyenda_racha", {
    segunda: ejemploRacha,
  });
  const chipCapitan = traducir("es", "ui.resultados.capitan");
  const textoCapitan = traducir("es", "ui.normas.leyenda_capitan");
  const chipExpulsado = traducir("es", "ui.resultados.expulsado");
  const textoExpulsado = traducir("es", "ui.normas.leyenda_expulsado", {
    penalizacion: PENALIZACION_POR_EXPULSADO,
  });
  const chipMvp = traducir("es", "ui.resultados.mvp", {
    bonus: BONUS_MVP,
  });
  const textoMvp = traducir("es", "ui.normas.leyenda_mvp", {
    bonus: BONUS_MVP,
  });
  const textoAyuda = traducir("es", "ui.normas.leyenda_ayuda");
  return (
    <section
      id="iconos"
      aria-label={titulo}
      className="brutal-card flex scroll-mt-24 flex-col gap-2 p-3"
    >
      <h2 className="brutal-title flex min-h-[44px] items-center text-[16px] leading-[20px]">
        {titulo}
      </h2>
      <p className="text-sm">{intro}</p>
      <ul className="flex flex-col gap-2">
        <li className="flex min-h-[44px] items-center gap-2 border-t-[2px] border-[var(--ink-border)] pt-2 text-sm">
          <span aria-hidden="true" className="text-base">
            {iconoJugo}
          </span>
          <span>{textoJugo}</span>
        </li>
        <li className="flex min-h-[44px] items-center gap-2 border-t-[2px] border-[var(--ink-border)] pt-2 text-sm">
          <span aria-hidden="true" className="text-base">
            {iconoLesionado}
          </span>
          <span>{textoLesionado}</span>
        </li>
        <li className="flex min-h-[44px] items-center gap-2 border-t-[2px] border-[var(--ink-border)] pt-2 text-sm">
          <span aria-hidden="true" className="text-base">
            {iconoAusente}
          </span>
          <span>{textoAusente}</span>
        </li>
        <li className="flex min-h-[44px] items-center gap-2 border-t-[2px] border-[var(--ink-border)] pt-2 text-sm">
          <span className="brutal-chip brutal-chip-ok shrink-0">{chipPosicion}</span>
          <span>{textoPosicion}</span>
        </li>
        <li className="flex min-h-[44px] items-center gap-2 border-t-[2px] border-[var(--ink-border)] pt-2 text-sm">
          <span className="brutal-chip brutal-chip-bad shrink-0">{chipRacha}</span>
          <span>{textoRacha}</span>
        </li>
        <li className="flex min-h-[44px] items-center gap-2 border-t-[2px] border-[var(--ink-border)] pt-2 text-sm">
          <span className="brutal-chip brutal-chip-live shrink-0">{chipCapitan}</span>
          <span>{textoCapitan}</span>
        </li>
        <li className="flex min-h-[44px] items-center gap-2 border-t-[2px] border-[var(--ink-border)] pt-2 text-sm">
          <span className="brutal-chip brutal-chip-bad shrink-0">{chipExpulsado}</span>
          <span>{textoExpulsado}</span>
        </li>
        <li className="flex min-h-[44px] items-center gap-2 border-t-[2px] border-[var(--ink-border)] pt-2 text-sm">
          <span className="brutal-chip brutal-chip-ok shrink-0">{chipMvp}</span>
          <span>{textoMvp}</span>
        </li>
        <li className="flex min-h-[44px] items-center gap-2 border-t-[2px] border-[var(--ink-border)] pt-2 text-sm">
          <span
            aria-hidden="true"
            className="bg-surface-container-lowest border-on-surface flex min-h-[32px] min-w-[32px] shrink-0 items-center justify-center rounded-full border-[2px] text-sm font-bold"
          >
            ?
          </span>
          <span>{textoAyuda}</span>
        </li>
      </ul>
    </section>
  );
}
