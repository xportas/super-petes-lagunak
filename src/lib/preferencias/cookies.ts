import { esquemaModoPete, esquemaTema } from "./esquemas";
import type { ModoPete, Preferencias, Tema } from "./tipos";

export function parsearModoPete(valor: unknown): ModoPete {
  const r = esquemaModoPete.safeParse(valor);
  if (r.success) {
    return r.data;
  }
  return "0";
}

export function parsearTema(valor: unknown): Tema {
  const r = esquemaTema.safeParse(valor);
  if (r.success) {
    return r.data;
  }
  return "dark";
}

function extraerCookie(
  cabecera: string,
  nombre: string,
): string | null {
  const partes = cabecera.split(";");
  for (const parte of partes) {
    const igual = parte.indexOf("=");
    if (igual < 0) {
      continue;
    }
    const clave = parte.slice(0, igual).trim();
    if (clave !== nombre) {
      continue;
    }
    const valor = parte.slice(igual + 1).trim();
    try {
      return decodeURIComponent(valor);
    } catch {
      return valor;
    }
  }
  return null;
}

export function leerPreferencias(
  cabecera: string | null,
): Preferencias {
  if (cabecera === null || cabecera.length === 0) {
    return { modoPete: "0", tema: "dark" };
  }
  const crudoPete = extraerCookie(cabecera, "modo_pete");
  const crudoTema = extraerCookie(cabecera, "tema");
  return {
    modoPete: parsearModoPete(crudoPete),
    tema: parsearTema(crudoTema),
  };
}
