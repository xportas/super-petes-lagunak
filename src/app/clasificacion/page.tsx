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
  if (puesto === 1) {
    return "bg-primary-container text-on-primary-fixed border-on-surface";
  }
  if (puesto === 2) {
    return "bg-surface-container-high text-on-surface border-on-surface";
  }
  if (puesto === 3) {
    return "bg-[#ffd9b3] text-on-surface border-on-surface dark:bg-amber-900/60 dark:text-amber-50";
  }
  return "bg-surface-container-lowest text-on-surface border-on-surface";
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
    <main className="flex w-full flex-col gap-4 px-4 pt-4 pb-28">
      <section className="bg-surface-container-highest border-on-surface flex items-center justify-between rounded-xl border-[2.5px] p-3 shadow-[3px_3px_0px_var(--ink-shadow)]">
        <h1 className="brutal-title text-[18px] leading-[22px]">{titulo}</h1>
      </section>
      {hayColores ? null : (
        <p className="brutal-card flex min-h-[44px] items-center px-3 text-sm">{sinDatos}</p>
      )}
      {general.miManagerId !== null && general.filas.some((f) => f.managerId === general.miManagerId) ? (
        <section aria-label={tu} className="brutal-card-lg flex flex-col gap-2 p-3">
          {general.filas.filter((f) => f.managerId === general.miManagerId).map((f) => (
            <div key={f.managerId} className="flex items-center gap-2">
              <span className="font-display tabular-brutal bg-primary-container text-on-primary-fixed border-on-surface flex h-9 min-w-[44px] items-center justify-center rounded-lg border-[2px] px-2 text-[22px] leading-[26px] font-bold shadow-[2px_2px_0px_var(--ink-shadow)]">
                #{f.puesto}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1 truncate font-bold">
                  <span className="truncate">{f.username}</span>
                  <span className="brutal-chip brutal-chip-live shrink-0">{tu}</span>
                </span>
                <span className="tabular-brutal text-sm">{traducir("es", "ui.resultados.fila_puntos", { puntos: f.acumulado, puesto: f.puesto })}</span>
              </div>
            </div>
          ))}
        </section>
      ) : null}
      {hayColores && general.filas.length >= 3 ? (
        <section aria-label="podio" className="flex flex-col gap-2">
          <div className="grid grid-cols-3 items-end gap-2 pt-6">
            {[general.filas[1], general.filas[0], general.filas[2]].map((f, i) => {
              if (f === undefined) {
                return <span key={i} />;
              }
              const central = i === 1;
              return (
                <div key={f.managerId} className="flex flex-col items-center">
                  <span aria-hidden="true" className={`font-display tabular-brutal mb-1 flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-[var(--ink-border)] text-[12px] font-bold shadow-[1px_1px_0px_var(--ink-shadow)] ${central ? "bg-primary-container text-on-primary-fixed" : i === 0 ? "bg-surface-container-highest text-on-surface" : "bg-tertiary-container text-on-tertiary-container"}`}>
                    {central ? 1 : i === 0 ? 2 : 3}
                  </span>
                  <div className={`flex w-full flex-col items-center justify-between px-1 pt-2 pb-1 text-center ${central ? "bg-primary-container text-on-primary-fixed border-on-surface h-36 rounded-t-xl border-[2.5px] shadow-[4px_4px_0px_var(--ink-shadow)]" : "bg-surface-container-lowest text-on-surface border-on-surface rounded-t-xl border-[2px] shadow-[3px_3px_0px_var(--ink-shadow)]"} ${i === 0 ? "h-28" : central ? "" : "h-24"}`}>
                    <span className="flex w-full flex-col">
                      <span className="truncate text-xs font-bold">{f.username}</span>
                    </span>
                    <span className="bg-surface-container-lowest text-on-surface flex w-full flex-col rounded px-1 py-0.5 shadow-[2px_2px_0px_var(--ink-shadow)]">
                      <span className="font-display tabular-brutal block text-sm leading-tight font-bold">{f.acumulado}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      <ol className="flex w-full flex-col gap-2">
        {general.filas.map((f) => {
          const esMia = f.managerId === general.miManagerId;
          const medalla = hayColores ? claseMedalla(f.puesto) : "bg-surface-container-lowest text-on-surface border-on-surface";
          const roja =
            hayColores &&
            esZonaRoja({
              acumulado: f.acumulado,
              umbralRojo,
              totalN,
            })
              ? "bg-tertiary-container text-on-tertiary-container"
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
              className={`border-[2px] ${roja !== "" ? roja : medalla} flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-[3px_3px_0px_var(--ink-shadow)] ${esMia ? "font-bold" : ""}`}
            >
              <span aria-hidden="true" className="font-display tabular-brutal bg-surface-container-lowest text-on-surface flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-[2px] border-[var(--ink-border)] text-[14px] font-bold shadow-[1px_1px_0px_var(--ink-shadow)]">
                {f.puesto}
              </span>
              <span className="min-w-0 flex-1 break-words">
                {f.username} {texto}
                {esMia ? (
                  <span className="brutal-chip brutal-chip-live ml-1">{tu}</span>
                ) : null}
              </span>
              <span className="font-display tabular-brutal shrink-0 text-[16px] leading-[20px] font-bold">
                {f.acumulado}
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
