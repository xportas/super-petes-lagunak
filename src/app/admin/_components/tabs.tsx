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
    <nav aria-label={traducir("es", "ui.admin.titulo")} className="bg-surface-container-low border-on-surface flex w-full gap-1 overflow-x-auto rounded-xl border-[2px] p-1">
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
                ? "tappable bg-primary-container text-on-primary-fixed border-on-surface flex min-h-[44px] flex-1 items-center justify-center rounded-lg border-[2px] px-2 text-xs font-bold shadow-[2px_2px_0px_var(--ink-shadow)]"
                : "tappable text-on-surface-variant flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-2 text-xs"
            }
          >
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
