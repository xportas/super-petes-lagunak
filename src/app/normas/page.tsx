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
    <main className="flex w-full flex-col gap-4 px-4 pt-8">
      <MarcadorConstantes />
      <h1 className="text-xl font-bold">{titulo}</h1>
      {ORDEN_BLOQUES.map((b) => (
        <section key={b} id={b} className="flex flex-col gap-2">
          <Bloque bloque={b} />
          {b === "racha" ? <TablaRacha /> : null}
        </section>
      ))}
      <Suspense fallback={null}>
        <EjemploPete />
      </Suspense>
      <p className="pb-8 text-sm">{fuente}</p>
    </main>
  );
}
