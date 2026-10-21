import type { ConteosFaltas } from "./tipos";

export function esExpulsion(conteos: ConteosFaltas): boolean {
  if (conteos.descalificacion > 0) {
    return true;
  }
  if (conteos.pelea > 0) {
    return true;
  }
  if (
    conteos.antideportivas + conteos.tecnicas + conteos.tecnicaEntrenador >=
    2
  ) {
    return true;
  }
  if (conteos.personales >= 5) {
    return true;
  }
  return false;
}
