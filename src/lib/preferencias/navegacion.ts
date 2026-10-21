import type { Rol } from "@/src/lib/auth/tipos";
import type { ItemNav } from "./tipos";

export function itemsNavPara(rol: Rol): readonly ItemNav[] {
  if (rol === "admin") {
    return [
      { ruta: "/admin", claveEtiqueta: "ui.nav.admin" },
      { ruta: "/clasificacion", claveEtiqueta: "ui.nav.clasificacion" },
      { ruta: "/jugadores", claveEtiqueta: "ui.nav.jugadores" },
      { ruta: "/normas", claveEtiqueta: "ui.nav.normas" },
      { ruta: "/ajustes", claveEtiqueta: "ui.nav.ajustes" },
    ];
  }
  return [
    { ruta: "/", claveEtiqueta: "ui.nav.home" },
    { ruta: "/equipo", claveEtiqueta: "ui.nav.equipo" },
    { ruta: "/mi-resultado", claveEtiqueta: "ui.nav.resultados" },
    { ruta: "/clasificacion", claveEtiqueta: "ui.nav.clasificacion" },
    { ruta: "/ajustes", claveEtiqueta: "ui.nav.ajustes" },
  ];
}

export interface ContextoNav {
  readonly tieneSesion: boolean;
  readonly esTemporal: boolean;
  readonly onboardingCompleto: boolean;
}

function esRutaAuth(ruta: string): boolean {
  return (
    ruta === "/login" ||
    ruta === "/registro" ||
    ruta === "/cambiar-password" ||
    ruta === "/onboarding"
  );
}

function esRutaNormas(ruta: string): boolean {
  return ruta === "/normas" || ruta.startsWith("/normas/");
}

export function debeMostrarNav(
  ruta: string,
  ctx: ContextoNav,
): boolean {
  if (esRutaAuth(ruta)) {
    return false;
  }
  if (esRutaNormas(ruta)) {
    if (!ctx.tieneSesion) {
      return false;
    }
    if (ctx.esTemporal) {
      return false;
    }
    if (!ctx.onboardingCompleto) {
      return false;
    }
    return true;
  }
  if (!ctx.tieneSesion) {
    return false;
  }
  if (ctx.esTemporal) {
    return false;
  }
  if (!ctx.onboardingCompleto) {
    return false;
  }
  return true;
}
