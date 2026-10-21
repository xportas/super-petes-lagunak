import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { traducir } from "@/src/lib/i18n";
import { parsearModoPete } from "@/src/lib/preferencias/cookies";
import {
  resolverJornadaActiva,
  resolverUltimaCalculada,
} from "@/src/lib/home/resolver-jornada";
import { top3Jugadores, top3Managers } from "@/src/lib/home/top3";
import {
  intentarLazySyncHome,
  leerHomeBD,
} from "@/src/lib/supabase/queries-home";
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import { calcularRachas } from "@/src/lib/dominio/rachas";
import { calcularJornada } from "@/src/lib/scoring/calcular-jornada";
import type { EntradaJugador } from "@/src/lib/scoring/tipos";
import type { Posicion } from "@/src/lib/scoring/tipos";
import { CuentaAtras } from "./components/cuenta-atras";
import { BloquePartido } from "./components/bloque-partido";
import { TopManagers } from "./components/top-managers";
import { TopJugadores } from "./components/top-jugadores";

async function LazySync(): Promise<React.JSX.Element | null> {
  await connection();
  try {
    const { sincronizarCalendarioFNB, sincronizarResultadosFNB } = await import(
      "@/src/lib/fnb/contratos"
    );
    await intentarLazySyncHome([], {
      ahora: new Date(),
      sincronizarCalendario: async () => {
        sincronizarCalendarioFNB();
      },
      sincronizarResultados: async () => {
        sincronizarResultadosFNB();
      },
    });
  } catch {
    // FNB caída: se sirve BD en silencio (E-15).
  }
  return null;
}

function etiquetaJ(numero: number): string {
  return `J${numero}`;
}

async function ContenidoHome(): Promise<React.JSX.Element> {
  await connection();
  const datos = await leerHomeBD();
  const jar = await cookies();
  const modoPete = parsearModoPete(jar.get("modo_pete")?.value) === "1";
  const ahora = new Date();
  const ordenables = datos.jornadas.map((j) => ({
    jornadaId: j.id,
    numeroJornada: j.numeroJornada,
    horaPartido: j.horaPartido,
    estado: j.estado,
  }));
  const porId = new Map(datos.jornadas.map((j) => [j.id, j] as const));
  const resolucion = resolverJornadaActiva(ordenables, ahora);
  const ultimaOrdenable = resolverUltimaCalculada(ordenables);
  const ultima =
    ultimaOrdenable === null
      ? null
      : (porId.get(ultimaOrdenable.jornadaId) ?? null);
  const sinProxima = traducir("es", "ui.home.sin_proxima");

  let bloqueCuenta: React.JSX.Element;
  let jornadaPartido:
    | import("@/src/lib/supabase/tipos").JornadaRow
    | null = null;
  let esUltimo = false;
  if (resolucion.tipo === "activa") {
    jornadaPartido = porId.get(resolucion.jornada.jornadaId) ?? null;
    if (resolucion.cerrada) {
      const cerrado = traducir("es", "ui.home.cerrado");
      bloqueCuenta = (
        <p aria-live="polite" className="flex min-h-[44px] items-center text-sm">
          {cerrado}
        </p>
      );
    } else {
      bloqueCuenta = (
        <CuentaAtras cierreIso={resolucion.jornada.horaPartido.toISOString()} />
      );
    }
  } else if (resolucion.tipo === "sin_proxima") {
    const ordUltima = resolucion.ultima;
    jornadaPartido =
      ordUltima === null ? null : (porId.get(ordUltima.jornadaId) ?? null);
    esUltimo = true;
    bloqueCuenta = (
      <p aria-live="polite" className="flex min-h-[44px] items-center text-sm">
        {sinProxima}
      </p>
    );
  } else {
    const vacio = traducir("es", "ui.home.sin_datos");
    bloqueCuenta = (
      <p aria-live="polite" className="flex min-h-[44px] items-center text-sm">
        {vacio}
      </p>
    );
  }

  // Nombres de jugadores para TopJugadores (todos, no solo activos).
  const nombres = new Map<
    string,
    { readonly nombre: string; readonly nombrePete: string | null }
  >();
  const posiciones = new Map<string, readonly [Posicion, Posicion] | null>();
  try {
    const db = obtenerClienteService();
    const { data } = await db.from("jugador").select("id,nombre,nombrePete,posicionesValidas");
    for (const f of ((data ?? []) as unknown as Array<{
      readonly id: string;
      readonly nombre: string;
      readonly nombrePete: string | null;
      readonly posicionesValidas: readonly [Posicion, Posicion] | null;
    }>)) {
      if (typeof f.id === "string" && typeof f.nombre === "string") {
        nombres.set(f.id, { nombre: f.nombre, nombrePete: f.nombrePete });
        posiciones.set(f.id, f.posicionesValidas);
      }
    }
  } catch {
    nombres.clear();
    posiciones.clear();
  }

  // Top Jugadores por BASE.
  let filasJugadores: ReturnType<typeof top3Jugadores> = [];
  let etiquetaUltima = "";
  if (ultima !== null) {
    etiquetaUltima = etiquetaJ(ultima.numeroJornada);
    const bases = datos.resultadosUltima
      .map((r) => {
        const info = nombres.get(r.jugadorId);
        const nombre = info?.nombre ?? "";
        if (nombre.trim() === "") {
          return null;
        }
        const bajo = nombre.trim().toLowerCase();
        if (bajo === "maider" || bajo === "páter" || bajo === "pater") {
          return null;
        }
        return { jugadorId: r.jugadorId, nombre, base: r.valoracion };
      })
      .filter(
        (b): b is { jugadorId: string; nombre: string; base: number } =>
          b !== null,
      );
    filasJugadores = top3Jugadores(bases, etiquetaUltima);
  }

  // Top Managers por puntos del motor §0.
  let filasManagers: ReturnType<typeof top3Managers> = [];
  if (ultima !== null && datos.alineacionesUltima.length > 0) {
    try {
      const db = obtenerClienteService();
      const { data: filasAlineTodas } = await db
        .from("alineacion")
        .select("id,managerId,jornadaId,entrenador,capitanJugadorId,instanteInicio");
      const todas = ((filasAlineTodas ?? []) as unknown as Array<{
        readonly id: string;
        readonly managerId: string;
        readonly jornadaId: string;
        readonly entrenador: string;
        readonly capitanJugadorId: string;
      }>);
      const idsTodas = todas.map((a) => a.id);
      let selsTodas: Array<{ readonly alineacionId: string; readonly jugadorId: string }> = [];
      if (idsTodas.length > 0) {
        const { data: filasSel } = await db
          .from("alineacion_seleccion")
          .select("alineacionId,jugadorId");
        selsTodas = ((filasSel ?? []) as unknown as Array<{
          readonly alineacionId: string;
          readonly jugadorId: string;
        }>);
      }
      const porJornada = new Map<string, { id: string; managerId: string; entrenador: string; capitan: string }>();
      for (const a of todas) {
        if (a.jornadaId === ultima.id) {
          porJornada.set(a.managerId, {
            id: a.id,
            managerId: a.managerId,
            entrenador: a.entrenador,
            capitan: a.capitanJugadorId,
          });
        }
      }
      // Máxima BASE global para MVP.
      let maxBase: number | null = null;
      let jugoAlguno = false;
      for (const r of datos.resultadosUltima) {
        if (r.estado === "jugo") {
          jugoAlguno = true;
          if (maxBase === null || r.valoracion > maxBase) {
            maxBase = r.valoracion;
          }
        }
      }
      const resultadoPorJugador = new Map(
        datos.resultadosUltima.map((r) => [r.jugadorId, r] as const),
      );
      const entradas = new Map<
        string,
        { username: string; puntos: number; esAdmin: boolean; envioValido: boolean }
      >();
      const usuariosPorId = new Map(
        datos.usuarios.map((u) => [u.id, u] as const),
      );
      for (const [managerId, aline] of porJornada) {
        const usuario = usuariosPorId.get(managerId);
        if (usuario === undefined) {
          continue;
        }
        if (usuario.rol === "admin") {
          continue;
        }
        const sels = selsTodas.filter((s) => {
          const fila = todas.find((t) => t.id === s.alineacionId);
          return fila?.managerId === managerId && fila.jornadaId === ultima.id;
        });
        // Selecciones de la última para este manager desde datosHome si están.
        const selsUltima = datos.seleccionesUltima.filter((s) =>
          datos.alineacionesUltima.some(
            (a) => a.id === s.alineacionId && a.managerId === managerId,
          ),
        );
        const listaSels = selsUltima.length > 0 ? selsUltima : sels;
        if (listaSels.length !== 5) {
          continue;
        }
        // Rachas previas a la última para este manager.
        const eventos: Array<{
          jugadorId: string;
          jornadaId: string;
          horaPartido: Date;
          numeroJornada: number;
          estadoJornada: "pendiente" | "calculada" | "papel" | "invalidada";
          alineado: boolean;
          quintetoValido: boolean;
        }> = [];
        const alineadosPorJornada = new Map<string, Set<string>>();
        for (const s of selsTodas) {
          const fila = todas.find((t) => t.id === s.alineacionId);
          if (fila === undefined || fila.managerId !== managerId) {
            continue;
          }
          let c = alineadosPorJornada.get(fila.jornadaId);
          if (c === undefined) {
            c = new Set<string>();
            alineadosPorJornada.set(fila.jornadaId, c);
          }
          c.add(s.jugadorId);
        }
        const quintetosPorJornada = new Map<string, boolean>();
        for (const a of todas) {
          if (a.managerId === managerId) {
            quintetosPorJornada.set(a.jornadaId, true);
          }
        }
        const jugadoresVistos = new Set<string>();
        for (const c of alineadosPorJornada.values()) {
          for (const id of c) {
            jugadoresVistos.add(id);
          }
        }
        for (const j of datos.jornadas) {
          if (j.id === ultima.id) {
            continue;
          }
          const esAnterior =
            j.horaPartido.getTime() < ultima.horaPartido.getTime() ||
            (j.horaPartido.getTime() === ultima.horaPartido.getTime() &&
              j.numeroJornada < ultima.numeroJornada);
          if (!esAnterior) {
            continue;
          }
          const tiene = quintetosPorJornada.get(j.id) === true;
          const conjunto = alineadosPorJornada.get(j.id);
          const estado = j.estado as "pendiente" | "calculada" | "papel" | "invalidada";
          for (const jugadorId of jugadoresVistos) {
            eventos.push({
              jugadorId,
              jornadaId: j.id,
              horaPartido: j.horaPartido,
              numeroJornada: j.numeroJornada,
              estadoJornada: estado,
              alineado: conjunto?.has(jugadorId) ?? false,
              quintetoValido: tiene,
            });
          }
        }
        const rachas = calcularRachas(eventos);
        const penalizacionPorJugador: Record<string, number> = {};
        for (const s of listaSels) {
          const previa = rachas.get(s.jugadorId) ?? 0;
          penalizacionPorJugador[s.jugadorId] = 0 - previa;
        }
        const quinteto: EntradaJugador[] = [];
        let valida = true;
        for (const s of listaSels) {
          const r = resultadoPorJugador.get(s.jugadorId);
          const posValidas = posiciones.get(s.jugadorId) ?? null;
          if (r === undefined || posValidas === null) {
            valida = false;
            break;
          }
          const posicionAlineada = (s as { posicionAlineada?: unknown }).posicionAlineada;
          if (
            posicionAlineada !== "B" &&
            posicionAlineada !== "E" &&
            posicionAlineada !== "A" &&
            posicionAlineada !== "AP" &&
            posicionAlineada !== "P"
          ) {
            // Sin posición alineada fiable en BD mock: usa primera válida.
            const primera = (posValidas as readonly Posicion[])[0] as Posicion;
            quinteto.push({
              jugadorId: s.jugadorId,
              valoracionFNB: r.valoracion,
              estado: r.estado,
              expulsado: r.expulsado,
              posicionesValidas: posValidas,
              posicionAlineada: primera,
              esCapitan: s.jugadorId === aline.capitan,
            });
          } else {
            quinteto.push({
              jugadorId: s.jugadorId,
              valoracionFNB: r.valoracion,
              estado: r.estado,
              expulsado: r.expulsado,
              posicionesValidas: posValidas,
              posicionAlineada: posicionAlineada as Posicion,
              esCapitan: s.jugadorId === aline.capitan,
            });
          }
        }
        if (!valida || quinteto.length !== 5) {
          continue;
        }
        const cap = quinteto.find((q) => q.esCapitan);
        const baseCapitan = cap === undefined ? 0 : cap.estado === "jugo" ? (cap.valoracionFNB ?? 0) : 0;
        const entrenador = aline.entrenador === "pater" ? ("pater" as const) : ("maider" as const);
        const quinteto5 = quinteto as unknown as readonly [
          EntradaJugador,
          EntradaJugador,
          EntradaJugador,
          EntradaJugador,
          EntradaJugador,
        ];
        const calc = calcularJornada({
          entrenador,
          quinteto: quinteto5,
          penalizacionRachaPorJugador: penalizacionPorJugador,
          plantillaBaseMax: {
            maxBase,
            capitanEsMaximo: maxBase !== null && baseCapitan === maxBase,
            jugoAlguno,
          },
        });
        if ("error" in calc) {
          continue;
        }
        entradas.set(managerId, {
          username: (usuario as { username: string }).username,
          puntos: calc.total,
          esAdmin: false,
          envioValido: true,
        });
      }
      filasManagers = top3Managers(entradas, etiquetaUltima);
    } catch {
      filasManagers = [];
    }
  }

  const verPlantilla = traducir("es", "ui.home.ver_plantilla");

  return (
    <main className="flex w-full flex-col gap-4 px-4 pt-8 pb-8">
      {bloqueCuenta}
      {jornadaPartido !== null ? (
        <BloquePartido jornada={jornadaPartido} esUltimo={esUltimo} />
      ) : null}
      <TopManagers filas={filasManagers} />
      <TopJugadores filas={filasJugadores} nombres={nombres} modoPete={modoPete} />
      <Link
        href="/jugadores"
        className="tappable flex min-h-[44px] items-center justify-center rounded border px-3 text-sm underline"
      >
        {verPlantilla}
      </Link>
    </main>
  );
}

export default function PaginaHome(): React.JSX.Element {
  return (
    <>
      <Suspense fallback={null}>
        <LazySync />
      </Suspense>
      <Suspense fallback={null}>
        <ContenidoHome />
      </Suspense>
    </>
  );
}
