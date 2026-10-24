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
import { validarCierre, ordenarJornadasCanonico } from "@/src/lib/dominio/cierre";
import { estadoOnboardingPara } from "@/src/lib/auth/onboarding";
import { Paso1 } from "./paso-1";
import { Paso2 } from "./paso-2";

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

async function ContenidoOnboarding(props: {
  readonly pasoPedido: 1 | 2 | null;
}): Promise<React.JSX.Element> {
  await connection();
  const titulo = traducir("es", "ui.onboarding.titulo");
  const jar = await cookies();
  const par = parsearCookieSesion(jar.get(NOMBRE_COOKIE_SESION)?.value);
  if (par === null) {
    redirect("/login");
  }
  const sesion = await buscarSesionPorId(par.id).catch(() => null);
  const expira = sesion === null ? null : aFecha(sesion.expiraAt);
  const ahoraMs = new Date().getTime();
  if (
    sesion === null ||
    expira === null ||
    expira.getTime() <= ahoraMs ||
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
  if (aFecha(usuario.onboardingCompletadoAt) !== null) {
    redirect(usuario.rol === "admin" ? "/admin" : "/");
  }
  if (usuario.rol === "admin") {
    redirect("/admin");
  }
  const ahora = new Date();
  let jornada: {
    readonly jornadaId: string;
    readonly horaPartido: Date | null;
    readonly estado: "pendiente" | "calculada" | "papel" | "invalidada";
  } | null = null;
  let jugadores: Array<{
    readonly id: string;
    readonly nombre: string;
    readonly nombrePete: string | null;
  }> = [];
  let tieneQuinteto = false;
  let precarga: {
    readonly jugadorIds: readonly string[];
    readonly posicionPorJugador: Readonly<Record<string, string>>;
    readonly entrenador: string;
    readonly capitanId: string;
  } | null = null;
  try {
    const db = obtenerClienteService();
    const { data: filas } = await db
      .from("jornada")
      .select("id,numero_jornada,hora_partido,estado");
    const candidatas = ((filas ?? []) as Array<{
      readonly id: string;
      readonly numero_jornada?: number;
      readonly numeroJornada?: number;
      readonly hora_partido?: string;
      readonly horaPartido?: string;
      readonly estado: string;
    }>)
      .map((j) => ({
        jornadaId: j.id,
        numeroJornada: j.numero_jornada ?? j.numeroJornada ?? 0,
        horaPartido: aFecha(j.hora_partido ?? j.horaPartido) ?? new Date("invalid"),
        estado: j.estado as "pendiente" | "calculada" | "papel" | "invalidada",
      }))
      .filter((j) => aFecha(j.horaPartido) !== null);
    const ordenadas = ordenarJornadasCanonico(
      candidatas.filter(
        (j): j is typeof j & { readonly horaPartido: Date } =>
          aFecha(j.horaPartido) !== null,
      ) as Array<{
        readonly jornadaId: string;
        readonly numeroJornada: number;
        readonly horaPartido: Date;
        readonly estado: "pendiente" | "calculada" | "papel" | "invalidada";
      }>,
    );
    const abierta = ordenadas.find(
      (j) => j.estado === "pendiente" && validarCierre(j.horaPartido, ahora).abierto,
    );
    const primeraPendiente = ordenadas.find((j) => j.estado === "pendiente");
    const elegida = abierta ?? primeraPendiente ?? null;
    if (elegida !== null) {
      jornada = {
        jornadaId: elegida.jornadaId,
        horaPartido: elegida.horaPartido,
        estado: elegida.estado,
      };
    }
    const { data: plantilla } = await db
      .from("jugador")
      .select("id,nombre,nombre_pete,activo,posiciones_validas");
    jugadores = ((plantilla ?? []) as Array<{
      readonly id: string;
      readonly nombre: string;
      readonly nombre_pete?: string | null;
      readonly nombrePete?: string | null;
      readonly activo: boolean;
      readonly posiciones_validas?: readonly [string, string] | null;
      readonly posicionesValidas?: readonly [string, string] | null;
    }>)
      .filter((j) => j.activo && (j.posiciones_validas ?? j.posicionesValidas) !== null)
      .map((j) => ({ id: j.id, nombre: j.nombre, nombrePete: j.nombre_pete ?? j.nombrePete ?? null }));
    if (jornada !== null) {
      const { data: aline } = await db
        .from("alineacion")
        .select("id,entrenador,capitan_jugador_id")
        .eq("manager_id", usuario.id)
        .eq("jornada_id", jornada.jornadaId)
        .maybeSingle();
      if (aline !== null) {
        const fila = aline as {
          readonly id: string;
          readonly entrenador: string;
          readonly capitan_jugador_id?: string;
          readonly capitanJugadorId?: string;
        };
        const capitanId = fila.capitan_jugador_id ?? fila.capitanJugadorId ?? "";
        const { data: sels } = await db
          .from("alineacion_seleccion")
          .select("jugador_id,posicion_alineada")
          .eq("alineacion_id", fila.id);
        const lista = (((sels ?? []) as Array<{
          readonly jugador_id?: string;
          readonly jugadorId?: string;
          readonly posicion_alineada?: string;
          readonly posicionAlineada?: string;
        }>).map((s) => ({
          jugadorId: s.jugador_id ?? s.jugadorId ?? "",
          posicionAlineada: s.posicion_alineada ?? s.posicionAlineada ?? "",
        }))).filter(
          (s): s is { readonly jugadorId: string; readonly posicionAlineada: string } =>
            s.jugadorId !== "" && s.posicionAlineada !== "",
        );
        if (lista.length === 5) {
          tieneQuinteto = true;
          const posicionPorJugador: Record<string, string> = {};
          for (const s of lista) {
            posicionPorJugador[s.jugadorId] = s.posicionAlineada;
          }
          precarga = {
            jugadorIds: lista.map((s) => s.jugadorId),
            posicionPorJugador,
            entrenador: fila.entrenador,
            capitanId,
          };
        }
      }
    }
  } catch {
    jornada = null;
  }
  const pasoActual =
    aFecha(usuario.onboardingCompletadoAt) !== null
      ? ("completado" as const)
      : usuario.onboardingPaso === 2
        ? (2 as const)
        : (1 as const);
  const estado = estadoOnboardingPara(pasoActual, jornada, ahora, tieneQuinteto);
  let paso: 1 | 2 = 1;
  if (estado.estado === "listo_paso_2") {
    paso = 2;
  } else if (estado.estado === "quinteto_requerido") {
    paso = 1;
  } else if (props.pasoPedido !== null) {
    paso = props.pasoPedido;
  } else if (tieneQuinteto) {
    paso = 2;
  }
  const modo: "requerido" | "sin_jornada" | "cierre_pasado" | "listo" =
    estado.estado === "quinteto_requerido"
      ? "requerido"
      : estado.estado === "cierre_pasado"
        ? "cierre_pasado"
        : estado.estado === "sin_jornada"
          ? "sin_jornada"
          : "listo";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col gap-4 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <section className="brutal-card-lg mt-8 flex flex-col gap-2 p-3">
        <span className="brutal-hazard-bar" aria-hidden="true" />
        <h1 className="brutal-title text-[22px] leading-[26px]">{titulo}</h1>
      </section>
      {paso === 1 ? (
        <Paso1
          jugadores={jugadores}
          precarga={precarga}
          modo={modo}
          modoPete={false}
        />
      ) : (
        <Paso2 />
      )}
    </main>
  );
}

export default function PaginaOnboarding(props: {
  readonly searchParams?: Promise<{ readonly paso?: string }>;
}): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <EnvolturaOnboarding searchParams={props.searchParams} />
    </Suspense>
  );
}

async function EnvolturaOnboarding(props: {
  readonly searchParams: Promise<{ readonly paso?: string }> | undefined;
}): Promise<React.JSX.Element> {
  const buscado = await props.searchParams?.catch(() => undefined);
  const pasoPedido = buscado?.paso === "2" ? 2 : buscado?.paso === "1" ? 1 : null;
  return <ContenidoOnboarding pasoPedido={pasoPedido} />;
}
