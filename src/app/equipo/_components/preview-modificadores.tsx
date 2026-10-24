"use client";

import { traducir } from "@/src/lib/i18n";
import {
  BONUS_POSICION,
  FACTOR_CAPITAN_DEN,
  FACTOR_CAPITAN_NUM,
} from "@/src/lib/scoring/constantes";
import type { PreviewSlot } from "../_lib/preview-equipo";
import { IconoAyuda } from "./icono-ayuda";

export function PreviewModificadores(props: {
  readonly preview: PreviewSlot;
  readonly entrenador: "maider" | "pater" | null;
}): React.JSX.Element {
  const { preview, entrenador } = props;
  if (preview.baseCero === "lesionado") {
    const texto = traducir("es", "ui.equipo.preview.base0_lesion");
    const aviso = traducir("es", "ui.equipo.aviso.lesion_ocupa");
    return (
      <span className="flex min-h-[44px] flex-wrap items-center gap-2 text-sm">
        <span className="brutal-chip brutal-chip-bad">{texto}</span>
        <IconoAyuda tipo="base" />
        <span className="text-xs">{aviso}</span>
      </span>
    );
  }
  if (preview.baseCero === "inactivo") {
    const texto = traducir("es", "ui.equipo.preview.base0_baja");
    const aviso = traducir("es", "ui.equipo.aviso.baja_conserva");
    return (
      <span className="flex min-h-[44px] flex-wrap items-center gap-2 text-sm">
        <span className="brutal-chip brutal-chip-bad">{texto}</span>
        <IconoAyuda tipo="base" />
        <span className="text-xs">{aviso}</span>
      </span>
    );
  }
  const etiquetaEntrenador =
    entrenador === "maider"
      ? traducir("es", "ui.equipo.entrenador.maider_info", {
          factor: FACTOR_CAPITAN_NUM / FACTOR_CAPITAN_DEN,
        })
      : entrenador === "pater"
        ? traducir("es", "ui.equipo.entrenador.pater_info")
        : null;
  return (
    <span className="flex min-h-[44px] flex-wrap items-center gap-2 text-sm">
      {preview.muestraMas5 ? (
        <span className="brutal-chip brutal-chip-ok inline-flex items-center gap-1">
          <span>
            {traducir("es", "ui.equipo.preview.mas5", {
              bonus: BONUS_POSICION,
            })}
          </span>
          <IconoAyuda tipo="posicion" />
        </span>
      ) : null}
      {preview.penalizacionRacha === null ? (
        <span className="brutal-chip bg-surface-container border-on-surface inline-flex items-center gap-1 border-[1.5px]">
          <span>{traducir("es", "ui.equipo.preview.estreno")}</span>
          <IconoAyuda tipo="racha" />
        </span>
      ) : (
        <span className="brutal-chip brutal-chip-bad inline-flex items-center gap-1">
          <span>
            {traducir("es", "ui.equipo.preview.racha", {
              n: preview.penalizacionRacha,
            })}
          </span>
          <IconoAyuda tipo="racha" />
        </span>
      )}
      {etiquetaEntrenador !== null ? (
        <span className="inline-flex items-center gap-1 text-xs">
          <span>{etiquetaEntrenador}</span>
          <IconoAyuda tipo="entrenadores" />
        </span>
      ) : null}
    </span>
  );
}
