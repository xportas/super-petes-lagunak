import { z } from "zod";

export const esquemaUsername = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[A-Za-z0-9_-]+$/);

export const esquemaPassword = z
  .string()
  .min(8)
  .max(72)
  .refine((s) => s.trim().length >= 1, { message: "password_formato" });

export const esquemaCodigo = z
  .string()
  .trim()
  .min(1)
  .transform((s) => s.toLowerCase());

export const esquemaRegistro = z.object({
  username: esquemaUsername,
  password: esquemaPassword,
  codigo: esquemaCodigo,
});

export const esquemaLogin = z.object({
  username: esquemaUsername,
  password: z.string().min(1),
});

export const esquemaCambiar = z.object({
  actual: z.string().min(1),
  nueva: esquemaPassword,
});

export const esquemaConfirmarPaso2 = z.object({
  entendido: z.literal(true),
});

export type CodigoRegistro = "INVITACION" | "USERNAME" | "PASSWORD";

export interface RegistroValido {
  readonly username: string;
  readonly password: string;
  readonly codigo: string;
}

export function validarRegistroOrdenado(
  entrada: unknown,
):
  | { readonly ok: true; readonly datos: RegistroValido }
  | { readonly ok: false; readonly codigo: CodigoRegistro } {
  if (typeof entrada !== "object" || entrada === null) {
    return { ok: false, codigo: "INVITACION" };
  }
  const registro = entrada as Record<string, unknown>;
  const pCodigo = esquemaCodigo.safeParse(registro["codigo"]);
  if (!pCodigo.success) {
    return { ok: false, codigo: "INVITACION" };
  }
  const pUsuario = esquemaUsername.safeParse(registro["username"]);
  if (!pUsuario.success) {
    return { ok: false, codigo: "USERNAME" };
  }
  const pClave = esquemaPassword.safeParse(registro["password"]);
  if (!pClave.success) {
    return { ok: false, codigo: "PASSWORD" };
  }
  return {
    ok: true,
    datos: {
      username: pUsuario.data,
      password: pClave.data,
      codigo: pCodigo.data,
    },
  };
}

export function validarLogin(
  entrada: unknown,
):
  | { readonly ok: true; readonly username: string; readonly password: string }
  | { readonly ok: false; readonly codigo: "CREDENCIALES" } {
  const r = esquemaLogin.safeParse(entrada);
  if (!r.success) {
    return { ok: false, codigo: "CREDENCIALES" };
  }
  return {
    ok: true,
    username: r.data.username,
    password: r.data.password,
  };
}

export function validarCambioPassword(
  entrada: unknown,
  esTemporal: boolean,
):
  | { readonly ok: true; readonly actual: string; readonly nueva: string }
  | { readonly ok: false; readonly codigo: "FORMATO" | "NUEVA_DISTINTA" } {
  if (typeof entrada !== "object" || entrada === null) {
    return { ok: false, codigo: "FORMATO" };
  }
  const registro = entrada as Record<string, unknown>;
  const pNueva = esquemaPassword.safeParse(registro["nueva"]);
  if (!pNueva.success) {
    return { ok: false, codigo: "FORMATO" };
  }
  if (esTemporal) {
    const actual =
      typeof registro["actual"] === "string" ? registro["actual"] : "";
    if (pNueva.data === actual) {
      return { ok: false, codigo: "NUEVA_DISTINTA" };
    }
    return { ok: true, actual, nueva: pNueva.data };
  }
  const r = esquemaCambiar.safeParse(entrada);
  if (!r.success) {
    return { ok: false, codigo: "FORMATO" };
  }
  if (r.data.nueva === r.data.actual) {
    return { ok: false, codigo: "NUEVA_DISTINTA" };
  }
  return { ok: true, actual: r.data.actual, nueva: r.data.nueva };
}
