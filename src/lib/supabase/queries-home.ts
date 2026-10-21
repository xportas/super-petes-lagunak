// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  puedeSincronizarCalendario,
  puedeSincronizarResultados,
} from "@/src/lib/supabase/mapeo";
import type {
  AlineacionRow,
  AlineacionSeleccionRow,
  JornadaRow,
  ResultadoJugadorRow,
  UsuarioRow,
} from "./tipos";

export interface DatosHome {
  readonly jornadas: readonly JornadaRow[];
  readonly resultadosUltima: readonly ResultadoJugadorRow[];
  readonly alineacionesUltima: readonly AlineacionRow[];
  readonly seleccionesUltima: readonly AlineacionSeleccionRow[];
  readonly usuarios: readonly UsuarioRow[];
  readonly ultimaCalculadaId: string | null;
}

function aFecha(valor: unknown): Date | null {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }
  if (typeof valor === "string") {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function aJornada(fila: Record<string, unknown>): JornadaRow | null {
  const hora = aFecha(fila["horaPartido"]);
  if (hora === null) {
    return null;
  }
  const estado = fila["estado"];
  if (
    estado !== "pendiente" &&
    estado !== "calculada" &&
    estado !== "papel" &&
    estado !== "invalidada"
  ) {
    return null;
  }
  const id = fila["id"];
  const numeroJornada = fila["numeroJornada"];
  if (typeof id !== "string" || typeof numeroJornada !== "number") {
    return null;
  }
  return {
    id,
    numeroJornada,
    numeroJornadaFnb:
      typeof fila["numeroJornadaFnb"] === "number"
        ? (fila["numeroJornadaFnb"] as number)
        : null,
    rival: typeof fila["rival"] === "string" ? (fila["rival"] as string) : "",
    esLocal: fila["esLocal"] === true,
    campo:
      typeof fila["campo"] === "string" ? (fila["campo"] as string) : null,
    municipio:
      typeof fila["municipio"] === "string"
        ? (fila["municipio"] as string)
        : null,
    horaPartido: hora,
    estado,
    fnbMatchId:
      typeof fila["fnbMatchId"] === "string"
        ? (fila["fnbMatchId"] as string)
        : null,
    fnbUniversallyId:
      typeof fila["fnbUniversallyId"] === "string"
        ? (fila["fnbUniversallyId"] as string)
        : null,
    marcadorLocal:
      typeof fila["marcadorLocal"] === "number"
        ? (fila["marcadorLocal"] as number)
        : null,
    marcadorVisitante:
      typeof fila["marcadorVisitante"] === "number"
        ? (fila["marcadorVisitante"] as number)
        : null,
    origenResultado:
      fila["origenResultado"] === "manual" || fila["origenResultado"] === "fnb"
        ? (fila["origenResultado"] as "manual" | "fnb")
        : null,
    lastCalendarSync: aFecha(fila["lastCalendarSync"]),
    lastResultSync: aFecha(fila["lastResultSync"]),
  };
}

function ultimaCalculadaIdDe(jornadas: readonly JornadaRow[]): string | null {
  const ordenadas = [...jornadas].sort((a, b) => {
    const porHora = a.horaPartido.getTime() - b.horaPartido.getTime();
    if (porHora !== 0) {
      return porHora;
    }
    return a.numeroJornada - b.numeroJornada;
  });
  let ultima: string | null = null;
  for (const j of ordenadas) {
    if (j.estado === "calculada") {
      ultima = j.id;
    }
  }
  return ultima;
}

export async function leerHomeBD(
  cliente?: SupabaseClient,
): Promise<DatosHome> {
  const db = cliente ?? obtenerClienteService();
  const { data: filasJornada, error: errorJornada } = (await db
    .from("jornada")
    .select("*")) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (errorJornada) {
    throw new Error(`[home] jornada: ${errorJornada.message}`);
  }
  const jornadas: JornadaRow[] = [];
  for (const f of ((filasJornada ?? []) as unknown as Array<
    Record<string, unknown>
  >)) {
    const j = aJornada(f);
    if (j !== null) {
      jornadas.push(j);
    }
  }
  const ultimaId = ultimaCalculadaIdDe(jornadas);
  if (ultimaId === null) {
    return {
      jornadas,
      resultadosUltima: [],
      alineacionesUltima: [],
      seleccionesUltima: [],
      usuarios: [],
      ultimaCalculadaId: null,
    };
  }
  const { data: filasResultados, error: errorResultados } = (await db
    .from("resultado_jugador")
    .select("*")
    .eq("jornadaId", ultimaId)) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (errorResultados) {
    throw new Error(`[home] resultado_jugador: ${errorResultados.message}`);
  }
  const resultadosUltima = ((filasResultados ?? []) as unknown as Array<
    ResultadoJugadorRow
  >).filter(
    (r): r is ResultadoJugadorRow =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as { jornadaId?: unknown }).jornadaId === "string",
  );
  const { data: filasAline, error: errorAline } = (await db
    .from("alineacion")
    .select("*")
    .eq("jornadaId", ultimaId)) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  if (errorAline) {
    throw new Error(`[home] alineacion: ${errorAline.message}`);
  }
  const alineacionesUltima = ((filasAline ?? []) as unknown as Array<
    AlineacionRow
  >).filter(
    (r): r is AlineacionRow =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as { id?: unknown }).id === "string",
  );
  let seleccionesUltima: AlineacionSeleccionRow[] = [];
  if (alineacionesUltima.length > 0) {
    const ids = alineacionesUltima.map((a) => a.id);
    const { data: filasSel, error: errorSel } = (await db
      .from("alineacion_seleccion")
      .select("*")
      .in("alineacionId", ids)) as unknown as {
      readonly data: unknown;
      readonly error: { readonly message: string } | null;
    };
    if (errorSel) {
      throw new Error(`[home] alineacion_seleccion: ${errorSel.message}`);
    }
    seleccionesUltima = ((filasSel ?? []) as unknown as Array<
      AlineacionSeleccionRow
    >).filter(
      (r): r is AlineacionSeleccionRow =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as { alineacionId?: unknown }).alineacionId === "string",
    );
  }
  const { data: filasUsuarios } = (await db
    .from("usuario")
    .select("id,username,rol")) as unknown as {
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  };
  const usuarios = ((filasUsuarios ?? []) as unknown as Array<UsuarioRow>).filter(
    (u): u is UsuarioRow =>
      typeof u === "object" &&
      u !== null &&
      typeof (u as { id?: unknown }).id === "string",
  );
  return {
    jornadas,
    resultadosUltima,
    alineacionesUltima,
    seleccionesUltima,
    usuarios,
    ultimaCalculadaId: ultimaId,
  };
}

export interface OpcionesLazySync {
  readonly ahora?: Date;
  readonly sincronizarCalendario?: () => Promise<unknown>;
  readonly sincronizarResultados?: () => Promise<unknown>;
  readonly lastCalendarSync?: Date | null;
  readonly ultimaJornadaPendienteResultado?: {
    readonly horaPartido: Date;
    readonly lastResultSync: Date | null;
  } | null;
}

export async function intentarLazySyncHome(
  jornadas: readonly JornadaRow[],
  opciones?: OpcionesLazySync,
): Promise<{ readonly sincronizado: boolean }> {
  const ahora = opciones?.ahora ?? new Date();
  try {
    const lastCal =
      opciones?.lastCalendarSync ??
      (jornadas
        .map((j) => j.lastCalendarSync)
        .find((d) => d instanceof Date) as Date | null | undefined) ??
      null;
    if (
      puedeSincronizarCalendario(lastCal ?? null, ahora) &&
      opciones?.sincronizarCalendario !== undefined
    ) {
      await opciones.sincronizarCalendario();
    }
    const pendiente = opciones?.ultimaJornadaPendienteResultado ?? null;
    if (pendiente !== null && opciones?.sincronizarResultados !== undefined) {
      if (
        puedeSincronizarResultados(
          pendiente.lastResultSync,
          pendiente.horaPartido,
          ahora,
        )
      ) {
        await opciones.sincronizarResultados();
      }
    } else if (opciones?.sincronizarResultados !== undefined) {
      for (const j of jornadas) {
        if (j.estado !== "pendiente") {
          continue;
        }
        if (
          puedeSincronizarResultados(j.lastResultSync, j.horaPartido, ahora)
        ) {
          await opciones.sincronizarResultados();
          break;
        }
      }
    }
    return { sincronizado: true };
  } catch {
    return { sincronizado: false };
  }
}
