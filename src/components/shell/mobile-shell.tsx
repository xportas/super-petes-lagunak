import type { ReactNode } from "react";
import { traducir } from "@/src/lib/i18n";

export function MobileShell(props: {
  readonly children: ReactNode;
}): React.JSX.Element {
  const descripcion = traducir("es", "ui.shell.contenedor_desc");
  return (
    <div
      aria-label={descripcion}
      className="mx-auto flex min-h-dvh w-full min-w-[360px] max-w-[430px] flex-col overflow-x-clip pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      {props.children}
    </div>
  );
}
