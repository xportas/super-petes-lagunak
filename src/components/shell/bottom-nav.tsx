import { connection } from "next/server";
import { cookies } from "next/headers";
import { hashearTokenSesion } from "@/src/lib/auth/sesion";
import {
  NOMBRE_COOKIE_SESION,
  buscarSesionPorId,
  buscarUsuarioPorId,
  parsearCookieSesion,
} from "@/src/lib/supabase/auth";
import type { ContextoNav } from "@/src/lib/preferencias/navegacion";
import type { Rol } from "@/src/lib/auth/tipos";
import { NavActiva } from "./nav-activa";

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

async function leerContextoNav(): Promise<{
  readonly rol: Rol | null;
  readonly contexto: ContextoNav;
}> {
  await connection();
  const jar = await cookies();
  const par = parsearCookieSesion(jar.get(NOMBRE_COOKIE_SESION)?.value);
  if (par === null) {
    return {
      rol: null,
      contexto: {
        tieneSesion: false,
        esTemporal: false,
        onboardingCompleto: false,
      },
    };
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
    return {
      rol: null,
      contexto: {
        tieneSesion: false,
        esTemporal: false,
        onboardingCompleto: false,
      },
    };
  }
  const usuario = await buscarUsuarioPorId(sesion.usuarioId).catch(() => null);
  if (usuario === null) {
    return {
      rol: null,
      contexto: {
        tieneSesion: false,
        esTemporal: false,
        onboardingCompleto: false,
      },
    };
  }
  const rol: Rol = usuario.rol === "admin" ? "admin" : "manager";
  return {
    rol,
    contexto: {
      tieneSesion: true,
      esTemporal: usuario.esTemporal,
      onboardingCompleto: aFecha(usuario.onboardingCompletadoAt) !== null,
    },
  };
}

export async function BottomNav(): Promise<React.JSX.Element> {
  const { rol, contexto } = await leerContextoNav();
  return <NavActiva rol={rol} contexto={contexto} />;
}
