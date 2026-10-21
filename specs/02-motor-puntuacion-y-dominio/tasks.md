# Tasks — 02 Motor de puntuación y dominio (§0)

Fuente: `spec.md` (RF-01–RF-21, E-01–E-24) + `plan.md` (§1–§8). Orden TDD: test rojo antes que implementación en cada módulo.

- [x] **T-01 Tests rojos redondeo half-up — RF-04, E-02**
  Crear `src/lib/scoring/redondeo.test.ts` con `13→20`, `-1→-1.5→-1`, `0→0`, `2.5→3` vía `BASE*1.5`.
  Verifica: `npm test -- src/lib/scoring/redondeo.test.ts` en rojo (fichero `redondeo.ts` aún no existe).
  Hecho cuando: test creado, falla por módulo ausente, sin tocar producción.

- [x] **T-02 Implementar constantes + tipos scoring + redondeo — RF-04, RF-01**
  Crear `src/lib/scoring/constantes.ts` (`BONUS_POSICION=5`, `PENALIZACION_SIN_QUINTETO=-10`, `BONUS_MVP=3`, `PENALIZACION_POR_EXPULSADO=5`, `FACTOR_CAPITAN_NUM=3/DEN=2`, `HORAS_CIERRE=3`, `GRACIA_PAPEL_HORAS=24`), `tipos.ts` (`Posicion, Entrenador, EstadoJugadorActa, ConteosFaltas, EntradaJugador, DesgloseJugador, ErrorCalculo`) y `redondeo.ts` con `Math.floor(x+0.5)`.
  Verifica: `npm test -- src/lib/scoring/redondeo.test.ts` en verde + `npx tsc --noEmit`.
  Hecho cuando: T-01 en verde, cero `any`.

- [x] **T-03 Tests rojos `esExpulsion` por conteos — RF-11, E-14, E-22**
  Crear `src/lib/scoring/expulsion.test.ts`: `descalificacion>0`, `pelea>0`, `antideportivas+tecnicas+tecnicaEntrenador>=2`, `personales>=5` → `true`; resto `false`; 5 faltas como expulsión; lesión/DNP + expulsado se testea en T-07 como excluyente. Deja explícito: no se lee flag de FNB/Admin, solo conteos.
  Verifica: `npm test -- src/lib/scoring/expulsion.test.ts` en rojo.
  Hecho cuando: test creado y falla por módulo ausente.

- [x] **T-04 Implementar `esExpulsion` — RF-11**
  Crear `src/lib/scoring/expulsion.ts` con la regla única del plan D-09. Ignora cualquier flag externo.
  Verifica: `npm test -- src/lib/scoring/expulsion.test.ts` en verde.
  Hecho cuando: todos los casos T-03 en verde, cobertura 100% del fichero.

- [x] **T-05 Tests rojos posiciones E==A — RF-06, RF-15, E-06, E-21**
  Crear `src/lib/dominio/posiciones.test.ts`: `["E","A"]` en `E` y en `A` → `+5`; letra no incluida → `0`; longitud `!=2` o `null` (Pendientes) → inválido.
  Verifica: `npm test -- src/lib/dominio/posiciones.test.ts` en rojo.
  Hecho cuando: test creado y falla.

- [x] **T-06 Implementar `dominio/posiciones` — RF-06, RF-15**
  Crear `src/lib/dominio/posiciones.ts` (`sonMismaCasilla, validarPosicionesValidas, tieneBonusPosicion`) sin normalizar lo guardado.
  Verifica: `npm test -- src/lib/dominio/posiciones.test.ts` en verde.
  Hecho cuando: E-06/E-21 cubiertos, 100% ramas.

- [x] **T-07 Tests rojos `calcularJugador` — RF-01, RF-04, RF-05, RF-07, RF-13, E-01–E-05**
  Crear `src/lib/scoring/calcular-jugador.test.ts`: BASE negativa sin Páter, `0→2` y `-5→2` con Páter, capitán `13→20` con Maider y no-capitán sin multiplicar, bloqueo `+5/-N` con BASE 0, lesionado cuenta para racha futura (a nivel de entrada `rachaN`), lesión+expulsión → `LESION_EXPULSION_EXCLUYENTES`.
  Verifica: `npm test -- src/lib/scoring/calcular-jugador.test.ts` en rojo.
  Hecho cuando: test creado y falla.

- [x] **T-08 Implementar `calcularJugador` — RF-01, RF-04, RF-05, RF-07, RF-13**
  Crear `src/lib/scoring/calcular-jugador.ts` en orden fijo `BASE→Maider/Páter excluyentes→+5→-N`, con coerción BASE 0 y error excluyente.
  Verifica: `npm test -- src/lib/scoring/calcular-jugador.test.ts` en verde + `npx tsc --noEmit`.
  Hecho cuando: E-01–E-05 en verde, sin literales, cero `any`.

- [x] **T-09 Tests rojos MVP — RF-10, E-10–E-13, E-15, E-03**
  Crear `src/lib/scoring/mvp.test.ts`: simple sobre BASE forzada, empate habilita a todos, exige `jugo` (DNP con BASE 0 no compite), máxima `0`/negativa si alguien jugó, con Maider (`+3` sin multiplicar), con Páter, expulsado puede ser MVP (`+3` y `-5` se testea el total en T-11), capitán lesionado nunca MVP.
  Verifica: `npm test -- src/lib/scoring/mvp.test.ts` en rojo.
  Hecho cuando: test creado y falla.

- [x] **T-10 Implementar `mvp` — RF-10**
  Crear `src/lib/scoring/mvp.ts` (`esMvpCapitan({capitanJugo, baseCapitan, maxBaseJugo})`).
  Verifica: `npm test -- src/lib/scoring/mvp.test.ts` en verde.
  Hecho cuando: E-10–E-13, E-15 cubiertos.

- [x] **T-11 Tests rojos `calcularJornada` — RF-12, RF-13, RF-17, RF-19, RF-21, E-09, E-14, E-16, E-20, E-24**
  Crear `src/lib/scoring/calcular-jornada.test.ts`: suma `5 subtotales +3 -5*n`, orden con Maider/Páter, total negativo se preserva, 2 expulsados → `-10` con BASE intacta, dato ausente → error sin parcial, sin quinteto → `-10`, papel → `0` excluido, recálculo con misma entrada da mismo total (RF-20).
  Verifica: `npm test -- src/lib/scoring/calcular-jornada.test.ts` en rojo.
  Hecho cuando: test creado y falla.

- [x] **T-12 Implementar `calcularJornada` — RF-12, RF-13, RF-17, RF-19, RF-20, RF-21**
  Crear `src/lib/scoring/calcular-jornada.ts` + `index.ts` barrels. `expulsado` entra como `bool` ya derivado de `esExpulsion`.
  Verifica: `npm test -- src/lib/scoring/calcular-jornada.test.ts` en verde.
  Hecho cuando: E-09, E-14, E-16, E-20, E-24 en verde.

- [x] **T-13 Tests rojos rachas + cierre + validar-quinteto — RF-08, RF-09, RF-14, RF-16, E-07, E-08, E-17–E-19**
  Crear `rachas.test.ts` (1ª=0, 2ª=-1, 3ª=-2, sin tope; ruptura por no alinear/sin envío; cuenta lesionado; `calculada` e `invalidada` cuentan, `papel` rompe a 0; orden `hora_partido ASC, numero_jornada ASC`; J1/alta como 1ª), `cierre.test.ts` (`hora-3h`, instante inicio estrictamente `<`, segundo exacto rechaza, sin hora → `SIN_HORA`, cambio de hora no invalida lo guardado), `validar-quinteto.test.ts` (5 distintos, entrenador único Maider/Páter, capitán ∈ quinteto, elegibilidad separada, inactivo/Pendientes rechaza al guardar).
  Verifica: `npm test -- src/lib/dominio/rachas.test.ts src/lib/dominio/cierre.test.ts src/lib/dominio/validar-quinteto.test.ts` en rojo.
  Hecho cuando: 3 ficheros de test creados y fallan.

- [x] **T-14 Implementar dominio — RF-08, RF-09, RF-14, RF-16**
  Crear `dominio/tipos.ts`, `rachas.ts`, `cierre.ts`, `esquemas.ts` (zod: `esquemaPosicion, esquemaPosicionesValidas, esquemaEntrenador, esquemaConteosFaltas, esquemaQuintetoInput, esquemaActaJugador`), `validar-quinteto.ts`, `index.ts`. Añadir `zod` a `package.json`.
  Verifica: `npm test -- src/lib/dominio/` en verde + `npx tsc --noEmit`.
  Hecho cuando: E-07, E-08, E-17–E-19 en verde; motor sigue sin conocer zod.

- [x] **T-15 Tests rojos agregador temporada — RF-18, RF-09, RF-21**
  Crear `src/lib/scoring/agregador-temporada.test.ts`: orden canónico, excluye `pendiente/papel/invalidada` de sumas/medias/tops, puestos `Pº`, Top 3 última `calculada`, media 1 decimal solo `jugo`.
  Verifica: `npm test -- src/lib/scoring/agregador-temporada.test.ts` en rojo.
  Hecho cuando: test creado y falla.

- [x] **T-16 Implementar agregador — RF-18**
  Crear `src/lib/scoring/agregador-temporada.ts`.
  Verifica: `npm test -- src/lib/scoring/agregador-temporada.test.ts` en verde.
  Hecho cuando: agregados derivan del mismo motor, sin recalcular a mano.

- [x] **T-17 i18n + umbrales — transversal**
  Añadir a `es/strings.json` las claves del plan §6 (`errors.close.*, errors.calculo.*, errors.alineacion.*, errors.jornada.*`) sin renombrar las de spec-01; subir umbral Vitest a 100% en `scoring/**` y `dominio/{posiciones,rachas,cierre,validar-quinteto}.ts`.
  Verifica: `npm test -- --coverage` muestra 100% en esos ficheros + `npx tsc --noEmit`.
  Hecho cuando: cobertura exigida en verde, sin `ui.normas.*` (dueña spec-05).

- [x] **T-18 Puerta de calidad — DoD spec**
  Sustituir placeholders `never` de spec-01, correr `npx tsc --noEmit` (0 errores, cero `any`), `npm run lint` (0 warnings), `npm test` (verde + umbral), `npm run build` (verde).
  Verifica: los 4 comandos en orden.
  Hecho cuando: DoD de `spec.md` §5 verificable: tests listados en verde, 100% en cálculo/posiciones/rachas, desglose único del motor.
