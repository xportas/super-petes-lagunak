# 10 — Sincronización FNB vía API OWC (§8)

## 1. Objetivo y contexto

**Objetivo:** fijar el QUÉ de la carga automática de calendario y resultados desde la Federación Navarra de Baloncesto (FNB) sin intervención del Admin, manteniendo el formulario manual como garantía cuando la FNB no publique acta digital definitiva.

**Contexto:**

- `README.md §8` pide triple vía: auto-sync transparente + pegado de URL FNB con pre-relleno revisable + formulario manual garantizado. Esta spec congela cómo se dispara el auto-sync, cómo se mapea el acta a `BASE`/estado/expulsión y cuándo una jornada sin acta se declara papel definitiva.
- Las páginas `pagina-partido/?id=...` y `pagina-equipo/?id=...` son contenedores vacíos que consumen APIs JSON públicas de Optimal Way Consulting (OWC). Por eso la fuente es solo JSON OWC descrito en `fnb-api-reference.md`; nunca se parsea HTML.
- Equipo verificado: LAGUNAK A, `idTeam 11659`. Partido ejemplo con acta digital: J2 `idMatch 55488`. Contraejemplo sin acta digital: J1 `idMatch 55483` (acta en papel).
- `CONSTITUTION.md §3` (sin Realtime, sin demonios, sin cron, sin polling agresivo) obliga a Lazy Sync en servidor con throttle y lock. `§5` obliga a que el MVP lo calcule solo el motor §0. `§11` exige manual garantizado salvo excepción papel decidida por el usuario.
- `spec-02` gobierna cálculo, validación, rachas, cierre, dato ausente y qué faltas son expulsión (incluye 5 personales por decisión de esta sesión; esta spec solo aplica esa regla, no la define). `spec-03` gobierna entidades, vinculación FNB, papel excluida y RLS. `spec-09` gobierna panel Admin con dos botones FNB separados. Esta spec solo consume esas reglas, sin redefinirlas.
- **Decisiones cerradas con el usuario que esta spec congela:** Lazy Sync `24h` calendario / `1h` resultados con ventana `hora_partido + 3h`; solo JSON; segunda fase se añade sin borrar con numeración de liga correlativa; mapeo por `fnb_uuid` con fallback solo por nombre normalizado (dorsal nunca mapea); jugó solo si hay minutos; ausente = `no_convocado`, presente con `0/0` = `dnp`; lesionado previo se respeta salvo que el acta traiga minutos; papel con gracia de `1 día` y luego `0` excluido + rompe rachas sin manual posterior; manual prevalece salvo Re-importar; dos botones con pre-relleno sin autoguardado; auto actualiza corrección FNB aunque ya calculada con origen `fnb`; lock ante lecturas concurrentes; entrenadores nunca se sincronizan; acumulados FNB fuera de uso.

## 2. Requisitos funcionales (EARS)

- **RF-01 — Fuente API JSON OWC, prohibido scraping HTML:**
  Cuando el sistema necesite datos de la FNB, el sistema deberá obtenerlos exclusivamente de las APIs JSON de OWC descritas en `fnb-api-reference.md`. Si el HTML de `fnbaloncesto.com` cambia, entonces el sistema no deberá romperse porque nunca lo parsea.

- **RF-02 — Calendario de temporada desde `idTeam 11659` con segunda fase aditiva y respeto a borrados:**
  Cuando se sincronice el calendario (`Match/getByTeamAllSeason/11659`), el sistema deberá obtener todas las jornadas del equipo `11659`, omitiendo cualquier `idMatch` que el Admin haya eliminado explícitamente (`spec-09 RF-02`). Si la FNB publica una segunda fase o cambia de grupo con el mismo `idTeam`, entonces el sistema deberá incorporarla como jornadas nuevas sin borrar el histórico. Si la segunda fase reinicia su numeración en `1`, entonces el sistema deberá mantener numeración de liga correlativa propia y guardar el número FNB aparte para evitar colisiones.

- **RF-03 — Datos mínimos por jornada desde la FNB:**
  Cuando se cree o actualice una jornada desde la FNB, el sistema deberá registrar número de liga, `fnb_match_id`, `fnb_universally_id` (nullable), fecha/hora en `Europe/Madrid`, rival, local/visitante, campo y municipio, y marcador oficial cuando el partido esté finalizado. Si falta la hora del partido o es ininterpretable, entonces se aplicará `spec-02 E-19` (cierre incalculable, bloqueo de guardado).

- **RF-04 — Lazy Sync en servidor con throttle y lock (sin demonios):**
  Cuando se lea el calendario o el Home en un Server Component, el sistema deberá comprobar la FNB como máximo cada `24 horas` para calendario y, para resultados, solo en jornadas con `hora_partido + 3h <= ahora` (en estado `pendiente` o con `origen_resultado = 'fnb'`) y como máximo cada `1 hora` (consultando `Match/getByTeamAllSeason/11659` o `FCBQWeb/fitxaPartit/{fnb_match_id}` para actualizar `state`, marcador y `universallyid`, y si `universallyid !== null` descargando `getJsonWithMatchStats/{universallyid}?currentSeason=true`). Si no se cumplen esas ventanas, entonces el sistema deberá servir lo cacheado en BD sin llamar a la FNB. Si dos lecturas concurrentes vencen el throttle a la vez, entonces solo una deberá ejecutar el sync con lock en BD y el resto deberá servir lo persistido, sin invocar `revalidatePath` durante el render SSR.

- **RF-05 — Mapeo de jugadores por `fnb_uuid` con fallback solo por nombre:**
  Cuando se importen estadísticas, el sistema deberá emparejar primero por `fnb_uuid` permanente. Si un jugador del acta no tiene `fnb_uuid` guardado en BD, entonces el sistema deberá resolverlo solo por `nombre_fnb` o `nombre` normalizado (sin tildes, case-insensitive) y guardar su `fnb_uuid` al vuelo. El dorsal nunca deberá usarse para mapear por ser informativo y repetible. Si el nombre tiene cero o dos o más coincidencias, entonces el sistema no deberá auto-vincular y deberá dejarlo pendiente para elección manual del Admin.

- **RF-06 — BASE y estado desde acta digital (incluyendo bajas alineadas):**
  Cuando un partido tenga acta digital, el sistema deberá fijar por cada jugador vigente de plantilla en esa jornada (incluyendo como `no_convocado` con `BASE = 0` a cualquier jugador dado de baja que figure en al menos una alineación guardada de esa jornada): si el acta trae `timePlayed > 0`, estado `jugo` y `BASE = trunc(valoracion)` a entero; si el jugador no aparece en el acta, estado `no_convocado` y `BASE = 0`; si aparece pero con cero minutos, estado `dnp` y `BASE = 0`. Si el Admin había marcado `lesionado` en su estado sanitario pre-partido y el acta trae cero minutos o ausencia, entonces el sistema deberá respetar `lesionado` con `BASE = 0`. Si el Admin había marcado `lesionado` pero el acta trae minutos jugados, entonces el sistema deberá pasar el acta a `jugo` con `BASE` real. Si la valoración viniera no entera, entonces el sistema deberá truncar a entero según `spec-02`.

- **RF-07 — Expulsión aplicada desde regla del motor:**
  Cuando se importe un acta digital, el sistema deberá marcar `expulsado` aplicando la regla que define `spec-02` (incluye 5 faltas personales como expulsión por decisión de esta sesión, además de descalificantes y acumulación de antideportivas/técnicas). Esta spec no define la regla, solo la aplica antes de guardar.

- **RF-08 — MVP solo desde el motor §0:**
  Cuando se cierre una jornada importada, el sistema deberá dejar que el MVP (`+3`) lo calcule exclusivamente el motor puro sobre la máxima `BASE` de plantilla habiendo jugado. Si la FNB trae cualquier flag de MVP, entonces el sistema deberá ignorarlo.

- **RF-09 — Partido sin acta digital con gracia de 1 día (`hora_partido + 24h`), luego papel definitivo sin manual:**
  Cuando un partido finalizado (`state === "1"`) tenga marcador pero `universallyid = null` y `ahora_servidor < hora_partido + 24 horas`, el sistema deberá mantener la jornada como `pendiente` de acta sin declararla papel y permitiendo carga manual. Si cumplido `ahora_servidor >= hora_partido + 24 horas` sigue con `state === "1"` y `universallyid = null` (acta en papel, caso J1 `55483`), entonces el sistema deberá guardar el marcador oficial y marcar la jornada como `papel` con `0` excluido de todo + ruptura de rachas de todos a `0`, sin admitir carga manual posterior. Excepción consciente a manual garantizado.

- **RF-10 — Manual prevalece, pre-relleno sin cambios conserva `fnb`, y auto actualiza corrección FNB:**
  Cuando el Admin guarde el formulario de acta tras usar el pre-relleno FNB (RF-11) **sin modificar ningún valor**, el sistema deberá marcar la jornada con `origen_resultado = 'fnb'`. Si el Admin introduce datos a mano o modifica algún valor del pre-relleno antes de guardar, el sistema deberá marcar `origen_resultado = 'manual'` y el auto-sync nunca deberá sobrescribirla. Si la FNB corrige un acta de una jornada ya calculada con `origen_resultado = 'fnb'`, entonces el auto-sync sí deberá reimportarla y recalcular todo lo afectado. Si el Admin pulsa explícitamente `Re-importar desde FNB` (con confirmación), entonces el sistema sí deberá reimportar desde la FNB, devolver `origen_resultado` a `'fnb'` y recalcular aunque hubiera edición manual.

- **RF-11 — Dos botones FNB separados, pre-relleno sin auto-guardado:**
  Cuando el Admin pulse `Sincronizar calendario FNB`, el sistema deberá crear/actualizar jornadas futuras sin tocar resultados. Cuando pegue una URL `pagina-partido/?id={idMatch}` (o `?uuid={universallyid}`) o pulse `Sincronizar acta`, el sistema deberá descargar ese partido y solo pre-rellenar el formulario manual en pantalla para revisión antes de guardar, nunca guardar directo. Si la URL es inválida, no es de LAGUNAK A `11659`, el `fnb_match_id` ya pertenece a otra jornada, o la FNB no responde, entonces deberá mostrar error sin guardar nada parcial.

- **RF-12 — Formulario manual siempre garantizado salvo papel definitiva:**
  Cuando la FNB esté caída, rote su clave pública o un partido no tenga acta digital dentro de su gracia de `1 día`, el sistema deberá permitir completar la jornada íntegramente a mano (valoraciones, lesionados/convocados/DNP, expulsados). Si falla todo lo automático, entonces la liga nunca deberá bloquearse, salvo jornada ya marcada `papel` definitiva según RF-09.

- **RF-13 — Aplazados y no finalizados solo calendario:**
  Cuando un partido supere `hora_partido + 3h` pero siga no finalizado, o tenga marcador no visible, el sistema deberá limitarse a calendario y cierre sin pedir acta ni calcular. Si después se juega o se publica el acta, entonces el sync la tratará como pendiente normal.

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | Partido futuro no finalizado | Solo crea/actualiza calendario y `cierre = hora − 3h`; no pide acta ni calcula | Aún no hay nada que importar |
| E-02 | Partido finalizado con acta digital (caso J2 `55488`) | Importa valoraciones, distingue `no_convocado`/`dnp`/jugo por minutos, aplica expulsión `spec-02`, ejecuta motor §0 y marca `calculada` de forma atómica | Camino feliz verificado |
| E-03 | Partido finalizado sin acta dentro de gracia `1 día` | Mantiene pendiente de acta, permite manual, no declara papel | El acta digital puede subir tarde; evita falso papel |
| E-04 | Partido finalizado sin acta tras `1 día` (caso J1 `55483`) | Guarda marcador, marca papel con `0` excluido + rompe rachas, sin manual posterior | Decisión usuario: cero definitivo por causa externa |
| E-05 | Jugador ausente del acta | `BASE = 0`, estado `no_convocado`, salvo `lesionado` previo que se respeta | Ocupa slot, se muestra 🚑/❌, nunca se oculta (§0) |
| E-06 | Jugador en acta con cero minutos | `BASE = 0`, estado `dnp`, salvo `lesionado` previo que se respeta | Convocado sin jugar no es `jugo` |
| E-07 | `lesionado` previo que en acta trae minutos | Pasa a `jugo` con `BASE` real | El acta demuestra que jugó |
| E-08 | Jugador nuevo en acta sin `fnb_uuid` en BD (vinculado/refuerzo) | Auto-crea registro pendiente por nombre normalizado + guarda `fnb_uuid`; avisa al Admin para completar `posiciones[2]`/fotos; bloquea cálculo hasta completarlas | Posiciones las fija el Admin en BD, la FNB no las da; sin 2 posiciones no hay `+5` válido |
| E-09 | Nombre sin coincidencia o con 2+ coincidencias | No auto-vincula; deja pendiente para elección manual sin bloquear el resto | Evita vincular al jugador equivocado |
| E-10 | 5 faltas personales | Es expulsión (`−5`) con `BASE` intacta, por decisión de esta sesión aplicada desde `spec-02` | Cambio de regla asumido con actualización conjunta |
| E-11 | Cambio de hora del partido en la FNB | Recalcula `cierre = hora − 3h` sin invalidar alineaciones ya guardadas ni resucitar tardías | Cierre deriva de hora vigente |
| E-12 | `matchDay` sin zona o con formato inesperado | Se interpreta como `Europe/Madrid`; si es ininterpretable, error y bloqueo | Sin hora fiable no hay cierre |
| E-13 | Rotación de clave pública OWC o caída de APIs | Error visible con reintento manual; calendario cacheado y manual siguen operativos | La liga nunca se bloquea |
| E-14 | Jornada con `origen_resultado = 'manual'` | El auto-sync la salta; solo `Re-importar desde FNB` la reimporta | La corrección del Admin prevalece |
| E-15 | Corrección FNB sobre acta ya calculada con origen `fnb` | Auto reimporta y recalcula todo lo afectado | El dato oficial corregido prevalece salvo manual |
| E-16 | Segunda fase con `numMatchDay` reiniciado en `1` | Se añade con numeración de liga correlativa sin colisionar; número FNB aparte | La temporada tiene varias competiciones |
| E-17 | Aplazado, suspendido o marcador no visible tras `+3h` | Solo calendario y cierre, sin acta ni cálculo | Sin finalización no hay resultado |
| E-18 | Dato ausente al calcular (falta valoración o estado de algún quinteto) | Error bloqueante sin total ni parcial | Prohibido el `0` provisional |
| E-19 | Lecturas concurrentes al vencer throttle | Solo una ejecuta sync con lock; resto sirve BD | Evita doble escritura y carreras |

## 4. Fuera de alcance explícito

- Tablas SQL, RLS, `service_role`, Auth, Onboarding, pantallas (Home, Equipo, Ficha, Mi Resultado, Clasificación, Ajustes, panel Admin como UI): lo definen las specs 03/04/06–09. Esta spec solo exige **qué columnas de vinculación** necesita la 03 (`fnb_uuid`, `fnb_match_id`, `fnb_universally_id`, `origen_resultado`, marcas de sync) y **qué comportamientos** necesita la 09 (dos botones, pre-relleno revisable, Re-importar).
- Lógica del motor §0, definición de expulsión, rachas, cierre y validaciones (spec-02); fundación TS/Vitest/i18n (spec-01); `/normas` (spec-05).
- Sincronización de entrenadores: Maider y Páter nunca se sincronizan contra la FNB.
- Uso de acumulados FNB para medias: las medias de Ficha se derivan solo del motor al leer; el endpoint de acumulados queda fuera de uso.
- Cron, workers, Supabase Realtime, polling agresivo, notificaciones, navegador headless (Puppeteer/Playwright): prohibidos por `CONSTITUTION.md §3`.
- Multi-equipo / multi-liga, fotos de jugadores desde la FNB (las fotos viven en `public/`, `CONSTITUTION.md §2`), mapa de tiros y play-by-play como features de UI.
- Contenido i18n (`es/strings.json`): los textos de errores/avisos de sync los definen las specs que implementen cada pantalla.

## 5. Criterios de finalización (Definition of Done)

- [ ] Existe spec congelada con RF-01–RF-13 y E-01–E-19, coherente con `CONSTITUTION.md §3/§5/§7/§11`, `README.md §8` y specs 02/03/09, incluyendo 5 faltas como expulsión con su actualización conjunta en §0 y spec-02, y papel con gracia de `1 día`.
- [ ] Existe `specs/10-scraping-fnb/fnb-api-reference.md` actualizado en el mismo cambio: ejemplo J2 reinterpretado con 5 faltas como expulsión, acumulados marcados fuera de uso, entrenadores marcados no sincronizados y dorsal marcado nunca para mapeo; si la FNB cambia, se actualiza la referencia en el mismo cambio.
- [ ] La spec-03 incluye las columnas de vinculación FNB (`fnb_uuid` en jugadores; `fnb_match_id`, `fnb_universally_id`, `origen_resultado`, marcas de sync en jornadas con throttle `24h/1h/+3h` y numeración de liga correlativa) y la spec-09 incluye dos botones FNB con pre-relleno sin autoguardado.
- [ ] Tests Vitest en verde que cubren: parseo de calendario (J1 sin acta en gracia vs papel tras `1 día`, J2 con acta), mapeo por `fnb_uuid` + fallback solo por nombre con 0/2+ a pendiente y dorsal nunca mapea, `BASE`/estado desde acta (jugo solo con minutos vs `no_convocado` ausente vs `dnp` 0/0 vs lesionado previo y lesionado que juega), expulsión con 5 faltas incluida, throttle (`24h/1h/+3h`) con lock concurrente, no-sobrescritura manual con auto-actualización de corrección `fnb`, y segunda fase aditiva sin colisión.
- [ ] `npx tsc --noEmit` con 0 errores y cero `any`.
- [ ] `npm run lint` con 0 warnings.
- [ ] `npm test` en verde.
- [ ] `npm run build` en verde.
- [ ] Verificación manual: con la FNB caída la jornada se completa a mano y la liga no se bloquea; con J2 `55488` pegar la URL pre-rellena las valoraciones sin guardar hasta confirmación del Admin; J1 `55483` queda pendiente `1 día` y luego papel `0` excluida + rompe rachas sin manual.
