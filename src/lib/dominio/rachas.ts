import type { EventoAparicion } from "./tipos";

export function penalizacionPara(n: number): number {
  const aparicion = Math.max(1, Math.floor(n));
  return 1 - aparicion;
}

export function calcularRachas(
  historial: readonly EventoAparicion[],
): ReadonlyMap<string, number> {
  const ordenado = [...historial].sort((a, b) => {
    const porHora = a.horaPartido.getTime() - b.horaPartido.getTime();
    if (porHora !== 0) {
      return porHora;
    }
    return a.numeroJornada - b.numeroJornada;
  });
  const rachas = new Map<string, number>();
  for (const evento of ordenado) {
    if (evento.estadoJornada === "pendiente") {
      continue;
    }
    if (evento.estadoJornada === "papel") {
      rachas.set(evento.jugadorId, 0);
      continue;
    }
    if (!evento.quintetoValido || !evento.alineado) {
      rachas.set(evento.jugadorId, 0);
      continue;
    }
    const anterior = rachas.get(evento.jugadorId) ?? 0;
    rachas.set(evento.jugadorId, anterior + 1);
  }
  return rachas;
}
