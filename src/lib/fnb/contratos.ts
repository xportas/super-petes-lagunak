/**
 * Compatibilidad con Home (spec-07): la decisión real vive en sync-*.
 * Estas funciones son no-op seguras: el Lazy Sync lo orquestan 03/09
 * con throttle + lock en servidor. Se mantienen para no romper imports.
 */
export function sincronizarCalendarioFNB(): void {
  return;
}

export function sincronizarResultadosFNB(): void {
  return;
}
