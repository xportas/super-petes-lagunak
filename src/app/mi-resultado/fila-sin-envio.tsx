import { traducir } from "@/src/lib/i18n";
import { PENALIZACION_SIN_QUINTETO } from "@/src/lib/scoring/constantes";

export function FilaSinEnvio(): React.JSX.Element {
  const nota = traducir("es", "ui.resultados.nota_sin_envio", {
    penalizacion: PENALIZACION_SIN_QUINTETO,
  });
  const verNormas = traducir("es", "ui.resultados.ver_normas");
  return (
    <div className="flex w-full flex-col gap-2 text-sm">
      <p className="flex min-h-[44px] items-center">{nota}</p>
      <a
        href="/normas#orden"
        className="tappable flex min-h-[44px] items-center underline"
      >
        {verNormas}
      </a>
    </div>
  );
}
