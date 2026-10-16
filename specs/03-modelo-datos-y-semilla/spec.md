# 03 — Modelo de datos y semilla (§0)

## 1. Objetivo y contexto

**Objetivo:** fijar el QUÉ de los datos que persiste la liga y el QUÉ de la semilla inicial para que el motor §0 (spec-02) y el sync FNB (spec-10) tengan entradas completas, únicas y no bloqueen la liga si falla la FNB.

**Contexto:**

- `README.md §0` es la fuente única de las reglas, pero no define entidades, estados por jornada, alineaciones, cierre persistido vs derivado, totales materializados vs derivados, ni contenido de la semilla. Esta spec cierra esas ambigüedades con decisiones del usuario.
- `CONSTITUTION.md §2/§3/§4/§11` y `AGENTS.md` exigen: Postgres solo relacional con fotos en `public/` (0 MB Storage), sin Realtime ni demonios, auth propia sin email, motor puro sin lógica duplicada en BD, admin semilla excluido del ranking y formulario manual garantizado.
- `spec-02` gobierna cálculo, validación, rachas, cierre y dato ausente. `spec-10` gobierna origen FNB vía API OWC, mapeo por `fnb_uuid`, Lazy Sync con throttle y corrección manual que bloquea el auto-sync. Esta spec define **qué entidades y columnas** necesitan ambas, sin implementarlas.
- **Glosario (vinculante):** `usuario`/`manager` = quien juega al fantasy con `username`; `jugador` = jugador real de plantilla Lagunak; `entrenador` = solo Maider o Páter; `jornada` = partido fantasy ligado a un partido FNB; `alineación`/`quinteto` = 5 jugadores + entrenador + capitán de un manager en una jornada.
- **Por qué entrenador separado:** Maider y Páter no tienen posiciones ni ocupan slots de jugador (spec-02 RF-02). Mezclarlos con jugadores permitiría alineaciones inválidas.
- **Por qué solo crudo en BD:** si la BD guardara totales o desgloses, habría dos fuentes de verdad y divergencias con §0. La BD guarda entradas; el motor calcula.
- **Por qué 3 estados:** lesionado (baja médica marcada por Admin y respetada por el sync) vs no_convocado (fuera de lista) vs DNP —`Did Not Play`, convocado pero con 0 minutos por decisión técnica—. Los tres fuerzan `BASE=0`, ocupan slot y cuentan para racha futura, pero el motivo cambia la UI (🚑/❌) y el sync.
- **Por qué excepción papel:** la J1 `55483` no tiene acta digital (`universallyid=null`, solo foto en papel). Dejarla en error eterno bloquearía la clasificación. Decisión del usuario: esa jornada se detecta en auto, vale 0 para todos, se excluye de todo y rompe rachas. Es excepción a spec-02 y obliga a actualizar spec-02 en el mismo cambio.

Decisiones cerradas con el usuario que esta spec congela: tabla `entrenador` propia con id único inventado si la FNB no da uuid; auth mínima incluida (detalle en spec de auth); semilla plantilla completa con placeholders y plantilla viva con alta/baja; 3 estados; MVP solo calculado; una alineación por manager/jornada editable hasta cierre con instante de inicio; hora guardada y cierre derivado en `Europe/Madrid`; solo crudo/total derivado; ausencia = −10 sin retroactivo para altas tardías; racha derivada del histórico; papel en auto y excluida de todo; semilla mínimo J1+J2 ampliable; rol `manager|admin` + RLS exigido; mapeo solo por `uuid` con dorsal informativo; origen a nivel jornada con timestamps y throttle spec-10; pendientes en panel sin notificaciones.

## 2. Requisitos funcionales (EARS)

- **RF-01 — Jugadores con plantilla viva:**
  Cuando exista la liga, el sistema deberá persistir ~20 jugadores reales con nombre, dorsal informativo, exactamente 2 posiciones válidas, nombrePete, `img`/`imgPete` en `public/`, descripción faltosa, `fnb_uuid` único y estado activo/inactivo con fechas. Si falta mote o foto Keman, entonces el sistema deberá usar placeholder sin bloquear ninguna jornada. Cuando haya un alta, baja, cambio de dorsal, foto o mote mid-season, entonces el sistema deberá aplicarlo sin reescribir el histórico ya guardado.

- **RF-02 — Entrenadores como entidad propia:**
  Cuando se gestione el cuerpo técnico, el sistema deberá persistir a Maider y Páter únicamente en la entidad `entrenador`, sin posiciones ni dorsal, cada uno con identificador único (el `fnb_uuid` si la FNB lo da, si no uno inventado y estable). Si aparece un tercer entrenador, o Maider/Páter en slot de jugador, o un jugador en slot de entrenador, entonces el sistema deberá rechazarlo.

- **RF-03 — Auth mínima incluida:**
  Cuando se registre un manager, el sistema deberá persistir usuario con `username` único case-insensitive, hash de password y sesión httpOnly persistente con rate-limit, sin email. El formato de `username`, mínimos de password, caducidad de sesión y umbrales de rate-limit los definirá la spec de auth; esta spec solo exige su existencia. Si el usuario pide reset, entonces el sistema deberá resolverlo solo por vía manual del Admin por canal privado.

- **RF-04 — Roles con RLS y admin que no juega:**
  Cuando haya usuarios, el sistema deberá distinguir rol `manager|admin` con RLS activado en todas las tablas: el manager solo lee plantilla/jornadas y escribe su propia alineación, el admin escribe todo y la clave `service_role` jamás llega al cliente. El Admin semilla nace con username fijo inicial, no juega, no tiene quinteto y queda excluido de rankings y top 3. Si el Admin intenta alinear o puntuar, entonces el sistema deberá rechazarlo.

- **RF-05 — Jornada con hora y vinculación FNB:**
  Cuando exista una jornada, el sistema deberá registrar rival, local/visitante, campo y municipio, `hora_partido` en `Europe/Madrid`, `fnb_match_id`, `fnb_universally_id` nullable, marcador oficial, `origen_resultado` (`manual|fnb` a nivel jornada, sin parciales mixtos) y marcas `last_calendar_sync` / `last_result_sync`. El sync deberá respetar throttle spec-10 (calendario 6h; resultados solo si `hora+2h<=ahora` y cada 15min). Si falta la hora, entonces se aplicará spec-02 E-19 (cierre incalculable, bloqueo de guardado).

- **RF-06 — Cierre derivado, nunca fijo:**
  Cuando se necesite el cierre, el sistema deberá derivarlo siempre como `hora_partido − 3h` en `Europe/Madrid`. Si cambia la hora del partido, entonces el cierre deberá recalcularse sin invalidar alineaciones ya guardadas, sin resucitar envíos tardíos ni anular envíos válidos.

- **RF-07 — Resultado crudo por jugador y jornada:**
  Cuando haya acta, el sistema deberá guardar por cada jugador activo de plantilla su valoración entera, su estado (`jugo|lesionado|no_convocado|dnp`) y su flag `expulsado` bool (el motivo FIBA se resuelve antes de guardar en el sync/manual). Si falta valoración o estado en una jornada normal, entonces el sistema deberá bloquear el cálculo con error sin total ni parcial, salvo excepción RF-11.

- **RF-08 — Lesionado previo se respeta:**
  Si el Admin marcó `lesionado`, entonces el auto-sync no deberá sobrescribirlo a `dnp`/`no_convocado` y su BASE deberá tratarse como `0`.

- **RF-09 — Lesión y expulsión excluyentes:**
  Si un jugador consta como `lesionado|no_convocado|dnp`, entonces nunca deberá constar a la vez como `expulsado`.

- **RF-10 — Posiciones tal cual:**
  Cuando se valide un jugador, el sistema deberá exigir exactamente 2 letras guardadas tal cual. La pareja `["E","A"]` es válida aunque `E==A` a efectos del `+5`. La alineación guardará la letra elegida (`B|E|A|AP|P`) sin normalizar. Si no se cumple, entonces el dato deberá tratarse como inválido y bloquear su validación.

- **RF-11 — Excepción papel en auto y excluida:**
  Si un partido finalizado tiene `state="1"` pero `universallyid=null` (acta en papel, caso J1 `55483`), entonces el auto deberá marcar esa jornada como papel: valdrá `0` para todos los managers activos entonces, quedará excluida de acumulado, media, evolución, Top de última y Top de jugadores (como si no existiera salvo para romper rachas) y romperá las rachas de todos. Esta regla es excepción a spec-02 RF-17/E-16 y deberá actualizarse en spec-02 en el mismo cambio.

- **RF-12 — Una alineación editable hasta cierre:**
  Cuando un manager alinee, el sistema deberá guardar una única alineación por manager y jornada con 5 jugadores distintos, posición de alineación por jugador, 1 entrenador y 1 capitán que sea uno de los 5, más el instante de inicio de petición en servidor. El onboarding usa esta misma entidad. Si el instante es estrictamente anterior al cierre, entonces deberá aceptar y solo valer la última enviada; si es igual o posterior, deberá rechazarla. El envío incompleto se rechaza sin guardar.

- **RF-13 — Sin quinteto penaliza sin retroactivo:**
  Si una jornada normal queda sin alineación válida enviada por un manager activo a su hora, entonces el sistema deberá computar `−10` en esa jornada y romper sus rachas, sin crear fila fantasma. Si el manager se dio de alta después de esa jornada, entonces las pasadas no deberán computar ni `−10` ni `0` y sus rachas empezarán en su primera alineación.

- **RF-14 — Racha derivada, papel rompe:**
  Cuando se necesite la racha, el sistema deberá derivarla del histórico de alineaciones guardadas (cuenta aunque `BASE=0`, rompe si no alineas o no envías). La jornada papel RF-11 romperá las rachas de todos aunque hubieran alineado. El sistema no deberá persistir ningún contador de racha.

- **RF-15 — Totales nunca materializados:**
  El sistema no deberá persistir totales de manager, desgloses, MVP ni bonus. Todo total y desglose deberá derivarse del motor puro al leer, incluidas media, última valoración y evolución. Por qué: evita divergencia con §0 y cumple `CONSTITUTION.md §5`.

- **RF-16 — MVP solo calculado:**
  Cuando se cierre la jornada, el MVP (`+3`) deberá calcularlo exclusivamente el motor §0 sobre máxima BASE habiendo jugado. El sistema no deberá persistir ningún flag de MVP manual ni de la FNB y el formulario manual no tendrá campo MVP; si la FNB trae alguno, deberá ignorarlo.

- **RF-17 — Automático con manual garantizado y mapeo por uuid:**
  Cuando haya acta digital, el sistema deberá importar calendario y resultados de forma automática por `fnb_uuid` (si falta, fallback solo por nombre normalizado sin tildes case-insensitive y guarda su `uuid` al vuelo). El dorsal es informativo, repetible y nunca se usará para mapear. Si la FNB cae o no hay acta digital, entonces deberá permitir completar la jornada íntegramente a mano y la liga nunca deberá bloquearse.

- **RF-18 — Manual bloquea auto salvo reimporte:**
  Cuando el Admin edite a mano una jornada, el sistema deberá marcar `origen_resultado='manual'` a nivel jornada y el auto-sync nunca deberá sobrescribirla. Si el Admin pulsa explícitamente Re-importar/Re-calcular automático, entonces sí deberá reimportar desde la FNB y recalcular todo lo afectado.

- **RF-19 — Semilla mínima J1+J2 ampliable:**
  La semilla deberá traer como mínimo 2 jornadas ejemplo: J1 `55483` sin acta (dispara RF-11) y J2 `55488` con acta digital (11 valoraciones ejemplo §0 mapeadas a sus jugadores). Se podrán añadir más jornadas ejemplo/test sin violar la spec. El resto del calendario lo aporta el sync desde `idTeam 11659`.

- **RF-20 — Unicidades mínimas:**
  El sistema deberá exigir `username` único case-insensitive para managers y `fnb_uuid` único para jugadores. El dorsal podrá repetirse y el nombrePete no será único por ser cosmético.

- **RF-21 — Pendientes en panel sin notificaciones:**
  Cuando el sync vincule un jugador nuevo por nombre con posiciones/fotos pendientes, entonces el sistema deberá dejarlo pendiente en el panel Admin hasta completarlo, sin push ni email.

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | Foto o mote ausente en semilla | Placeholder en `public/` y nombre provisional; la jornada no se bloquea; 0 MB Storage, nunca Supabase Storage | Arte Keman pendiente; la liga no espera al arte |
| E-02 | `DNP` (convocado, 0 min) vs `no_convocado` vs `lesionado` | Los tres dan `BASE=0`, ocupan slot, bloquean `+5/−N` y cuentan para racha futura; solo `lesionado` frena al sync | Sin motivo se pierde la UI 🚑/❌ y se sobrescribiría una baja médica |
| E-03 | Jornada papel detectada en auto (`state=1`, `universallyid=null`) | `0` para activos entonces, excluida de acumulado/medias/evolución/tops, rompe rachas | Sin acta no hay BASE; castigar con `−10` sería injusto y bloquear en error eterniza la J1 |
| E-04 | Partido futuro sin acta (`state=0`) o dato parcial pendiente en jornada normal | Solo calendario y cierre; error bloqueante sin total ni parcial, nunca `0` provisional | Prohibido inventar puntos sin dato (spec-02 E-16) |
| E-05 | Jornada normal sin quinteto de un activo | `−10` y rompe sus rachas; no es fila, es ausencia; alta tardía no hereda nada | Penaliza el olvido, distinto del papel que es causa externa |
| E-06 | Envío en el segundo exacto del cierre o después (instante de inicio) | Rechazo aunque el contador mostrara tiempo; cambio de hora no resucita tardíos ni anula válidos | Cierre estricto en servidor `Europe/Madrid` |
| E-07 | Partido sin hora o inválida | Cierre incalculable, bloqueo de guardado de esa jornada | Sin hora no hay garantía de cierre |
| E-08 | `lesionado/dnp/no_convocado` + `expulsado` a la vez | Combinación inválida, rechazo | Un no jugado nunca consta como expulsado |
| E-09 | Jugador con 0, 1 o 3+ posiciones | Dato inválido, bloquea su validación; `["E","A"]` sí vale tal cual | Cada jugador tiene exactamente 2 válidas por §0 |
| E-10 | `username` duplicado con distinta capitalización (`Pete`/`pete`) | Rechazo por duplicado | Login es case-insensitive |
| E-11 | `fnb_uuid` duplicado o jugador nuevo sin `uuid` | Rechazo de duplicado; el nuevo se vincula solo por nombre normalizado, guarda su `uuid` y queda pendiente en panel para completar posiciones/fotos | Sin vínculo estable el sync duplicaría; dorsal no identifica |
| E-12 | Dorsal repetido en plantilla | Permitido, sin error ni mapeo por dorsal | El dorsal no identifica; identifica el `fnb_uuid` |
| E-13 | FNB caída, clave rotada o sin acta digital | Calendario y manual siguen operativos; error visible con reintento manual, sin parcial guardado | La liga nunca se bloquea (principio 11) |
| E-14 | Jornada `manual` ante auto-sync | El auto la salta; solo Re-importar explícito la reimporta y recalcula a nivel jornada | La corrección del Admin prevalece |
| E-15 | Cambio de hora en la FNB | Recalcula cierre sin invalidar alineaciones | Cierre deriva de la hora vigente |
| E-16 | Segunda fase / cambio de grupo mismo `idTeam` | Jornadas nuevas sin borrar histórico | La temporada tiene varias competiciones |
| E-17 | Admin intenta alinear o entrar en ranking | Rechazo / exclusión | Admin semilla no juega |
| E-18 | Refuerzo mid-season o reactivación tras baja | Entra sin historia; siguiente aparición cuenta como 1.ª; si le faltan posiciones queda pendiente en panel | Un alta reinicia (spec-02 RF-09); sin 2 posiciones no hay `+5` válido |

## 4. Fuera de alcance explícito

- DDL, tipos SQL, índices, migraciones, clientes Supabase, `service_role` como secreto y Server Actions/SSR como mecanismo (esta spec solo exige QUÉ columnas y reglas, incluido RLS activado como requisito).
- Pantallas y componentes (Home, Equipo, Ficha, Mi Resultado, Clasificación, Ajustes, panel Admin como UI), previsualización en vivo (`12 +5 −1 = 16`), gráfica de evolución, top 3, fondo de pista, móvil 360–430px, tap-to-select, PWA, tema claro/oscuro y Modo Pete más allá de las columnas `img/imgPete` y `nombre/nombrePete`.
- Lógica del motor §0, rachas como cálculo y cierre como validación (spec-02); sync como comportamiento, throttle y parseo OWC (spec-10); `/normas` (spec-05); fundación TS/Vitest/i18n (specs-00/01); detalle de formato password/sesión/rate-limit (spec de auth).
- Cron, workers, Realtime, polling agresivo, Puppeteer/Playwright, notificaciones, email, auto-reset, multi-liga, chat, escritorio, app nativa.
- Fotos traídas de la FNB (viven en `public/`), mapa de tiros y play-by-play como features.
- Textos visibles y claves i18n (`es/strings.json`, futura `eu.json`).

## 5. Criterios de finalización (Definition of Done)

- [ ] Existe spec congelada con RF-01–RF-21 y E-01–E-18, coherente con `CONSTITUTION.md`, `AGENTS.md`, spec-02 y spec-10, incluyendo excepción papel RF-11 con su actualización de spec-02 en el mismo cambio.
- [ ] La BD expone las entidades `usuario/sesión, jugador, entrenador, jornada, alineación, resultado-por-jugador` con columnas de negocio RF-01–RF-07 y de vinculación FNB (`fnb_uuid` en jugadores; id único en entrenadores; `fnb_match_id`, `fnb_universally_id`, `origen_resultado` a nivel jornada, `last_calendar_sync`/`last_result_sync` en jornadas), rol `manager|admin` con RLS activado y semilla con admin inicial + ~20 jugadores con `uuid` verificados + mínimo J1 `55483` + J2 `55488`.
- [ ] Tests Vitest en verde que cubren: unicidad `username` case-insensitive y `fnb_uuid` con dorsal repetible; 2 posiciones con `["E","A"]` tal cual; lesión/expulsión excluyentes; lesionado respetado; NULL temporal que bloquea salvo papel; papel auto con `0` + excluida de todo + rompe; ausencia normal con `−10` + rompe y alta tardía sin retroactivo; unicidad 1 alineación con instante de inicio y rechazo en el segundo exacto; cambio de hora sin resucitar/anular; manual que bloquea salvo Re-importar; mapeo solo por `uuid` con fallback por nombre; plantilla viva con alta/baja sin reescribir histórico y tercer entrenador rechazado.
- [ ] `npx tsc --noEmit` con 0 errores y cero `any`.
- [ ] `npm run lint` con 0 warnings.
- [ ] `npm test` en verde.
- [ ] `npm run build` en verde.
- [ ] Verificación manual: con FNB caída o J1 papel la liga no se bloquea (0 + excluida + ruptura); con J2 el auto importa por `uuid` sin duplicar y deja pendientes en panel; ningún total vive en BD, todo desglose deriva del motor.
