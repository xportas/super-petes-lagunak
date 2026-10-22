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
  parsearCookieSesion,
} from "@/src/lib/supabase/auth";
import { listarJornadasAdmin } from "@/src/lib/supabase/queries/jornadas";
import { listarJugadoresAdmin } from "@/src/lib/supabase/queries/jugadores";
import {
  leerInvitacionVigenteDB,
  listarUsuariosAdmin,
} from "@/src/lib/supabase/queries/usuarios";
import type { TabAdmin } from "@/src/lib/admin/tipos";
import { TabsAdmin } from "./_components/tabs";
import { JornadaForm } from "./_components/jornada-form";
import { JugadorForm } from "./_components/jugador-form";
import { ActaForm } from "./_components/acta-form";
import { PendientesBanner } from "./_components/pendientes-banner";
import { UsuariosTable } from "./_components/usuarios-table";
import { InvitacionPanel } from "./_components/invitacion-panel";

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

function parsearTab(valor: unknown): TabAdmin {
  if (
    valor === "jornadas" ||
    valor === "jugadores" ||
    valor === "resultados" ||
    valor === "usuarios" ||
    valor === "invitacion"
  ) {
    return valor;
  }
  return "jornadas";
}

async function LazySyncAdmin(): Promise<null> {
  await connection();
  try {
    const mod = await import("@/src/lib/fnb/pre-relleno");
    await mod.listarCalendarioFnb().catch(() => null);
  } catch {
    // FNB caída: se sirve BD en silencio.
  }
  return null;
}

async function ContenidoAdmin(props: {
  readonly tab: TabAdmin;
}): Promise<React.JSX.Element> {
  await connection();
  const jar = await cookies();
  const par = parsearCookieSesion(jar.get(NOMBRE_COOKIE_SESION)?.value);
  if (par === null) {
    redirect("/login");
  }
  const sesion = await buscarSesionPorId(par.id).catch(() => null);
  const ahora = new Date();
  if (
    sesion === null ||
    aFecha(sesion.expiraAt) === null ||
    (aFecha(sesion.expiraAt) as Date).getTime() <= ahora.getTime() ||
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
  if (usuario.rol !== "admin") {
    redirect("/");
  }
  const titulo = traducir("es", "ui.admin.titulo");
  let jornadas: Awaited<ReturnType<typeof listarJornadasAdmin>> = [];
  let jugadores: Awaited<ReturnType<typeof listarJugadoresAdmin>> = [];
  try {
    jornadas = await listarJornadasAdmin();
  } catch {
    jornadas = [];
  }
  try {
    jugadores = await listarJugadoresAdmin();
  } catch {
    jugadores = [];
  }
  const pendientes = jugadores.filter(
    (j) => j.activo && j.posicionesValidas === null,
  ).length;

  if (props.tab === "usuarios") {
    let filas: Array<{ id: string; username: string; esTemporal: boolean }> = [];
    try {
      const usuarios = await listarUsuariosAdmin();
      filas = usuarios.map((u) => ({
        id: u.id,
        username: u.username,
        esTemporal: u.esTemporal,
      }));
    } catch {
      filas = [];
    }
    return (
      <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
        <h1 className="text-xl font-bold">{titulo}</h1>
        <TabsAdmin activa={props.tab} />
        <UsuariosTable filas={filas} />
      </main>
    );
  }
  if (props.tab === "invitacion") {
    let vigente: string | null = null;
    try {
      vigente = (await leerInvitacionVigenteDB())?.codigo ?? null;
    } catch {
      vigente = null;
    }
    return (
      <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
        <h1 className="text-xl font-bold">{titulo}</h1>
        <TabsAdmin activa={props.tab} />
        <InvitacionPanel vigente={vigente} />
      </main>
    );
  }
  if (props.tab === "jugadores") {
    return (
      <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
        <h1 className="text-xl font-bold">{titulo}</h1>
        <TabsAdmin activa={props.tab} />
        <PendientesBanner cantidad={pendientes} />
        <JugadorForm />
        <ul className="flex flex-col gap-2">
          {jugadores.map((j) => (
            <li
              key={j.id}
              className="flex min-h-[44px] items-center rounded border px-3 py-2 text-sm"
            >
              <span className="flex-1">{j.nombre}</span>
            </li>
          ))}
        </ul>
      </main>
    );
  }
  if (props.tab === "resultados") {
    const primera = jornadas[0] ?? null;
    return (
      <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
        <h1 className="text-xl font-bold">{titulo}</h1>
        <TabsAdmin activa={props.tab} />
        <PendientesBanner cantidad={pendientes} />
        {primera === null ? null : (
          <ActaForm
            jornadaId={primera.id}
            filas={jugadores.slice(0, 5).map((j) => ({
              jugadorId: j.id,
              nombre: j.nombre,
              valoracion: 0,
              estado: "jugo" as const,
            }))}
          />
        )}
      </main>
    );
  }
  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
      <h1 className="text-xl font-bold">{titulo}</h1>
      <TabsAdmin activa={props.tab} />
      <JornadaForm />
      <ul className="flex flex-col gap-2">
        {jornadas.map((j) => (
          <li
            key={j.id}
            className="flex min-h-[44px] items-center rounded border px-3 py-2 text-sm"
          >
            <span className="flex-1">{j.rival}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default function PaginaAdmin(props: {
  readonly searchParams?: Promise<{ readonly tab?: string }>;
}): React.JSX.Element {
  return (
    <>
      <Suspense fallback={null}>
        <LazySyncAdmin />
      </Suspense>
      <Suspense fallback={null}>
        <EnvolturaAdmin searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function EnvolturaAdmin(props: {
  readonly searchParams: Promise<{ readonly tab?: string }> | undefined;
}): Promise<React.JSX.Element> {
  const buscado = await props.searchParams?.catch(() => undefined);
  return <ContenidoAdmin tab={parsearTab(buscado?.tab)} />;
}
