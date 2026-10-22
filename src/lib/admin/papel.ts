import { GRACIA_PAPEL_HORAS } from "@/src/lib/scoring/constantes";

// esPapel = state==="1" && universallyId==null && ahora>=hora+24h (E-05).
export function esPapel(
  state: string,
  universallyId: string | null,
  horaPartido: Date,
  ahora: Date,
): boolean {
  if (state !== "1") {
    return false;
  }
  if (universallyId !== null) {
    return false;
  }
  return (
    ahora.getTime() >=
    horaPartido.getTime() + GRACIA_PAPEL_HORAS * 3600 * 1000
  );
}
