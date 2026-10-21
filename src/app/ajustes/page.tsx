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
import {
  parsearModoPete,
  parsearTema,
} from "@/src/lib/preferencias/cookies";
import { BotonCerrarSesion, Interruptores } from "./interruptores";
import { CambiarPassword } from "./cambiar-password";

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

async function ContenidoAjustes(): Promise<React.JSX.Element> {
  await connection();
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
  const modoPete = parsearModoPete(jar.get("modo_pete")?.value);
  const tema = parsearTema(jar.get("tema")?.value);
  const titulo = traducir("es", "ui.ajustes.titulo");
  const etiquetaNormas = traducir("es", "ui.ajustes.normas");
  const textoIdioma = traducir("es", "ui.ajustes.idioma", { idioma: "ES" });
  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-8">
      <h1 className="text-xl font-bold">{titulo}</h1>
      <a
        href="/normas"
        className="tappable flex min-h-[44px] items-center rounded border px-3"
      >
        {etiquetaNormas}
      </a>
      <Interruptores inicialPete={modoPete} inicialTema={tema} />
      <CambiarPassword />
      <p className="flex min-h-[44px] items-center">{textoIdioma}</p>
      <BotonCerrarSesion />
    </main>
  );
}

export default function PaginaAjustes(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <ContenidoAjustes />
    </Suspense>
  );
}
