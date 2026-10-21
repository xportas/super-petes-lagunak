// Solo servidor: usa service_role tras validar sesión + rol en el llamante.
// Nunca importar desde 'use client'.
import { obtenerClienteService } from "@/src/lib/supabase/auth";
import { ordenarJornadasCanonico } from "@/src/lib/dominio/cierre";
import { calcularRachas } from "@/src/lib/dominio/rachas";
import type {
  EntrenadorSlug,
  EstadoJornada,
} from "@/src/lib/supabase/tipos";
import type { Posicion } from "@/src/lib/scoring/tipos";
import type { SlotPos } from "@/src/app/equipo/_lib/validacion-equipo";
import { SLOTS_FIJOS } from "@/src/app/equipo/_lib/validacion-equipo";

export interface JornadaEquipo {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly horaPartido: Date;
  readonly estado: EstadoJornada;
  readonly rival: string;
}

export interface AlineacionGuardadaEquipo {
  readonly entrenador: EntrenadorSlug;
  readonly capitanId: string;
  readonly slots: Readonly<Record<SlotPos, string>>;
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

interface FilaJornada {
  readonly id: string;
  readonly numeroJornada: number;
  readonly horaPartido: string | Date;
  readonly estado: string;
  readonly rival?: string;
}

function filaAJornada(f: FilaJornada): JornadaEquipo | null {
  const hora = aFecha(f.horaPartido);
  if (hora === null) {
    return null;
  }
  const estado = f.estado as EstadoJornada;
  if (
    estado !== "pendiente" &&
    estado !== "calculada" &&
    estado !== "papel" &&
    estado !== "invalidada"
  ) {
    return null;
  }
  return {
    jornadaId: f.id,
    numeroJornada: f.numeroJornada,
    horaPartido: hora,
    estado,
    rival: typeof f.rival === "string" ? f.rival : "",
  };
}

export function resolverJornadaActiva(
  jornadas: readonly JornadaEquipo[],
): JornadaEquipo | null {
  const ordenadas = ordenarJornadasCanonico(
    jornadas.map((j) => ({
      jornadaId: j.jornadaId,
      numeroJornada: j.numeroJornada,
      horaPartido: j.horaPartido,
      estado: j.estado,
    })),
  );
  const idsOrden = new Map(ordenadas.map((o) => [o.jornadaId, o] as const));
  for (const o of ordenadas) {
    if (o.estado === "pendiente") {
      const original = jornadas.find((j) => j.jornadaId === o.jornadaId);
      void idsOrden;
      if (original !== undefined) {
        return original;
      }
    }
  }
  return null;
}

export async function listarJornadas(): Promise<JornadaEquipo[]> {
  const db = obtenerClienteService();
  const { data } = await db
    .from("jornada")
    .select("id,numeroJornada,horaPartido,estado,rival");
  const filas = ((data ?? []) as unknown as FilaJornada[]);
  const out: JornadaEquipo[] = [];
  for (const f of filas) {
    const j = filaAJornada(f);
    if (j !== null) {
      out.push(j);
    }
  }
  return ordenarJornadasCanonico(
    out.map((j) => ({
      jornadaId: j.jornadaId,
      numeroJornada: j.numeroJornada,
      horaPartido: j.horaPartido,
      estado: j.estado,
    })),
  ).map((o) => out.find((j) => j.jornadaId === o.jornadaId) as JornadaEquipo);
}

export async function obtenerJornadaActiva(): Promise<JornadaEquipo | null> {
  const todas = await listarJornadas();
  return resolverJornadaActiva(todas);
}

export async function getJornadaPorId(
  jornadaId: string,
): Promise<JornadaEquipo | null> {
  const db = obtenerClienteService();
  const { data } = await db
    .from("jornada")
    .select("id,numeroJornada,horaPartido,estado,rival")
    .eq("id", jornadaId)
    .maybeSingle();
  if (data === null || data === undefined) {
    return null;
  }
  return filaAJornada(data as unknown as FilaJornada);
}

export interface FichaPlantilla {
  readonly activo: boolean;
  readonly posicionesValidas: readonly [Posicion, Posicion] | null;
}

export async function getPlantillaPorIds(
  ids: readonly string[],
): Promise<ReadonlyMap<string, FichaPlantilla>> {
  const db = obtenerClienteService();
  const { data } = await db
    .from("jugador")
    .select("id,activo,posicionesValidas")
    .in("id", [...ids]);
  const mapa = new Map<string, FichaPlantilla>();
  for (const f of ((data ?? []) as unknown as Array<{
    readonly id: string;
    readonly activo: boolean;
    readonly posicionesValidas: readonly [Posicion, Posicion] | null;
  }>)) {
    mapa.set(f.id, {
      activo: f.activo,
      posicionesValidas: f.posicionesValidas,
    });
  }
  return mapa;
}

export async function getAlineacion(
  managerId: string,
  jornadaId: string,
): Promise<AlineacionGuardadaEquipo | null> {
  const db = obtenerClienteService();
  const { data: aline } = await db
    .from("alineacion")
    .select("id,entrenador,capitanJugadorId")
    .eq("managerId", managerId)
    .eq("jornadaId", jornadaId)
    .maybeSingle();
  if (aline === null || aline === undefined) {
    return null;
  }
  const fila = aline as unknown as {
    readonly id: string;
    readonly entrenador: EntrenadorSlug;
    readonly capitanJugadorId: string;
  };
  const { data: sels } = await db
    .from("alineacion_seleccion")
    .select("jugadorId,posicionAlineada")
    .eq("alineacionId", fila.id);
  const lista = ((sels ?? []) as unknown as Array<{
    readonly jugadorId: string;
    readonly posicionAlineada: SlotPos;
  }>);
  if (lista.length !== 5) {
    return null;
  }
  const slots = {} as Record<SlotPos, string>;
  for (const slot of SLOTS_FIJOS) {
    const hallada = lista.find((s) => s.posicionAlineada === slot);
    if (hallada === undefined) {
      return null;
    }
    slots[slot] = hallada.jugadorId;
  }
  return {
    entrenador: fila.entrenador,
    capitanId: fila.capitanJugadorId,
    slots,
  };
}

export interface UpsertAlineacionArgs {
  readonly managerId: string;
  readonly jornadaId: string;
  readonly entrenador: EntrenadorSlug;
  readonly capitanId: string;
  readonly slots: Readonly<Record<SlotPos, string>>;
  readonly instanteInicio: Date;
}

export async function upsertAlineacion(args: UpsertAlineacionArgs): Promise<void> {
  const db = obtenerClienteService();
  const { data: existente } = await db
    .from("alineacion")
    .select("id")
    .eq("managerId", args.managerId)
    .eq("jornadaId", args.jornadaId)
    .maybeSingle();
  let alineacionId: string | null = null;
  if (existente !== null && existente !== undefined) {
    alineacionId = (existente as unknown as { readonly id: string }).id;
    await db
      .from("alineacion")
      .update({
        entrenador: args.entrenador,
        capitanJugadorId: args.capitanId,
        instanteInicio: args.instanteInicio.toISOString(),
      })
      .eq("id", alineacionId);
    await db.from("alineacion_seleccion").delete().eq("alineacionId", alineacionId);
  } else {
    const { data: creada, error } = await db
      .from("alineacion")
      .insert({
        managerId: args.managerId,
        jornadaId: args.jornadaId,
        entrenador: args.entrenador,
        capitanJugadorId: args.capitanId,
        instanteInicio: args.instanteInicio.toISOString(),
      })
      .select("id")
      .single();
    if (error || creada === null || creada === undefined) {
      throw new Error("[alineaciones] no se pudo crear la alineación");
    }
    alineacionId = (creada as unknown as { readonly id: string }).id;
  }
  const filas = SLOTS_FIJOS.map((slot) => ({
    alineacionId,
    jugadorId: args.slots[slot],
    posicionAlineada: slot,
  }));
  const { error: errorSel } = await db
    .from("alineacion_seleccion")
    .insert(filas);
  if (errorSel) {
    throw new Error("[alineaciones] no se pudieron guardar las selecciones");
  }
}

export async function getRachasPrevias(
  managerId: string,
  jornadaActiva: JornadaEquipo,
): Promise<ReadonlyMap<string, number>> {
  const db = obtenerClienteService();
  const { data: jornadas } = await db
    .from("jornada")
    .select("id,numeroJornada,horaPartido,estado");
  const listaJornadas = ((jornadas ?? []) as unknown as FilaJornada[])
    .map((f) => filaAJornada(f))
    .filter((j): j is JornadaEquipo => j !== null);
  const { data: alineaciones } = await db
    .from("alineacion")
    .select("id,jornadaId")
    .eq("managerId", managerId);
  const filasAline = ((alineaciones ?? []) as unknown as Array<{
    readonly id: string;
    readonly jornadaId: string;
  }>);
  const porJornada = new Map<string, string>();
  for (const a of filasAline) {
    porJornada.set(a.jornadaId, a.id);
  }
  let selecciones: Array<{ readonly alineacionId: string; readonly jugadorId: string }> = [];
  if (filasAline.length > 0) {
    const ids = filasAline.map((a) => a.id);
    const { data: sels } = await db
      .from("alineacion_seleccion")
      .select("alineacionId,jugadorId")
      .in("alineacionId", ids);
    selecciones = ((sels ?? []) as unknown as Array<{
      readonly alineacionId: string;
      readonly jugadorId: string;
    }>);
  }
  const alineadosPorJornada = new Map<string, Set<string>>();
  for (const s of selecciones) {
    const fila = filasAline.find((a) => a.id === s.alineacionId);
    if (fila === undefined) {
      continue;
    }
    let conjunto = alineadosPorJornada.get(fila.jornadaId);
    if (conjunto === undefined) {
      conjunto = new Set<string>();
      alineadosPorJornada.set(fila.jornadaId, conjunto);
    }
    conjunto.add(s.jugadorId);
  }
  const jugadores = new Set<string>();
  for (const conjunto of alineadosPorJornada.values()) {
    for (const id of conjunto) {
      jugadores.add(id);
    }
  }
  const eventos = [];
  for (const j of listaJornadas) {
    const esActiva =
      j.jornadaId === jornadaActiva.jornadaId;
    if (esActiva) {
      continue;
    }
    const esAnterior =
      j.horaPartido.getTime() < jornadaActiva.horaPartido.getTime() ||
      (j.horaPartido.getTime() === jornadaActiva.horaPartido.getTime() &&
        j.numeroJornada < jornadaActiva.numeroJornada);
    if (!esAnterior) {
      continue;
    }
    const tieneQuinteto = porJornada.has(j.jornadaId);
    const conjunto = alineadosPorJornada.get(j.jornadaId);
    for (const jugadorId of jugadores) {
      eventos.push({
        jugadorId,
        jornadaId: j.jornadaId,
        horaPartido: j.horaPartido,
        numeroJornada: j.numeroJornada,
        estadoJornada: j.estado,
        alineado: conjunto?.has(jugadorId) ?? false,
        quintetoValido: tieneQuinteto,
      });
    }
  }
  return calcularRachas(eventos);
}
