"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { traducir } from "@/src/lib/i18n";
import { cerrarSesion, establecerModoPete, establecerTema } from "./actions";
import type { ModoPete, Tema } from "@/src/lib/preferencias/tipos";

export function Interruptores(props: {
  readonly inicialPete: ModoPete;
  readonly inicialTema: Tema;
}): React.JSX.Element {
  const [pete, setPete] = useState<ModoPete>(props.inicialPete);
  const [tema, setTema] = useState<Tema>(props.inicialTema);
  const [, empezar] = useTransition();
  const etiquetaPete = traducir("es", "ui.ajustes.modo_pete");
  const etiquetaOn = traducir("es", "ui.ajustes.modo_pete_on");
  const etiquetaOff = traducir("es", "ui.ajustes.modo_pete_off");
  const etiquetaTema = traducir("es", "ui.ajustes.tema");
  const etiquetaClaro = traducir("es", "ui.ajustes.tema_claro");
  const etiquetaOscuro = traducir("es", "ui.ajustes.tema_oscuro");

  function cambiarPete(siguiente: ModoPete): void {
    setPete(siguiente);
    empezar(() => {
      void establecerModoPete(siguiente);
    });
  }

  function cambiarTema(siguiente: Tema): void {
    setTema(siguiente);
    try {
      const raiz = document.documentElement;
      if (siguiente === "dark") {
        raiz.classList.add("dark");
      } else {
        raiz.classList.remove("dark");
      }
      raiz.setAttribute("data-theme", siguiente);
      raiz.style.colorScheme = siguiente;
    } catch {
      // Sin DOM en prerender: el script de tema lo aplica al recargar.
    }
    empezar(() => {
      void establecerTema(siguiente);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span>{etiquetaPete}</span>
        <button
          type="button"
          aria-pressed={pete === "1"}
          onClick={() => cambiarPete(pete === "1" ? "0" : "1")}
          className="tappable min-h-[44px] min-w-[44px] rounded border px-4"
        >
          {pete === "1" ? etiquetaOn : etiquetaOff}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{etiquetaTema}</span>
        <button
          type="button"
          aria-pressed={tema === "light"}
          onClick={() => cambiarTema(tema === "light" ? "dark" : "light")}
          className="tappable min-h-[44px] min-w-[44px] rounded border px-4"
        >
          {tema === "light" ? etiquetaClaro : etiquetaOscuro}
        </button>
      </div>
    </div>
  );
}

export function BotonCerrarSesion(): React.JSX.Element {
  const router = useRouter();
  const etiqueta = traducir("es", "ui.ajustes.cerrar_sesion");
  async function salir(): Promise<void> {
    await cerrarSesion();
    router.push("/login");
  }
  return (
    <button
      type="button"
      onClick={() => void salir()}
      className="tappable min-h-[44px] w-full rounded border"
    >
      {etiqueta}
    </button>
  );
}
