import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { FormularioRegistro } from "./formulario";
import { resolverDestino } from "@/src/lib/auth/guardas";
import { hashearTokenSesion } from "@/src/lib/auth/sesion";
import {
  NOMBRE_COOKIE_SESION,
  buscarSesionPorId,
  buscarUsuarioPorId,
  parsearCookieSesion,
} from "@/src/lib/supabase/auth";

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

async function ContenidoRegistro(): Promise<React.JSX.Element> {
  await connection();
  const jar = await cookies();
  const par = parsearCookieSesion(jar.get(NOMBRE_COOKIE_SESION)?.value);
  if (par !== null) {
    const sesion = await buscarSesionPorId(par.id).catch(() => null);
    const expira = sesion === null ? null : aFecha(sesion.expiraAt);
    const ahoraMs = new Date().getTime();
    if (
      sesion !== null &&
      expira !== null &&
      expira.getTime() > ahoraMs &&
      aFecha(sesion.revocadaAt) === null &&
      sesion.tokenHash === hashearTokenSesion(par.token)
    ) {
      const usuario = await buscarUsuarioPorId(sesion.usuarioId).catch(
        () => null,
      );
      if (usuario !== null) {
        const destino = resolverDestino({
          tieneSesion: true,
          esTemporal: usuario.esTemporal,
          rol: usuario.rol === "admin" ? "admin" : "manager",
          onboardingPaso:
            aFecha(usuario.onboardingCompletadoAt) !== null
              ? "completado"
              : usuario.onboardingPaso === 2
                ? 2
                : 1,
          ruta: "/registro",
        });
        if (destino.a !== "permitir") {
          redirect(destino.a === "/onboarding" ? "/onboarding" : destino.a);
        } else {
          redirect(usuario.rol === "admin" ? "/admin" : "/");
        }
      }
    }
  }
  return <FormularioRegistro />;
}

export default function PaginaRegistro(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <ContenidoRegistro />
    </Suspense>
  );
}
