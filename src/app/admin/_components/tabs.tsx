"use client";

import Link from "next/link";
import { traducir } from "@/src/lib/i18n";
import type { TabAdmin } from "@/src/lib/admin/tipos";

const TABS: readonly TabAdmin[] = [
  "jornadas",
  "jugadores",
  "resultados",
  "usuarios",
  "invitacion",
];

export function TabsAdmin(props: { readonly activa: TabAdmin }): React.JSX.Element {
  return (
    <nav aria-label={traducir("es", "ui.admin.titulo")} className="flex w-full gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const clave =
          tab === "jornadas"
            ? ("ui.admin.tabs.jornadas" as const)
            : tab === "jugadores"
              ? ("ui.admin.tabs.jugadores" as const)
              : tab === "resultados"
                ? ("ui.admin.tabs.resultados" as const)
                : tab === "usuarios"
                  ? ("ui.admin.tabs.usuarios" as const)
                  : ("ui.admin.tabs.invitacion" as const);
        const etiqueta = traducir("es", clave);
        const esActiva = tab === props.activa;
        return (
          <Link
            key={tab}
            href={`/admin?tab=${tab}`}
            aria-current={esActiva ? "page" : undefined}
            className={
              esActiva
                ? "tappable flex min-h-[44px] flex-1 items-center justify-center rounded border px-2 text-sm font-semibold"
                : "tappable flex min-h-[44px] flex-1 items-center justify-center rounded border px-2 text-sm"
            }
          >
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
