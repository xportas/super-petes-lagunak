import Link from "next/link";
import { traducir } from "@/src/lib/i18n";

export default function NotFoundFicha(): React.JSX.Element {
  const titulo = traducir("es", "ui.jugadores.no_encontrado");
  const volver = traducir("es", "ui.jugadores.volver");
  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
      <p role="status" className="flex min-h-[44px] items-center rounded border px-3 text-sm">
        {titulo}
      </p>
      <Link
        href="/jugadores"
        className="tappable flex min-h-[44px] items-center justify-center rounded border px-3 underline"
      >
        {volver}
      </Link>
    </main>
  );
}
