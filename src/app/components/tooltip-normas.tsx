import { traducir } from "@/src/lib/i18n";

export function TooltipNormas(props: {
  readonly ancla: "base" | "racha";
}): React.JSX.Element {
  const clave =
    props.ancla === "base"
      ? ("ui.equipo.ayuda.base" as const)
      : ("ui.equipo.ayuda.racha" as const);
  const etiqueta = traducir("es", clave);
  return (
    <a
      href={`/normas#${props.ancla}`}
      aria-label={etiqueta}
      title={etiqueta}
      className="tappable bg-surface-container-lowest border-on-surface inline-flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] text-[11px] leading-none font-bold shadow-[1px_1px_0px_var(--ink-shadow)]"
    >
      <span aria-hidden="true">?</span>
    </a>
  );
}
