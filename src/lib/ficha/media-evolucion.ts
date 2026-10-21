import { calcularCierre } from "@/src/lib/dominio/cierre";
import { esVigenteEn } from "@/src/lib/supabase/mapeo";
import type {
  ActaConJornada,
  ActaMedia,
  EvolucionFila,
  UltimaValoracion,
  VigenciaJugador,
} from "./tipos";

export function calcularMediaTemporada(
  actas: readonly ActaMedia[],
): import("./tipos").MediaTemporada {
  let suma = 0;
  let jugados = 0;
  for (const a of actas) {
    if (a.estadoJornada !== "calculada") {
      continue;
    }
    if (a.estado !== "jugo") {
      continue;
    }
    suma += a.base;
    jugados += 1;
  }
  if (jugados === 0) {
    return { tipo: "sin_datos" };
  }
  const media = Math.floor((suma / jugados) * 10 + 0.5) / 10;
  return { tipo: "valor", media, jugados };
}

export function evolucionVigente(
  actas: readonly ActaConJornada[],
  vigencia: VigenciaJugador,
): EvolucionFila[] {
  const filas: Array<EvolucionFila & { hora: Date; numero: number }> = [];
  for (const a of actas) {
    if (a.estadoJornada !== "calculada") {
      continue;
    }
    const cierre = calcularCierre(a.horaPartido);
    const vigente = esVigenteEn(vigencia.fechaAlta, vigencia.fechaBaja, cierre);
    if (vigente) {
      filas.push({
        jornadaId: a.jornadaId,
        etiqueta: a.etiqueta,
        base: a.base,
        estado: a.estado,
        hora: a.horaPartido,
        numero: a.numeroJornada,
      });
      continue;
    }
    // Baja antes del cierre pero jugó/estuvo en esa jornada: se conserva.
    const altaOk =
      vigencia.fechaAlta instanceof Date &&
      !Number.isNaN(vigencia.fechaAlta.getTime()) &&
      vigencia.fechaAlta.getTime() <= cierre.getTime();
    if (altaOk && a.estado === "jugo") {
      filas.push({
        jornadaId: a.jornadaId,
        etiqueta: a.etiqueta,
        base: a.base,
        estado: a.estado,
        hora: a.horaPartido,
        numero: a.numeroJornada,
      });
    }
  }
  filas.sort((a, b) => {
    const porHora = a.hora.getTime() - b.hora.getTime();
    if (porHora !== 0) {
      return porHora;
    }
    return a.numero - b.numero;
  });
  return filas.map((f) => ({
    jornadaId: f.jornadaId,
    etiqueta: f.etiqueta,
    base: f.base,
    estado: f.estado,
  }));
}

export function ultimaValoracion(
  actas: readonly ActaConJornada[],
  vigencia: VigenciaJugador,
): UltimaValoracion {
  const filas = evolucionVigente(actas, vigencia);
  const ultima = filas[filas.length - 1];
  if (ultima === undefined) {
    return { tipo: "sin_datos" };
  }
  return {
    tipo: "valor",
    base: ultima.base,
    estado: ultima.estado,
    jornadaEtiqueta: ultima.etiqueta,
  };
}

export function formatearMediaES(media: number): string {
  return media.toFixed(1).replace(".", ",");
}
