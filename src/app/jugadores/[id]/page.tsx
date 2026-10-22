import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
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
  calcularMediaTemporada,
  evolucionVigente,
  ultimaValoracion,
} from "@/src/lib/ficha/media-evolucion";
import type { ActaConJornada } from "@/src/lib/ficha/tipos";
import { resolverEstadoActual } from "@/src/lib/ficha/estado-actual";
import { resolverJornadaActiva } from "@/src/lib/home/resolver-jornada";
import {
  leerActasJugador,
  leerJugadorPorId,
} from "@/src/lib/supabase/queries-ficha";
import { getRachasPrevias } from "@/src/lib/supabase/queries/alineaciones";
import { FichaCabecera } from "@/src/app/components/ficha-cabecera";
import { FichaMedia } from "@/src/app/components/ficha-media";
import { FichaEstado } from "@/src/app/components/ficha-estado";
import { FichaEvolucion } from "@/src/app/components/ficha-evolucion";
import { GraficaEvolucion } from "@/src/app/components/grafica-evolucion";

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

async function ContenidoFicha(props: {
  readonly id: string;
}): Promise<React.JSX.Element> {
  await connection();
  const parsed = z.string().uuid().safeParse(props.id);
  if (!parsed.success) {
    notFound();
  }
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
  if (aFecha(usuario.onboardingCompletadoAt) === null && usuario.rol !== "admin") {
    redirect("/onboarding");
  }
  const modoPete = parsearModoPete(jar.get("modo_pete")?.value) === "1";

  const ficha = await leerJugadorPorId(props.id);
  if (ficha.tipo !== "jugador") {
    notFound();
  }
  const jugador = ficha.jugador;
  const actas = await leerActasJugador(props.id);
  const actasConJornada: ActaConJornada[] = actas.map((a) => ({
    jornadaId: a.jornada.id,
    etiqueta: `J${a.jornada.numeroJornada}`,
    base: a.resultado.valoracion,
    estado: a.resultado.estado,
    estadoJornada: a.jornada.estado,
    horaPartido: a.jornada.horaPartido,
    numeroJornada: a.jornada.numeroJornada,
  }));
  const vigencia = { fechaAlta: jugador.fechaAlta, fechaBaja: jugador.fechaBaja };
  const evolucion = evolucionVigente(actasConJornada, vigencia);
  const media = calcularMediaTemporada(
    evolucion.map((f) => ({
      base: f.base,
      estado: f.estado,
      estadoJornada: "calculada" as const,
    })),
  );
  const ultima = ultimaValoracion(actasConJornada, vigencia);

  let rachaActual: number | null = null;
  if (usuario.rol !== "admin") {
    try {
      const db = obtenerClienteService();
      const { data: filasJornada } = await db
        .from("jornada")
        .select("id,numero_jornada,hora_partido,estado,rival");
      const jornadas = ((filasJornada ?? []) as unknown as Array<{
        readonly id: string;
        readonly numero_jornada?: number;
        readonly numeroJornada?: number;
        readonly hora_partido?: string;
        readonly horaPartido?: string;
        readonly estado: string;
        readonly rival?: string;
      }>)
        .map((f) => {
          const hora = aFecha(f.hora_partido ?? f.horaPartido);
          if (hora === null) {
            return null;
          }
          if (
            f.estado !== "pendiente" &&
            f.estado !== "calculada" &&
            f.estado !== "papel" &&
            f.estado !== "invalidada"
          ) {
            return null;
          }
          return {
            jornadaId: f.id,
            numeroJornada: f.numero_jornada ?? f.numeroJornada ?? 0,
            horaPartido: hora,
            estado: f.estado as
              | "pendiente"
              | "calculada"
              | "papel"
              | "invalidada",
            rival: typeof f.rival === "string" ? f.rival : "",
          };
        })
        .filter(
          (
            j,
          ): j is {
            readonly jornadaId: string;
            readonly numeroJornada: number;
            readonly horaPartido: Date;
            readonly estado: "pendiente" | "calculada" | "papel" | "invalidada";
            readonly rival: string;
          } => j !== null,
        );
      const resActiva = resolverJornadaActiva(jornadas, new Date());
      if (resActiva.tipo === "activa") {
        const rachas = await getRachasPrevias(usuario.id, {
          jornadaId: resActiva.jornada.jornadaId,
          numeroJornada: resActiva.jornada.numeroJornada,
          horaPartido: resActiva.jornada.horaPartido,
          estado: resActiva.jornada.estado,
          rival: "",
        }).catch(() => new Map<string, number>());
        rachaActual = rachas.get(props.id) ?? 0;
      } else {
        rachaActual = 0;
      }
    } catch {
      rachaActual = 0;
    }
  }

  const estado = resolverEstadoActual(
    { activo: jugador.activo, estadoSanitario: jugador.estadoSanitario },
    rachaActual,
  );
  const etiquetaBaja = traducir("es", "ui.jugadores.baja");

  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
      {!jugador.activo ? (
        <p role="status" className="flex min-h-[44px] items-center rounded border px-3 text-sm font-bold">
          {etiquetaBaja}
        </p>
      ) : null}
      <FichaCabecera jugador={jugador} modoPete={modoPete} />
      <FichaMedia media={media} ultima={ultima} />
      <FichaEstado estado={estado} />
      <FichaEvolucion filas={evolucion} />
      <GraficaEvolucion filas={evolucion} />
    </main>
  );
}

export default function PaginaFicha(props: {
  readonly params: Promise<{ readonly id: string }>;
}): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <EnvolturaFicha params={props.params} />
    </Suspense>
  );
}

async function EnvolturaFicha(props: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<React.JSX.Element> {
  const p = await props.params.catch(() => null);
  if (p === null || typeof p.id !== "string") {
    notFound();
  }
  return <ContenidoFicha id={p.id} />;
}
