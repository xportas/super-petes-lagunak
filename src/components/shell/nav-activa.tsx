"use client";

import { usePathname } from "next/navigation";
import { traducir } from "@/src/lib/i18n";
import {
  debeMostrarNav,
  itemsNavPara,
  type ContextoNav,
} from "@/src/lib/preferencias/navegacion";
import type { Rol } from "@/src/lib/auth/tipos";
import { IconoBrutal, type IconoBrutalNombre } from "@/src/components/ui/icono-brutal";

function iconoPara(ruta: string): IconoBrutalNombre {
  if (ruta === "/") {
    return "home";
  }
  if (ruta === "/equipo") {
    return "balon";
  }
  if (ruta === "/mi-resultado") {
    return "historial";
  }
  if (ruta === "/clasificacion") {
    return "tabla";
  }
  if (ruta === "/jugadores") {
    return "cromo";
  }
  if (ruta === "/normas") {
    return "normas";
  }
  if (ruta === "/ajustes") {
    return "ajustes";
  }
  return "admin";
}

export function NavActiva(props: {
  readonly rol: Rol | null;
  readonly contexto: ContextoNav;
}): React.JSX.Element | null {
  const ruta = usePathname();
  if (props.rol === null) {
    return null;
  }
  const visible = debeMostrarNav(ruta, props.contexto);
  if (!visible) {
    return null;
  }
  const items = itemsNavPara(props.rol);
  return (
    <nav
      aria-label="principal"
      className="bg-surface/95 border-on-surface sticky bottom-0 z-40 w-full border-t-[2.5px] backdrop-blur-xl"
    >
      <div className="flex flex-row items-center gap-1 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const etiqueta = traducir("es", item.claveEtiqueta);
          const activo =
            item.ruta === "/" ? ruta === "/" : ruta.startsWith(item.ruta);
          return (
            <a
              key={item.ruta}
              href={item.ruta}
              aria-current={activo ? "page" : undefined}
              className={
                activo
                  ? "tappable bg-primary-container text-on-primary-fixed border-on-surface flex min-h-[48px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border-[2px] px-1 text-center shadow-[2px_2px_0px_var(--ink-shadow)]"
                  : "tappable text-on-surface-variant flex min-h-[48px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center"
              }
            >
              <IconoBrutal nombre={iconoPara(item.ruta)} clase="h-5 w-5" />
              <span className="font-display text-[11px] leading-[12px] font-bold tracking-[0.06em] uppercase">
                {etiqueta}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
