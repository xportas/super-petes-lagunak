import { traducir } from "@/src/lib/i18n";
import type { JornadaRow } from "@/src/lib/supabase/tipos";

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
  const iconoLocal = props.jornada.esLocal ? "🏠" : "✈️";
  return (
    <section aria-label={rival} className="flex w-full flex-col gap-2 rounded border px-3 py-3">
      {props.esUltimo ? (
        <p className="text-sm font-bold">{ultimo}</p>
      ) : null}
      <p className="text-sm">{fecha}</p>
      <p className="flex min-h-[44px] items-center gap-2 text-base">
        <span aria-hidden="true">{iconoLocal}</span>
        <span>{rival}</span>
      </p>
      <p className="text-sm">{lugar}</p>
      <a
        href="/normas#cierre"
        className="tappable flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border px-3 text-sm"
        aria-label="?"
      >
        ?
      </a>
    </section>
  );
}
