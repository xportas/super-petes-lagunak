import { traducir } from "@/src/lib/i18n";

export type TipoAyuda = "base" | "posicion" | "racha" | "cierre" | "entrenadores";

const ANCLA_POR_TIPO: Readonly<Record<TipoAyuda, string>> = {
  base: "base",
  posicion: "posicion",
  racha: "racha",
  cierre: "cierre",
  entrenadores: "entrenadores",
};

const CLAVE_POR_TIPO = {
  base: "ui.equipo.ayuda.base",
  posicion: "ui.equipo.ayuda.posicion",
  racha: "ui.equipo.ayuda.racha",
  cierre: "ui.equipo.ayuda.cierre",
  entrenadores: "ui.equipo.ayuda.entrenadores",
} as const;

export function IconoAyuda(props: {
  readonly tipo: TipoAyuda;
}): React.JSX.Element {
  const etiqueta = traducir("es", CLAVE_POR_TIPO[props.tipo]);
  const ancla = ANCLA_POR_TIPO[props.tipo];
  return (
    <a
      href={`/normas#${ancla}`}
      aria-label={etiqueta}
      title={etiqueta}
      className="tappable bg-surface-container-lowest border-on-surface inline-flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] text-[11px] leading-none font-bold shadow-[1px_1px_0px_var(--ink-shadow)]"
    >
      <span aria-hidden="true">?</span>
    </a>
  );
}
