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
import { calcularCierre } from "@/src/lib/dominio/cierre";
import {
  getAlineacion,
  getRachasPrevias,
  resolverJornadaActiva,
  type JornadaEquipo,
} from "@/src/lib/supabase/queries/alineaciones";
import type { Posicion } from "@/src/lib/scoring/tipos";
import { EquipoEditor } from "./_components/equipo-editor";
import type { JugadorElegibleEquipo } from "./_lib/preview-equipo";

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

function formatearCierre(horaPartido: Date): string {
  const cierre = calcularCierre(horaPartido);
  const fmt = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.format(cierre);
}

interface FilaJugador {
  readonly id: string;
  readonly nombre: string;
  readonly nombrePete: string | null;
  readonly img: string;
  readonly imgPete: string;
  readonly posicionesValidas: readonly [Posicion, Posicion] | null;
  readonly estadoSanitario: string;
  readonly activo: boolean;
}

async function ContenidoEquipo(): Promise<React.JSX.Element> {
  await connection();
  const titulo = traducir("es", "ui.equipo.titulo");
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
    const textoAdmin = traducir("es", "errors.admin.no_juega");
    return (
      <main className="flex w-full flex-col gap-4 px-4 pt-8">
        <h1 className="text-xl font-bold">{titulo}</h1>
        <p role="alert" className="min-h-[44px] rounded border px-3 py-3">
          {textoAdmin}
        </p>
      </main>
    );
  }
  if (aFecha(usuario.onboardingCompletadoAt) === null) {
    redirect("/onboarding");
  }
  const modoPete = parsearModoPete(jar.get("modo_pete")?.value) === "1";
  let jornadas: JornadaEquipo[] = [];
  let jugadores: JugadorElegibleEquipo[] = [];
  try {
    const db = obtenerClienteService();
    const { data: filasJornada } = await db
      .from("jornada")
      .select("id,numeroJornada,horaPartido,estado,rival");
    const lista = ((filasJornada ?? []) as unknown as Array<{
      readonly id: string;
      readonly numeroJornada: number;
      readonly horaPartido: string | Date;
      readonly estado: string;
      readonly rival?: string;
    }>)
      .map((f) => {
        const hora = aFecha(f.horaPartido);
        if (hora === null) {
          return null;
        }
        const estado = f.estado;
        if (
          estado !== "pendiente" &&
          estado !== "calculada" &&
          estado !== "papel" &&
          estado !== "invalidada"
        ) {
          return null;
        }
        return {
          jornadaId: f.id,
          numeroJornada: f.numeroJornada,
          horaPartido: hora,
          estado,
          rival: typeof f.rival === "string" ? f.rival : "",
        } as JornadaEquipo;
      })
      .filter((j): j is JornadaEquipo => j !== null);
    jornadas = lista;
    const { data: filasJugador } = await db
      .from("jugador")
      .select("id,nombre,nombrePete,img,imgPete,posicionesValidas,estadoSanitario,activo");
    jugadores = ((filasJugador ?? []) as unknown as FilaJugador[]).map((f) => ({
      id: f.id,
      nombre: f.nombre,
      nombrePete: f.nombrePete,
      img: f.img,
      imgPete: f.imgPete,
      posicionesValidas: f.posicionesValidas,
      estadoSanitario:
        f.estadoSanitario === "lesionado" ? "lesionado" : "disponible",
      activo: f.activo,
    }));
  } catch {
    jornadas = [];
    jugadores = [];
  }
  const activa = resolverJornadaActiva(jornadas);
  if (activa === null) {
    const vacio = traducir("es", "ui.equipo.vacio_cerrado");
    return (
      <main className="flex w-full flex-col gap-4 px-4 pt-8">
        <h1 className="text-xl font-bold">{titulo}</h1>
        <p className="min-h-[44px] rounded border px-3 py-3">{vacio}</p>
      </main>
    );
  }
  const cierre = calcularCierre(activa.horaPartido);
  const cerrado = !(ahora.getTime() < cierre.getTime());
  const ultima = await getAlineacion(usuario.id, activa.jornadaId).catch(
    () => null,
  );
  let rachas: ReadonlyMap<string, number> = new Map();
  try {
    rachas = await getRachasPrevias(usuario.id, activa);
  } catch {
    rachas = new Map();
  }
  const rachasPlanas: Record<string, number> = {};
  for (const [k, v] of rachas) {
    rachasPlanas[k] = v;
  }
  const etiquetaJornada = traducir("es", "ui.equipo.jornada", {
    num: activa.numeroJornada,
    rival: activa.rival,
  });
  const textoCierre = cerrado
    ? traducir("es", "ui.equipo.cerrado")
    : traducir("es", "ui.equipo.cierre_en", {
        time: formatearCierre(activa.horaPartido),
      });
  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-8">
      <h1 className="text-xl font-bold">{titulo}</h1>
      <p aria-live="polite" className="flex min-h-[44px] flex-col text-sm">
        <span>{etiquetaJornada}</span>
        <span>{textoCierre}</span>
      </p>
      <EquipoEditor
        jornadaId={activa.jornadaId}
        jugadores={jugadores}
        inicial={
          ultima === null
            ? null
            : {
                slots: { ...ultima.slots },
                entrenador: ultima.entrenador,
                capitan: ultima.capitanId,
              }
        }
        rachas={rachasPlanas}
        modoPete={modoPete}
        readonly={cerrado}
      />
    </main>
  );
}

export default function PaginaEquipo(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <ContenidoEquipo />
    </Suspense>
  );
}
