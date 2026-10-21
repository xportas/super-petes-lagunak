"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  esquemaModoPete,
  esquemaTema,
} from "@/src/lib/preferencias/esquemas";

const UN_ANO_SEGUNDOS = 365 * 24 * 3600;

export async function establecerModoPete(
  valor: unknown,
): Promise<void> {
  const parsed = esquemaModoPete.safeParse(valor);
  const final = parsed.success ? parsed.data : "0";
  const jar = await cookies();
  jar.set("modo_pete", final, {
    path: "/",
    sameSite: "lax",
    maxAge: UN_ANO_SEGUNDOS,
  });
  revalidatePath("/ajustes");
  revalidatePath("/normas");
}

export async function establecerTema(valor: unknown): Promise<void> {
  const parsed = esquemaTema.safeParse(valor);
  const final = parsed.success ? parsed.data : "dark";
  const jar = await cookies();
  jar.set("tema", final, {
    path: "/",
    sameSite: "lax",
    maxAge: UN_ANO_SEGUNDOS,
  });
  revalidatePath("/ajustes");
  revalidatePath("/normas");
}

export async function cambiarPassword(
  entrada: unknown,
): Promise<{ readonly ok: boolean; readonly codigo?: string; readonly retomarOnboarding?: boolean }> {
  const mod = await import("@/src/app/cambiar-password/actions");
  return mod.cambiarPassword(entrada);
}

export async function cerrarSesion(): Promise<{
  readonly ok: boolean;
  readonly codigo?: string;
}> {
  const mod = await import("@/src/app/login/actions");
  return mod.cerrarSesion();
}
