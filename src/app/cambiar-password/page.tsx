import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { FormularioCambiar } from "./formulario";
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

async function ContenidoCambiar(): Promise<React.JSX.Element> {
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
  return <FormularioCambiar />;
}

export default function PaginaCambiar(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <ContenidoCambiar />
    </Suspense>
  );
}
