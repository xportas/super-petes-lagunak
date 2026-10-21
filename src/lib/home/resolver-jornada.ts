import {
  calcularCierre,
  ordenarJornadasCanonico,
} from "@/src/lib/dominio/cierre";
import type { JornadaOrdenable } from "@/src/lib/dominio/tipos";
import type { ResolucionActiva } from "./tipos";

export function ordenarCanonico<T extends JornadaOrdenable>(
  jornadas: readonly T[],
): T[] {
  const adaptadas = jornadas.map((j) => ({
    jornadaId: j.jornadaId,
    numeroJornada: j.numeroJornada,
    horaPartido: j.horaPartido,
    estado: j.estado,
  }));
  const ordenadas = ordenarJornadasCanonico(adaptadas);
  const porId = new Map(jornadas.map((j) => [j.jornadaId, j] as const));
  const salida: T[] = [];
  for (const o of ordenadas) {
    const original = porId.get(o.jornadaId);
    if (original !== undefined) {
      salida.push(original);
    }
  }
  return salida;
}

export function resolverJornadaActiva<T extends JornadaOrdenable>(
  jornadas: readonly T[],
  ahora: Date,
): ResolucionActiva<T> {
  if (jornadas.length === 0) {
    return { tipo: "vacia" };
  }
  const ordenadas = ordenarCanonico(jornadas);
  for (const j of ordenadas) {
    if (j.estado === "pendiente") {
      const cierre = calcularCierre(j.horaPartido);
      const cerrada = ahora.getTime() >= cierre.getTime();
      return { tipo: "activa", jornada: j, cerrada };
    }
  }
  const ultima = ordenadas[ordenadas.length - 1] ?? null;
  if (ultima === null || ultima === undefined) {
    return { tipo: "vacia" };
  }
  return { tipo: "sin_proxima", ultima };
}

export function resolverUltimaCalculada<T extends JornadaOrdenable>(
  jornadas: readonly T[],
): T | null {
  const ordenadas = ordenarCanonico(jornadas);
  let ultima: T | null = null;
  for (const j of ordenadas) {
    if (j.estado === "calculada") {
      ultima = j;
    }
  }
  return ultima;
}

export function formatearCuentaAtras(msRestantes: number): string {
  if (!Number.isFinite(msRestantes) || msRestantes <= 0) {
    return "00:00:00";
  }
  const totalSeg = Math.floor(msRestantes / 1000);
  const horas = Math.floor(totalSeg / 3600);
  const minutos = Math.floor((totalSeg % 3600) / 60);
  const segundos = totalSeg % 60;
  const hh = String(horas).padStart(2, "0");
  const mm = String(minutos).padStart(2, "0");
  const ss = String(segundos).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
