import { traducir } from "@/src/lib/i18n";
import type { JornadaRow } from "@/src/lib/supabase/tipos";
import { IconoBrutal } from "@/src/components/ui/icono-brutal";

function formatearFechaHora(hora: Date): string {
  const fmt = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.format(hora);
}

export function BloquePartido(props: {
  readonly jornada: JornadaRow;
  readonly esUltimo: boolean;
}): React.JSX.Element {
  const porConfirmar = traducir("es", "ui.home.por_confirmar");
  const ultimo = traducir("es", "ui.home.ultimo_partido");
  const rival =
    props.jornada.rival.trim().length > 0 ? props.jornada.rival : porConfirmar;
  const lugar =
    props.jornada.campo !== null && props.jornada.campo.trim().length > 0
      ? props.jornada.campo
      : props.jornada.municipio !== null &&
          props.jornada.municipio.trim().length > 0
        ? (props.jornada.municipio as string)
        : porConfirmar;
  const fecha = formatearFechaHora(props.jornada.horaPartido);
  const textoLocal = traducir(
    "es",
    props.jornada.esLocal ? "ui.home.local" : "ui.home.visitante",
  );
  return (
    <section aria-label={rival} className="flex w-full flex-col gap-2">
      {props.esUltimo ? (
        <p className="brutal-chip brutal-chip-live w-fit">{ultimo}</p>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="brutal-title text-[22px] leading-[26px] break-words">
            {rival}
          </p>
          <p className="flex flex-wrap items-center gap-1 text-sm">
            <span className="brutal-chip bg-surface-container border-on-surface border-[1.5px]">
              {fecha}
            </span>
            <span className="brutal-chip bg-surface-container border-on-surface border-[1.5px]">
              {lugar}
            </span>
          </p>
        </div>
        <a
          href="/normas#cierre"
          className="tappable bg-surface-container-lowest border-on-surface flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-[2px] px-2 text-sm font-bold shadow-[2px_2px_0px_var(--ink-shadow)]"
          aria-label="?"
        >
          <IconoBrutal nombre="ayuda" clase="h-5 w-5" />
        </a>
      </div>
      <p className="text-on-surface-variant flex items-center gap-1 text-xs">
        <IconoBrutal nombre={props.jornada.esLocal ? "home" : "balon"} clase="h-4 w-4" />
        <span>{textoLocal}</span>
      </p>
    </section>
  );
}
