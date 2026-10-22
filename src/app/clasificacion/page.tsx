import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { traducir } from "@/src/lib/i18n";
import { hashearTokenSesion } from "@/src/lib/auth/sesion";
import {
  NOMBRE_COOKIE_SESION,
  buscarSesionPorId,
  buscarUsuarioPorId,
  obtenerClienteService,
  parsearCookieSesion,
} from "@/src/lib/supabase/auth";
import {
  leerJornadasOrdenadas,
  leerManagersElegibles,
} from "@/src/lib/supabase/resultados";
import {
  construirGeneral,
  construirTotales,
  esZonaRoja,
  medallaPorPuesto,
  type ActaJugadorTotales,
  type AlineacionTotales,
  type SeleccionTotales,
} from "@/src/lib/resultados";
import {
  esquemaEntrenador,
  esquemaPosicion,
  esquemaPosicionesValidas,
} from "@/src/lib/dominio/esquemas";
import type { Posicion } from "@/src/lib/scoring/tipos";

function aFecha(valor: unknown): Date | null {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }
  if (typeof valor === "string") {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function claseMedalla(puesto: number): string {
  const medalla = medallaPorPuesto(puesto);
  if (medalla === "oro") {
    return "bg-amber-200 dark:bg-amber-900";
  }
  if (medalla === "plata") {
    return "bg-slate-200 dark:bg-slate-700";
  }
  if (medalla === "bronce") {
    return "bg-orange-200 dark:bg-orange-900";
  }
  return "";
}

async function ContenidoClasificacion(): Promise<React.JSX.Element> {
  await connection();
  const titulo = traducir("es", "ui.clasificacion.titulo");
  const jar = await cookies();
  const par = parsearCookieSesion(jar.get(NOMBRE_COOKIE_SESION)?.value);
  if (par === null) {
    redirect("/login");
  }
  const sesion = await buscarSesionPorId(par.id).catch(() => null);
  const expira = sesion === null ? null : aFecha(sesion.expiraAt);
  const ahora = new Date();
  if (
    sesion === null ||
    expira === null ||
    expira.getTime() <= ahora.getTime() ||
    aFecha(sesion.revocadaAt) !== null ||
    sesion.tokenHash !== hashearTokenSesion(par.token)
  ) {
    redirect("/login");
  }
  const usuario = await buscarUsuarioPorId(sesion.usuarioId).catch(() => null);
  if (usuario === null) {
    redirect("/login");
  }
  if (usuario.esTemporal) {
    redirect("/cambiar-password");
  }
  if (usuario.rol !== "admin" && aFecha(usuario.onboardingCompletadoAt) === null) {
    redirect("/onboarding");
  }

  // Lecturas: cualquier fallo propaga a error.tsx (RF-19, sin parciales).
  const jornadas = await leerJornadasOrdenadas();
  const managers = await leerManagersElegibles();
  const db = obtenerClienteService();
  const { data: filasAlineacion } = await db
    .from("alineacion")
    .select("id,manager_id,jornada_id,entrenador,capitan_jugador_id");
  const { data: filasSeleccion } = await db
    .from("alineacion_seleccion")
    .select("alineacion_id,jugador_id,posicion_alineada");
  const { data: filasActa } = await db
    .from("resultado_jugador")
    .select("jornada_id,jugador_id,valoracion,estado,expulsado");
  const { data: filasJugador } = await db
    .from("jugador")
    .select("id,posiciones_validas");

  const alineaciones: AlineacionTotales[] = [];
  for (const f of ((filasAlineacion ?? []) as unknown as Array<
    Record<string, unknown>
  >)) {
    if (typeof f["id"] !== "string") {
      continue;
    }
    const managerId = f["manager_id"] ?? f["managerId"];
    if (typeof managerId !== "string") {
      continue;
    }
    const jornadaId = f["jornada_id"] ?? f["jornadaId"];
    if (typeof jornadaId !== "string") {
      continue;
    }
    const capitanJugadorId = f["capitan_jugador_id"] ?? f["capitanJugadorId"];
    if (typeof capitanJugadorId !== "string") {
      continue;
    }
    const entrenador = esquemaEntrenador.safeParse(f["entrenador"]);
    if (!entrenador.success) {
      continue;
    }
    alineaciones.push({
      id: f["id"] as string,
      managerId: managerId as string,
      jornadaId: jornadaId as string,
      entrenador: entrenador.data,
      capitanJugadorId: capitanJugadorId as string,
    });
  }

  const selecciones: SeleccionTotales[] = [];
  for (const f of ((filasSeleccion ?? []) as unknown as Array<
    Record<string, unknown>
  >)) {
    const alineacionId = f["alineacion_id"] ?? f["alineacionId"];
    if (typeof alineacionId !== "string") {
      continue;
    }
    const jugadorId = f["jugador_id"] ?? f["jugadorId"];
    if (typeof jugadorId !== "string") {
      continue;
    }
    const pos = esquemaPosicion.safeParse(f["posicion_alineada"] ?? f["posicionAlineada"]);
    if (!pos.success) {
      continue;
    }
    selecciones.push({
      alineacionId: alineacionId as string,
      jugadorId: jugadorId as string,
      posicionAlineada: pos.data,
    });
  }

  const actas = new Map<string, Map<string, ActaJugadorTotales>>();
  for (const f of ((filasActa ?? []) as unknown as Array<
    Record<string, unknown>
  >)) {
    const jornadaId = f["jornada_id"] ?? f["jornadaId"];
    if (typeof jornadaId !== "string") {
      continue;
    }
    const jugadorId = f["jugador_id"] ?? f["jugadorId"];
    if (typeof jugadorId !== "string") {
      continue;
    }
    if (typeof f["valoracion"] !== "number") {
      continue;
    }
    const estado = f["estado"];
    if (
      estado !== "jugo" &&
      estado !== "lesionado" &&
      estado !== "no_convocado" &&
      estado !== "dnp"
    ) {
      continue;
    }
    let porJornada = actas.get(jornadaId as string);
    if (porJornada === undefined) {
      porJornada = new Map<string, ActaJugadorTotales>();
      actas.set(jornadaId as string, porJornada);
    }
    porJornada.set(jugadorId as string, {
      valoracion: f["valoracion"] as number,
      estado,
      expulsado: f["expulsado"] === true,
    });
  }

  const posiciones = new Map<
    string,
    { readonly posicionesValidas: readonly [Posicion, Posicion] | null }
  >();
  for (const f of ((filasJugador ?? []) as unknown as Array<
    Record<string, unknown>
  >)) {
    if (typeof f["id"] !== "string") {
      continue;
    }
    const validas = esquemaPosicionesValidas.safeParse(f["posiciones_validas"] ?? f["posicionesValidas"]);
    posiciones.set(f["id"] as string, {
      posicionesValidas: validas.success ? validas.data : null,
    });
  }

  const { totalesPorManager } = construirTotales({
    jornadas: jornadas.map((j) => ({
      jornadaId: j.id,
      numeroJornada: j.numeroJornada,
      horaPartido: j.horaPartido,
      estado: j.estado,
    })),
    managers: managers.map((m) => ({
      id: m.id,
      username: m.username,
      onboardingCompletadoAt: m.onboardingCompletadoAt,
    })),
    alineaciones,
    selecciones,
    actas,
    posiciones,
  });

  const general = construirGeneral({
    managers: managers.map((m) => ({ id: m.id, username: m.username, rol: "manager" as const })),
    jornadas: jornadas.map((j) => ({ jornadaId: j.id, estado: j.estado })),
    totales: totalesPorManager,
    miManagerId: usuario.id,
  });

  const sinDatos = traducir("es", "ui.clasificacion.sin_datos");
  const tu = traducir("es", "ui.clasificacion.tu_fila");
  const hayColores = general.hayColores;
  const totalN = general.filas.length;
  const umbralRojo =
    totalN > 6 ? (general.filas[totalN - 3]?.acumulado ?? 0) : 0;

  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
      <h1 className="text-xl font-bold">{titulo}</h1>
      {hayColores ? null : (
        <p className="flex min-h-[44px] items-center text-sm">{sinDatos}</p>
      )}
      <ol className="flex w-full flex-col gap-1">
        {general.filas.map((f) => {
          const esMia = f.managerId === general.miManagerId;
          const medalla = hayColores ? claseMedalla(f.puesto) : "";
          const roja =
            hayColores &&
            esZonaRoja({
              acumulado: f.acumulado,
              umbralRojo,
              totalN,
            })
              ? "bg-red-100 dark:bg-red-950"
              : "";
          const texto = traducir("es", "ui.resultados.fila_puntos", {
            puntos: f.acumulado,
            puesto: f.puesto,
          });
          return (
            <li
              key={f.managerId}
              aria-current={esMia ? "true" : undefined}
              aria-label={esMia ? `${f.username} ${tu}` : f.username}
              className={`flex min-h-[44px] items-center gap-2 rounded border px-3 text-sm ${medalla} ${roja} ${esMia ? "font-bold" : ""}`}
            >
              <span className="break-words">
                {f.username} {texto}
                {esMia ? ` ${tu}` : null}
              </span>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

export default function PaginaClasificacion(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <ContenidoClasificacion />
    </Suspense>
  );
}
