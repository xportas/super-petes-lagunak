"use client";

import { usePathname } from "next/navigation";
import { traducir } from "@/src/lib/i18n";
import {
  debeMostrarNav,
  itemsNavPara,
  type ContextoNav,
} from "@/src/lib/preferencias/navegacion";
import type { Rol } from "@/src/lib/auth/tipos";

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
      className="sticky bottom-0 flex w-full flex-row border-t pb-[env(safe-area-inset-bottom)]"
    >
      {items.map((item) => {
        const etiqueta = traducir("es", item.claveEtiqueta);
        const activo =
          item.ruta === "/" ? ruta === "/" : ruta.startsWith(item.ruta);
        return (
          <a
            key={item.ruta}
            href={item.ruta}
            aria-current={activo ? "page" : undefined}
            className="tappable flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center px-2 text-center"
          >
            {etiqueta}
          </a>
        );
      })}
    </nav>
  );
}
