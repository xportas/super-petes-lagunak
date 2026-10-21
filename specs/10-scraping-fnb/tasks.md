# Tasks — 10 Sincronización FNB vía API OWC

Fuente: `spec.md` (RF-01–RF-13, E-01–E-19) + `plan.md` (D-01–D-13). Orden TDD: test rojo antes que implementación en cada módulo. Esta spec no crea tablas ni UI; solo `src/lib/fnb/` + `errors.fnb.*`.

- [ ] **T-01 — Tests motor/dominio spec-02 en verde (prerrequisito)**
  Cubre: RF-07, RF-08 (consumidos, no redefinidos).
  Hacer: ejecutar la suite spec-02 sin modificarla (`esExpulsion` con 5 faltas, `calcularCierre hora-3h`, tipos `ConteosFaltas/EstadoJornada`). Si está en rojo, detener 10 y arreglar 02 primero.
  Hecho cuando: la suite spec-02 está 100% en verde y sirve como oráculo para expulsión/cierre/MVP de esta spec.
  Verifica: `npm test -- src/lib/scoring src/lib/dominio`

- [ ] **T-02 — Tests normalizar en rojo**
  Cubre: RF-03, RF-05, RF-06 / E-09, E-12.
  Hacer: `src/lib/fnb/normalizar.test.ts` con `normalizarNombreFNB('IÑIGO  ORTEGA')` sin tildes/lower/colapsa, `parsearHoraMadrid('2026-10-11 18:00:00')` → `Date` válida Europe/Madrid e ininterpretable → `null`, `truncarValoracion(12.9)→12` / `(-1.5)→-1`, `resolverVinculo` (1 coincidencia auto-vincula, 0/2+ a pendiente, dorsal nunca mapea).
  Hecho cuando: suite en rojo por `constantes.ts`/`tipos.ts`/`normalizar.ts` inexistentes.
  Verifica: `npm test -- src/lib/fnb/normalizar.test.ts` en rojo.

- [ ] **T-03 — Implementar constantes + tipos + normalizar**
  Cubre: RF-02, RF-03, RF-05, RF-06.
  Hacer: `src/lib/fnb/constantes.ts` (`ID_TEAM='11659'`, `ESB_BASE`, `MSSTATS_BASE`, ventanas `24h/1h/+3h`, reexporta `HORAS_CIERRE`/`GRACIA_PAPEL_HORAS` de scoring sin redefinir) + `tipos.ts` (§1 plan) + `normalizar.ts` (las 3 puras + `resolverVinculo`, sin IO, cero `any`).
  Hecho cuando: T-02 en verde + `npx tsc --noEmit` sin errores.
  Verifica: `npm test -- src/lib/fnb/normalizar.test.ts`, `npx tsc --noEmit`

- [ ] **T-04 — Tests esquemas Zod + clientes en rojo**
  Cubre: RF-01, RF-11 / E-13.
  Hacer: `src/lib/fnb/esquemas.test.ts` (`esquemaMatchFnb` con J2 `55488` válido y `universallyid=null` válido, `esquemaMsStatsPlayer` con conteos J2, `esquemaUrlFnb` `?id=` vs `?uuid=` vs inválida) + `src/lib/fnb/clientes.test.ts` (mock `fetch`: ESB Base64→`messageData`, ESB `result=ERROR` → throw, MSSTATS JSON directo, HTTP 500 → `FNB_HTTP`, header `federation: fnb` exigido).
  Hecho cuando: en rojo por `esquemas.ts`/`cliente-esb.ts`/`cliente-msstats.ts` inexistentes.
  Verifica: `npm test -- src/lib/fnb/esquemas.test.ts src/lib/fnb/clientes.test.ts` en rojo.

- [ ] **T-05 — Implementar esquemas + clientes ESB/MSSTATS**
  Cubre: RF-01.
  Hacer: `esquemas.ts` (§4 plan, único sitio con `unknown`) + `cliente-esb.ts` (`fetchEsb` con `fetchFn` inyectable, `Buffer.from(b64,'base64')`, valida `result==='OK'`) + `cliente-msstats.ts` (`fetchMsStats` JSON directo). Sin parsear HTML nunca; sin `revalidatePath`.
  Hecho cuando: T-04 en verde.
  Verifica: `npm test -- src/lib/fnb/esquemas.test.ts src/lib/fnb/clientes.test.ts`

- [ ] **T-06 — Tests parseo calendario en rojo**
  Cubre: RF-02, RF-03, RF-13 / E-01, E-11, E-12, E-16, E-17.
  Hacer: `src/lib/fnb/parseo-calendario.test.ts` + `fixtures/j2-55488.json` con J2 real (local, `67-42`, `universallyid` set) y J1 `55483` (`universallyid=null`, `64-58`): futuro `state=0` → solo calendario sin acta; `matchDay` ininterpretable → `{error:'SIN_HORA'}`; `idLocalTeam==='11659'` decide local/rival; `numMatchDay` reiniciado en `1` → doble numeración sin colisión; `fnb_partidos_ignorados` no se recrea; aplazado/`state!=1` → sin cálculo.
  Hecho cuando: en rojo por `parseo-calendario.ts` inexistente.
  Verifica: `npm test -- src/lib/fnb/parseo-calendario.test.ts` en rojo.

- [ ] **T-07 — Implementar parseo + sync calendario**
  Cubre: RF-02, RF-03, RF-04, RF-13.
  Hacer: `parseo-calendario.ts` (`normalizarJornada`, `fusionarCalendario` aditiva, `detectarSegundaFase`) + `sync-calendario.ts` (`decidirSyncCalendario` 24h con `lastCalendarSync`/`ahora` inyectado). Respeta borrados Admin y no toca resultados.
  Hecho cuando: T-06 en verde (incluye throttle 24h vencido/no-vencido).
  Verifica: `npm test -- src/lib/fnb/parseo-calendario.test.ts src/lib/fnb/sync-calendario.test.ts`

- [ ] **T-08 — Tests parseo acta en rojo**
  Cubre: RF-06, RF-07, RF-08 / E-02, E-05, E-06, E-10.
  Hacer: `src/lib/fnb/parseo-acta.test.ts` + `fixtures/j2-55488-acta.json` (11 J2 `1,6,12,7,2,0,8,1,-1,13,-1` + VITAL ausente): filtra `teamIdExtern===11659`; `timePlayed>0→jugo` con `Math.trunc`, presente `0→dnp`, ausente→`no_convocado`; MARCOS 16 con 5 personales → `expulsado=true` con `BASE` intacta; MVP FNB ignorado (ningún flag leído); dorsal distinto no cambia vínculo.
  Hecho cuando: en rojo por `parseo-acta.ts` inexistente.
  Verifica: `npm test -- src/lib/fnb/parseo-acta.test.ts` en rojo.

- [ ] **T-09 — Implementar parseo acta**
  Cubre: RF-06, RF-07, RF-08.
  Hacer: `parseo-acta.ts` (`normalizarActa` con trunc en ingesta, minutos→estado, `esExpulsion()` spec-02 con `personal>=5`, ignora MVP/flags externos). No resuelve `lesionado` previo aquí (lo hace T-11); no escribe BD.
  Hecho cuando: T-08 en verde.
  Verifica: `npm test -- src/lib/fnb/parseo-acta.test.ts`

- [ ] **T-10 — Tests sync resultados (throttle/papel/manual/lesionado) en rojo**
  Cubre: RF-04, RF-06, RF-09, RF-10, RF-12 / E-03, E-04, E-07, E-08, E-09, E-14, E-15, E-19.
  Hacer: `src/lib/fnb/sync-resultados.test.ts` con reloj inyectado: `decidirSyncResultado` solo si `hora+3h<=ahora` + cada `1h` + (`pendiente` o `origen fnb`), `manual` → `debeSaltarManual=true`; `decidirPapel` J1 en gracia → `pendiente` con manual, tras `hora+24h` con `state=1`+`null` → `papel`; `resolverEstadoConLesionado` (0/ausencia respeta, minutos→`jugo`); corrección `fnb` sí reimporta; lock concurrente (una ejecuta, resto sirve BD, sin `revalidatePath` en SSR); jugador nuevo sin `uuid` → auto-alta `activo/NULL` que bloquea cálculo (`pendiente`→`invalidada`).
  Hecho cuando: en rojo por `sync-resultados.ts` inexistente.
  Verifica: `npm test -- src/lib/fnb/sync-resultados.test.ts` en rojo.

- [ ] **T-11 — Implementar sync resultados**
  Cubre: RF-04, RF-06, RF-09, RF-10, RF-12.
  Hacer: `sync-resultados.ts` (`decidirSyncResultado`, `decidirPapel`, `resolverEstadoConLesionado`, `debeSaltarManual`, `resolverVinculo` cableado a plantilla 03) + `index.ts` barrel. Documenta que el lock real (`SELECT … FOR UPDATE` sobre `jornada`) y el `origen_resultado` los aplican 03/09; aquí solo decisión pura.
  Hecho cuando: T-10 en verde.
  Verifica: `npm test -- src/lib/fnb/sync-resultados.test.ts`

- [ ] **T-12 — Tests pre-relleno URL (`?id=`/`?uuid=`) en rojo**
  Cubre: RF-10, RF-11 / E-02, E-13.
  Hacer: `src/lib/fnb/pre-relleno.test.ts` con `fetch` mockeado: `?id=55488` → `fitxaPartit` + `getJsonWithMatchStats`; `?uuid=…` → cruce `getByTeamAllSeason/11659` + acta; URL inválida / no-Lagunak / `fnb_match_id` de otra jornada / FNB caída → `{error}` sin escritura parcial; pre-relleno nunca escribe BD (solo devuelve `ActaNormalizada`); al guardar sin cambios → `origen fnb`, con cambios → `manual` (vía re-fetch, T-13).
  Hecho cuando: en rojo por `descargarActaPorId/Uuid` y `preRellenarActaDesdeUrl` inexistentes.
  Verifica: `npm test -- src/lib/fnb/pre-relleno.test.ts` en rojo.

- [ ] **T-13 — Implementar descarga acta + pre-relleno sin autoguardado**
  Cubre: RF-10, RF-11.
  Hacer: en `cliente-esb.ts`/`cliente-msstats.ts` o `sync-resultados.ts`: `descargarCalendario`, `descargarActaPorId`, `descargarActaPorUuid`, `preRellenarActaDesdeUrl` (verifica pertenencia `11659`, nunca `guardar`). Deja el `origen_resultado` por re-fetch para que 09 lo fije al guardar; `Re-importar` explícito pisa `manual` (lo ejecuta 09 con confirmación).
  Hecho cuando: T-12 en verde y `grep -r "INSERT\|UPDATE\|supabase" src/lib/fnb --include="*.ts" | grep -v test` vacío (cero escritura BD).
  Verifica: `npm test -- src/lib/fnb/pre-relleno.test.ts`, `npx tsc --noEmit`

- [ ] **T-14 — i18n + umbrales + puerta final**
  Cubre: transversal + DoD spec §5.
  Hacer: añadir a `es/strings.json` solo `errors.fnb.*` (`no_responde, clave_rotada, url_invalida, no_pertenece, id_duplicado, sin_acta_en_gracia, nombre_pendiente, manual_bloquea, hora_ininterpretable`) sin renombrar claves 01/02/03 ni crear `ui.*`; subir `vitest.config.ts` para incluir `src/lib/fnb/**` (≥90% líneas, 100% scoring/dominio intacto); pasar puerta completa.
  Hecho cuando: `npx tsc --noEmit` 0 errores y cero `any`, `npm run lint` 0 warnings, `npm test` verde + umbral, `npm run build` verde; manual: FNB caída → manual completa J2 y no bloquea, URL J2 pre-rellena 11 sin guardar hasta confirmar, J1 queda `1 día` pendiente y luego papel `0` excluida + rompe sin manual.
  Verifica: `npx tsc --noEmit && npm run lint && npm test && npm run build`
