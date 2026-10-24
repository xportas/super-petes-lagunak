import Link from "next/link";
import { traducir } from "@/src/lib/i18n";

export default function NotFound(): React.JSX.Element {
  const titulo = traducir("es", "ui.jugadores.no_encontrado");
  const volver = traducir("es", "ui.jugadores.volver");
  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-4 pb-28">
      <p role="status" className="brutal-card flex min-h-[44px] items-center px-3 text-sm font-bold">
        {titulo}
      </p>
      <Link
        href="/jugadores"
        className="tappable brutal-btn brutal-btn-primary w-full text-sm"
      >
        {volver}
      </Link>
    </main>
  );
}
