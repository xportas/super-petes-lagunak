import type { DestinoGuardia, PasoOnboarding, Rol } from "./tipos";

export interface ContextoGuardia {
  readonly tieneSesion: boolean;
  readonly esTemporal: boolean;
  readonly rol: Rol;
  readonly onboardingPaso: PasoOnboarding;
  readonly ruta: string;
}

function esRutaPublica(ruta: string): boolean {
  if (ruta === "/normas") {
    return true;
  }
  return ruta.startsWith("/normas/") || ruta.startsWith("/normas#");
}

function esRutaAuth(ruta: string): boolean {
  return ruta === "/login" || ruta === "/registro" || ruta === "/home";
}

export function resolverDestino(ctx: ContextoGuardia): DestinoGuardia {
  const ruta = ctx.ruta;
  if (!ctx.tieneSesion) {
    if (ruta === "/login" || ruta === "/registro" || esRutaPublica(ruta)) {
      return { a: "permitir" };
    }
    return { a: "/login" };
  }
  if (ctx.esTemporal) {
    if (ruta === "/cambiar-password" || esRutaPublica(ruta)) {
      return { a: "permitir" };
    }
    return { a: "/cambiar-password" };
  }
  if (ctx.rol === "manager" && ctx.onboardingPaso !== "completado") {
    if (ruta === "/onboarding") {
      return { a: "permitir" };
    }
    if (esRutaPublica(ruta)) {
      return { a: "permitir" };
    }
    const paso: 1 | 2 = ctx.onboardingPaso === 2 ? 2 : 1;
    return { a: "/onboarding", paso };
  }
  if (ruta === "/onboarding") {
    if (ctx.rol === "admin") {
      return { a: "/admin" };
    }
    return { a: "/" };
  }
  if (esRutaAuth(ruta)) {
    if (ctx.rol === "admin") {
      return { a: "/admin" };
    }
    return { a: "/" };
  }
  if (ruta === "/admin" && ctx.rol !== "admin") {
    return { a: "/" };
  }
  return { a: "permitir" };
}
