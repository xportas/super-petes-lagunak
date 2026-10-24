import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { traducir } from "@/src/lib/i18n";
import { parsearModoPete } from "@/src/lib/preferencias/cookies";
import { listarPlantillaActiva } from "@/src/lib/supabase/queries-ficha";
import { JugadorFila } from "@/src/app/components/jugador-fila";

async function ContenidoJugadores(): Promise<React.JSX.Element> {
  await connection();
  const jar = await cookies();
  const modoPete = parsearModoPete(jar.get("modo_pete")?.value) === "1";
  const plantilla = await listarPlantillaActiva();
  const titulo = traducir("es", "ui.jugadores.titulo");

  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-4 pb-28">
      <section className="brutal-card-lg flex flex-col gap-2 p-3">
        <span className="brutal-hazard-bar" aria-hidden="true" />
        <h1 className="brutal-title text-[22px] leading-[26px]">{titulo}</h1>
      </section>
      <ul className="flex w-full flex-col gap-2">
        {plantilla.map((j) => (
          <JugadorFila key={j.id} jugador={j} modoPete={modoPete} />
        ))}
      </ul>
    </main>
  );
}

export default function PaginaJugadores(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <ContenidoJugadores />
    </Suspense>
  );
}
