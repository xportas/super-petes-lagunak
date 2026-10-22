import type { ActaFilaInput, OrigenResultado } from "./tipos";

// Igual → fnb, distinto/manual → manual (RF-10).
export function determinarOrigen(
  enviados: readonly ActaFilaInput[],
  oficial: readonly ActaFilaInput[] | null,
): OrigenResultado {
  if (oficial === null) {
    return "manual";
  }
  if (enviados.length !== oficial.length) {
    return "manual";
  }
  const porId = new Map(oficial.map((f) => [f.jugadorId, f] as const));
  for (const e of enviados) {
    const o = porId.get(e.jugadorId);
    if (o === undefined) {
      return "manual";
    }
    if (
      o.valoracion !== e.valoracion ||
      o.estado !== e.estado ||
      o.expulsado !== e.expulsado
    ) {
      return "manual";
    }
  }
  return "fnb";
}
