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
import { parsearModoPete } from "@/src/lib/preferencias/cookies";
import {
  leerJornadasOrdenadas,
  leerManagersElegibles,
} from "@/src/lib/supabase/resultados";
import {
  construirHistorial,
  construirTotales,
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
import { Destacada } from "./destacada";
import { FilaSinEnvio } from "./fila-sin-envio";
import { DetalleDesglose } from "./_components/detalle-desglose";
import {
  HistorialAcordeon,
  type FilaAcordeon,
} from "./historial-acordeon";

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

async function ContenidoMiResultado(): Promise<React.JSX.Element> {
  await connection();
  const titulo = traducir("es", "ui.resultados.titulo");
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
  if (usuario.rol === "admin") {
    const textoAdmin = traducir("es", "errors.resultados.admin_sin_historial");
    return (
      <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
        <h1 className="text-xl font-bold">{titulo}</h1>
        <p role="alert" className="flex min-h-[44px] items-center text-sm">
          {textoAdmin}
        </p>
      </main>
    );
  }
  if (aFecha(usuario.onboardingCompletadoAt) === null) {
    redirect("/onboarding");
  }
  const modoPete = parsearModoPete(jar.get("modo_pete")?.value) === "1";

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
    .select("id,nombre,nombre_pete,posiciones_validas");

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
  const nombres = new Map<
    string,
    { readonly nombre: string; readonly nombrePete: string | null }
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
    if (typeof f["nombre"] === "string") {
      const nombrePete = f["nombre_pete"] ?? f["nombrePete"];
      nombres.set(f["id"] as string, {
        nombre: f["nombre"] as string,
        nombrePete:
          typeof nombrePete === "string"
            ? (nombrePete as string)
            : null,
      });
    }
  }

  const { totalesPorManager, desglosesPorManager } = construirTotales({
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

  const historial = construirHistorial({
    managerId: usuario.id,
    onboardingCompletadoAt: usuario.onboardingCompletadoAt,
    jornadas: jornadas.map((j) => ({
      jornadaId: j.id,
      numeroJornada: j.numeroJornada,
      horaPartido: j.horaPartido,
      estado: j.estado,
    })),
    desgloses: desglosesPorManager.get(usuario.id) ?? new Map(),
    totalesPorManager,
    managers: managers.map((m) => ({ id: m.id, username: m.username })),
  });

  const sinDatos = traducir("es", "ui.resultados.sin_datos");
  const historialTitulo = traducir("es", "ui.resultados.historial_titulo");

  const filas: FilaAcordeon[] = historial.filas.map((fila) => {
    if (fila.kind === "sin_envio") {
      const etiqueta = traducir("es", "ui.resultados.jornada", {
        numero: fila.numeroJornada,
      });
      const puntos = traducir("es", "ui.resultados.fila_puntos", {
        puntos: fila.total,
        puesto: fila.puestoAcumulado,
      });
      return {
        id: fila.jornadaId,
        titulo: `${etiqueta} ${puntos}`,
        contenido: <FilaSinEnvio />,
      };
    }
    const etiqueta = traducir("es", "ui.resultados.jornada", {
      numero: fila.desglose.numeroJornada,
    });
    const puntos = traducir("es", "ui.resultados.fila_puntos", {
      puntos: fila.desglose.total,
      puesto: fila.puestoAcumulado,
    });
    return {
      id: fila.desglose.jornadaId,
      titulo: `${etiqueta} ${puntos}`,
      contenido: (
        <DetalleDesglose
          desglose={fila.desglose}
          nombres={nombres}
          modoPete={modoPete}
        />
      ),
    };
  });

  const verNormas = traducir("es", "ui.resultados.ver_normas");

  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
      <h1 className="text-xl font-bold">{titulo}</h1>
      {historial.destacada === null ? (
        <p className="flex min-h-[44px] items-center text-sm">{sinDatos}</p>
      ) : (
        <Destacada
          desglose={historial.destacada}
          nombres={nombres}
          modoPete={modoPete}
        />
      )}
      <section aria-label={historialTitulo} className="flex w-full flex-col gap-2">
        <h2 className="text-base font-bold">{historialTitulo}</h2>
        {filas.length === 0 ? (
          <p className="flex min-h-[44px] items-center text-sm">{sinDatos}</p>
        ) : (
          <HistorialAcordeon filas={filas} />
        )}
      </section>
      {historial.avisos.length === 0 ? null : (
        <section className="flex w-full flex-col gap-2">
          {historial.avisos.map((a) => (
            <p
              key={a.jornadaId}
              role="status"
              className="flex min-h-[44px] flex-wrap items-center gap-2 text-sm"
            >
              <span>
                {traducir("es", "ui.resultados.aviso_excluida", {
                  numero: a.numeroJornada,
                })}
              </span>
              <a
                href="/normas#orden"
                className="tappable flex min-h-[44px] items-center underline"
              >
                {verNormas}
              </a>
            </p>
          ))}
        </section>
      )}
    </main>
  );
}

export default function PaginaMiResultado(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <ContenidoMiResultado />
    </Suspense>
  );
}
