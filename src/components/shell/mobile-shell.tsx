import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { traducir } from "@/src/lib/i18n";
import { IconoBrutal } from "@/src/components/ui/icono-brutal";

export function MobileShell(props: {
  readonly children: ReactNode;
  readonly barraNavegacion: ReactNode;
}): React.JSX.Element {
  const descripcion = traducir("es", "ui.shell.contenedor_desc");
  const titulo = traducir("es", "ui.shell.titulo");
  const verPlantilla = traducir("es", "ui.shell.ver_plantilla");
  return (
    <div
      aria-label={descripcion}
      className="bg-surface text-on-surface mx-auto flex h-dvh w-full min-w-[360px] max-w-[430px] flex-col overflow-hidden"
    >
      <header className="bg-surface/95 border-on-surface z-40 shrink-0 border-b-[2.5px] pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex min-h-[64px] items-center justify-between gap-2 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="bg-primary-container border-on-surface flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-[2px] shadow-[2px_2px_0px_var(--ink-shadow)]">
              <Image
                src="/players/escudo-lgnk.jpg"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
                priority
              />
            </span>
            <span className="brutal-title min-w-0 truncate text-[18px] leading-[22px]">
              {titulo}
            </span>
          </div>
          <Link
            href="/jugadores"
            aria-label={verPlantilla}
            className="tappable bg-surface-container-lowest border-on-surface flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-[2px] px-2 shadow-[2px_2px_0px_var(--ink-shadow)]"
          >
            <IconoBrutal nombre="cromo" clase="h-5 w-5" />
          </Link>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {props.children}
      </div>
      {props.barraNavegacion}
    </div>
  );
}
