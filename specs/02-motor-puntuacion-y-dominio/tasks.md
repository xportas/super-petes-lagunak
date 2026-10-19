# Tareas — 02 Motor de puntuación y dominio (§0)

Fuente: `spec.md` + `plan.md` de esta 02.
Regla: TDD siempre — primero el test en rojo, después la implementación.
Cada tarea es <30 min y solo se da por hecha con su `Hecho cuando`.
Precondición global: `01-fundacion-ts-vitest-src` en verde (TS `strict`, Vitest, `src/lib/*` placeholders, `es/strings.json` mínimo). Sin ella, ninguna T cuenta.

Nota FNB (`AGENTS.md` vigente): la valoración FNB entra al motor como `number` entero ya resuelto. Prohibido parsear HTML de `fnbaloncesto.com`. El MVP lo calcula solo el motor §0. `src/lib/fnb/` es dueña de la spec-10 y no se toca aquí. Sin tablas Supabase en esta spec (dueña spec-03: `fnb_uuid`, `fnb_match_id`, `origen_resultado`, Lazy Sync).

- [ ] ## T-01 — Precondiciones y hueco de trabajo
  - **Toca:** ninguno (solo lectura: `tsconfig.json`, `vitest.config.ts`, `package.json`, `src/lib/scoring/`, `src/lib/dominio/`, `es/strings.json`).
  - **Cubre:** DoD base (sin RF de negocio).
  - **Hacer:** comprobar TS `strict` + alias `@/*`, Vitest ejecutable, placeholders `scoring/dominio` vacíos sin lógica, `es/strings.json` con mínimo de 01. Confirmar que no existen `src/lib/fnb/` ni tablas (son specs 10/03).
  - **Hecho cuando:** `npx tsc --noEmit` → 0 errores y `npm test` → verde en la base sin tests de esta 02.

- [ ] ## T-02 — Test de `constantes` (snapshot anti-divergencia)
  - **Toca:** `src/lib/scoring/constantes.test.ts` (crear).
  - **Cubre:** RF-04, RF-05, RF-06, RF-08, RF-10, RF-11, RF-16, RF-19.
  - **Hacer:** test que fija los números únicos del §0: `x1.5`, `+5` posición, `-N` progresivo, `+3` MVP, `-5` expulsión, `-3h` cierre, `-10` sin quinteto. Es la red para que `/normas` (spec-05) no diverja.
  - **Hecho cuando:** `npx vitest run src/lib/scoring/constantes.test.ts` → falla (no existe `constantes.ts`).

- [ ] ## T-03 — Implementar `constantes.ts`
  - **Toca:** `src/lib/scoring/constantes.ts` (crear).
  - **Cubre:** RF-04, RF-05, RF-06, RF-08, RF-10, RF-11, RF-16, RF-19.
  - **Hacer:** exportar constantes con nombres en español de negocio donde aplique, sin literales duplicados en ningún otro fichero. Cero `any`.
  - **Hecho cuando:** `npx vitest run src/lib/scoring/constantes.test.ts` → verde y `npx tsc --noEmit` → 0 errores.

- [ ] ## T-04 — Test de `rachas` (progresión, ruptura, J1, lesionado cuenta, papel rompe)
  - **Toca:** `src/lib/dominio/rachas.test.ts` (crear).
  - **Cubre:** RF-07, RF-08, RF-09, RF-19, RF-21. Casos E-05, E-07, E-08, E-09, E-24.
  - **Hacer:** `penalizacion: 1ª→0, 2ª→-1, 3ª→-2, 4ª→-3, 5ª→-4` sin tope; ruptura por no alinear; J1 y alta mid-season = 1ª; lesionado/DNP cuenta para futura aunque puntúe `0`; sin envío = reset a `0`; jornada `papel` = reset a `0` para todos aunque hubieran alineado.
  - **Hecho cuando:** `npx vitest run src/lib/dominio/rachas.test.ts` → falla (no existe `rachas.ts`).

- [ ] ## T-05 — Implementar `rachas.ts`
  - **Toca:** `src/lib/dominio/rachas.ts` (crear: `siguienteRacha, penalizacionPorRacha`).
  - **Cubre:** RF-07, RF-08, RF-09, RF-19, RF-21.
  - **Hacer:** funciones puras sobre `rachasPrevias: ReadonlyMap`; sin BD, sin fechas. `BASE 0` bloquea el `-N` pero no el conteo futuro (lo decide `calculo.ts`, aquí solo conteo + tabla + reset por no envío o jornada `papel`).
  - **Hecho cuando:** `npx vitest run src/lib/dominio/rachas.test.ts` → verde y `npm run lint` → 0 warnings en el fichero.

- [ ] ## T-06 — Test de `cierre` (`-3h`, segundo exacto, sin hora)
  - **Toca:** `src/lib/dominio/cierre.test.ts` (crear).
  - **Cubre:** RF-16, RF-17 (hora ausente). Casos E-18, E-19.
  - **Hacer:** `hora_partido − 3h` en `Europe/Madrid` (caso DST incluido); acepta solo `inicioPeticion < cierre`; segundo exacto o posterior → rechazo; cambio posterior de hora no invalida lo guardado; sin hora o inválida → error bloqueante.
  - **Hecho cuando:** `npx vitest run src/lib/dominio/cierre.test.ts` → falla (no existe `cierre.ts`).

- [ ] ## T-07 — Implementar `cierre.ts`
  - **Toca:** `src/lib/dominio/cierre.ts` (crear: `calcularCierre, estaCerrado`).
  - **Cubre:** RF-16.
  - **Hacer:** instante de inicio como parámetro (nunca `Date.now()` dentro del cálculo testeable); zona `Europe/Madrid` explícita; comparador `<` estricto. Zod `horaPartidoSchema` para el borde.
  - **Hecho cuando:** `npx vitest run src/lib/dominio/cierre.test.ts` → verde.

- [ ] ## T-08 — Test de `validacion-alineacion` (5+entrenador+capitán, elegibilidad, posiciones)
  - **Toca:** `src/lib/dominio/validacion-alineacion.test.ts` (crear).
  - **Cubre:** RF-02, RF-03, RF-06, RF-14, RF-15. Casos E-06, E-17, E-21, E-22.
  - **Hacer:** 5 distintos + 1 entrenador + capitán del quinteto con posición; Maider/Páter solo en slot entrenador y nunca en quinteto; `["E","A"]` válido y `E==A` da `+5`; 0/1/3+ posiciones → inválido; lesionado/DNP + expulsado → inválido; FNB no entera → inválida.
  - **Hecho cuando:** `npx vitest run src/lib/dominio/validacion-alineacion.test.ts` → falla (no existe el módulo).

- [ ] ## T-09 — Implementar `validacion-alineacion.ts` (Zod en borde)
  - **Toca:** `src/lib/dominio/validacion-alineacion.ts` (crear: schemas + `validarAlineacion`).
  - **Cubre:** RF-02, RF-03, RF-14, RF-15.
  - **Hacer:** `z.enum` posiciones, `z.tuple` exactamente 2, `z.number().int()` FNB, `refine` distintos/capitán-en-quinteto/elegibilidad/lesión-expulsión. Errores con claves `errors.alineacion.*` (sin literales en el throw).
  - **Hecho cuando:** `npx vitest run src/lib/dominio/validacion-alineacion.test.ts` → verde y `npx tsc --noEmit` → 0 errores, cero `any`.

- [ ] ## T-10 — Test de `calculo` por jugador (BASE, Maider, Páter, bloqueo `0`)
  - **Toca:** `src/lib/scoring/calculo.test.ts` (crear).
  - **Cubre:** RF-01, RF-04, RF-05, RF-06, RF-07, RF-13. Casos E-01–E-06.
  - **Hacer:** BASE tal cual incl. negativa; lesionado/DNP → `0`; Maider solo capitán `13→20`, `-1→-1.5→-1` (half-up), no-capitán sin multiplicador; Páter `0→2`, `-5→2`; `BASE 0` bloquea `+5/-N`; `["E","A"]` siempre `+5`; Maider nunca combina suelo, Páter nunca multiplica.
  - **Hecho cuando:** `npx vitest run src/lib/scoring/calculo.test.ts` → falla (no existe `calculo.ts`).

- [ ] ## T-11 — Implementar `calculo.ts` nivel jugador
  - **Toca:** `src/lib/scoring/calculo.ts` (crear: `forzarBASE, redondeoHalfUp, aplicarEntrenador, normalizarPosicion, calcularJugador`).
  - **Cubre:** RF-01, RF-04–RF-07, RF-13 (rama jugador).
  - **Hacer:** orden `BASE → x1.5 ó suelo+1 excluyentes → +5 (salvo 0) → -N (salvo 0)`; FNB entera de entrada (el `.5` solo nace del x1.5); `undefined` → throw `errors.calculo.dato-ausente`. Importar números solo desde `constantes.ts`.
  - **Hecho cuando:** `npx vitest run src/lib/scoring/calculo.test.ts` → verde.

- [ ] ## T-12 — Test de jornada: MVP (simple, empate, exige jugar, con Maider/Páter, expulsado MVP)
  - **Toca:** `src/lib/scoring/jornada.test.ts` (crear, bloque MVP).
  - **Cubre:** RF-10, RF-13 (rama `+3`). Casos E-10–E-13, E-15, E-03.
  - **Hacer:** MVP = máxima BASE entre quienes jugaron (`estado = 'jugo'`); empate habilita a todos; máxima BASE `0` o negativa habiendo jugado sí da `+3` (los no jugados con `0` forzado no entran en `plantillaJugaronBASE` ni bloquean); solo si 0 jugadores jugaron → sin `+3`; capitán lesionado/DNP nunca MVP; con Maider `+3` después sin multiplicar; con Páter `+3` independiente; expulsado sí puede ser MVP (`+3` y `-5`).
  - **Hecho cuando:** `npx vitest run src/lib/scoring/jornada.test.ts` → falla (no existe `calcularJornada`).

- [ ] ## T-13 — Test de jornada: expulsión, total, orden, dato ausente, sin quinteto, papel, recálculo, desglose
  - **Toca:** `src/lib/scoring/jornada.test.ts` (ampliar, bloque cierre jornada).
  - **Cubre:** RF-11, RF-12, RF-13, RF-17, RF-18, RF-19, RF-20, RF-21. Casos E-14, E-16, E-20, E-23, E-24, E-09.
  - **Hacer:** `-5` por expulsado con BASE intacta, doble → `-10`; total = 5 jugadores `+3` MVP `-5×n`, negativo preservado; orden fijo verificable en el desglose; dato ausente → throw con `claveI18n` sin parciales; sin quinteto → `-10` + reset rachas; jornada `papel` → `0` excluida + reset rachas de todos; corrección admin → recálculo total; desglose suma exactamente RF-12.
  - **Hecho cuando:** `npx vitest run src/lib/scoring/jornada.test.ts` → falla en los nuevos casos.

- [ ] ## T-14 — Implementar `calcularJornada` + `recalcularJornada` (desglose como dato)
  - **Toca:** `src/lib/scoring/calculo.ts` (ampliar).
  - **Cubre:** RF-10–RF-13, RF-17–RF-21.
  - **Hacer:** `calcularJornada` resuelve ramas `normal` (suma 5 + MVP + expulsiones), `sin-quinteto` (`-10` + reset rachas) y `papel` (`0` + reset rachas de todos); `recalcularJornada` = misma vía con datos corregidos (sin parches; el botón es spec-09). `ResultadoJornada` estructurado, nunca string `12 +5 -1 = 16` (las vistas solo lo muestran).
  - **Hecho cuando:** `npx vitest run src/lib/scoring/` → todo verde (calculo + jornada + constantes).

- [ ] ## T-15 — Añadir claves `errors.*` a `es/strings.json`
  - **Toca:** `es/strings.json` (modificar, solo añadir).
  - **Cubre:** RF-02, RF-03, RF-14–RF-17 (soporte cero-hardcode de E-16–E-19).
  - **Hacer:** `errors.calculo.dato-ausente`, `errors.alineacion.duplicados|sin-capitan|capitan-fuera|sin-posicion|entrenador-invalido|entrenador-en-quinteto|elegibilidad|posiciones-invalidas|lesion-expulsion-excluyentes`, `errors.cierre.pasado|sin-hora|hora-invalida`. Texto plano, sin HTML. No añadir `ui.normas.*` (dueña spec-05).
  - **Hecho cuando:** `node -e "JSON.parse(require('fs').readFileSync('es/strings.json','utf8'))"` → ok y `grep -c errors.alineacion es/strings.json` → 9 claves presentes.

- [ ] ## T-16 — Puerta de calidad final de la 02
  - **Toca:** solo ajustes mínimos si la puerta lo exige (sin páginas, sin SQL, sin `src/lib/fnb/`).
  - **Cubre:** DoD spec (100% motor/posiciones/rachas + `tsc`/`lint`/`test`/`build`).
  - **Hacer:** cobertura 100% en `scoring/`, validación de posiciones y `rachas.ts`; revisar cero `any`, cero literales visibles, desglose derivado del motor.
  - **Hecho cuando:** `npx tsc --noEmit` → 0 errores; `npm run lint` → 0 warnings; `npm test -- --coverage` → verde con 100% en los tres ámbitos; `npm run build` → verde.
