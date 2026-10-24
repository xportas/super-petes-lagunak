import { Suspense } from "react";
import { traducir } from "@/src/lib/i18n";
import { ORDEN_BLOQUES } from "@/src/lib/preferencias/normas";
import {
  BONUS_MVP,
  BONUS_POSICION,
  FACTOR_CAPITAN_DEN,
  FACTOR_CAPITAN_NUM,
  HORAS_CIERRE,
  PENALIZACION_POR_EXPULSADO,
  PENALIZACION_SIN_QUINTETO,
} from "@/src/lib/scoring/constantes";
import { Bloque } from "./bloque";
import { LeyendaIconos } from "./leyenda-iconos";
import { TablaRacha } from "./tabla-racha";
import { EjemploPete } from "./ejemplo-pete";

function MarcadorConstantes(): React.JSX.Element | null {
  void BONUS_POSICION;
  void BONUS_MVP;
  void PENALIZACION_POR_EXPULSADO;
  void FACTOR_CAPITAN_NUM;
  void FACTOR_CAPITAN_DEN;
  void HORAS_CIERRE;
  void PENALIZACION_SIN_QUINTETO;
  return null;
}

export default function PaginaNormas(): React.JSX.Element {
  const titulo = traducir("es", "ui.normas.titulo");
  const fuente = traducir("es", "ui.normas.fuente");
  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-4 pb-28">
      <MarcadorConstantes />
      <section className="brutal-card-lg flex flex-col gap-2 p-3">
        <span className="brutal-hazard-bar" aria-hidden="true" />
        <h1 className="brutal-title text-[22px] leading-[26px]">{titulo}</h1>
      </section>
      {ORDEN_BLOQUES.map((b) => (
        <section key={b} id={b} className="flex scroll-mt-24 flex-col gap-2">
          <Bloque bloque={b} />
          {b === "racha" ? <TablaRacha /> : null}
        </section>
      ))}
      <LeyendaIconos />
      <Suspense fallback={null}>
        <EjemploPete />
      </Suspense>
      <p className="text-on-surface-variant px-1 text-xs">{fuente}</p>
    </main>
  );
}
