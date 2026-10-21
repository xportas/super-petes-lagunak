/**
 * Marca opaca temporal: la lógica real la aporta la spec-10 (E-10).
 * Prohibido definir aquí `Jugador`, `Jornada`, `Posicion` o `EstadoJornada`.
 */
export type PendienteFnb = string & {
  readonly __marca: "pendiente-spec-10";
};
