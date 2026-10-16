# 10 — Sincronización FNB vía API OWC (§8)

## 1. Objetivo y contexto

**Objetivo:** fijar el QUÉ de la carga automática de calendario y resultados desde la Federación Navarra de Baloncesto (FNB) sin intervención del Admin, manteniendo el formulario manual como garantía cuando la FNB no publique acta digital.

**Contexto:**

- `README.md §8` pedía "Pegar `URL FNB` -> scraping auto (ideal)" + formulario manual. Investigación verificada el `2026-10-16` demuestra que **no hace falta scrapear HTML**: las páginas `pagina-partido/?id=...` y `pagina-equipo/?id=...` son contenedores React vacíos (`owbasket-shortcode-root`) que consumen dos APIs JSON públicas de **Optimal Way Consulting (OWC)**.
- Equipo verificado: **LAGUNAK A**, `idTeam = "11659"`, `teamUuid = "677d8f98-0cb0-4067-b004-2dc69d7573f7"`, `idClub = "90"`, `idGroup = "1686"` (Fase Previa, Grupo 2, `idCompetition = "946"`, `idCategorySigned = "490"`, temporada `"2026"`).
- Partido ejemplo verificado: `idMatch = "55488"` (J2, LAGUNAK A 67 - 42 PAYVI TABERNA SANDUZELAI, `2026-10-11 18:00:00`) con acta digital `universallyid = "6acbcc7bd75749bb61a786f8"`. Sus 11 valoraciones (`1, 6, 12, 7, 2, 0, 8, 1, -1, 13, -1`) coinciden con el ejemplo de `README.md §0`.
- Contraejemplo verificado: J1 `idMatch = "55483"` (BERRIOZAR MKE 64 - 58 LAGUNAK A) tiene `state = "1"` y marcador oficial, pero `universallyid = null` (acta en papel, solo foto `.jpeg` en S3). Sin acta digital no hay valoraciones por jugador.
- `CONSTITUTION.md §3` (sin Realtime, sin demonios, sin cron, sin polling agresivo) y `§11` (formulario manual garantizado + scraping FNB) obligan a un **Lazy Sync en servidor con throttle**, nunca a un worker permanente. `spec-02 RF-01/RF-10/RF-11/RF-16/RF-20` gobiernan cómo se convierte el dato FNB en `BASE`, MVP, expulsión, cierre y recálculo.
- **Referencia técnica verificada:** `specs/10-scraping-fnb/fnb-api-reference.md` (endpoints, formato Base64, ejemplos reales de payload, `uuid` permanentes de plantilla). Esta spec define el comportamiento; la referencia define la fuente. Si discrepan, se corrige la referencia, nunca esta spec en silencio.
- **Decisiones cerradas con el usuario que esta spec congela:** calendario completo automático desde `idTeam = 11659` (14 jornadas Fase Previa verificadas); resultados automáticos cuando haya acta digital; pegado de URL FNB como pre-relleno revisable; manual siempre disponible; el auto-sync jamás sobrescribe una corrección manual del Admin; `MVP` lo calcula solo el motor §0.

## 2. Requisitos funcionales (EARS)

- **RF-01 — Fuente API JSON OWC, prohibido scraping HTML:**
  Cuando el sistema necesite datos de la FNB, deberá obtenerlos exclusivamente de las APIs JSON de OWC descritas en `fnb-api-reference.md` (`ESB` + `MSSTATS`). Si el HTML de `fnbaloncesto.com` cambia, entonces el sistema no deberá romperse porque nunca lo parsea.

- **RF-02 — Calendario de temporada desde `idTeam 11659`:**
  Cuando se sincronice el calendario, el sistema deberá obtener todas las jornadas del equipo `11659` desde el endpoint de temporada completa. Si la FNB publica una segunda fase o cambia de grupo, entonces el sistema deberá incorporarla como jornadas nuevas sin borrar el histórico.

- **RF-03 — Datos mínimos por jornada desde la FNB:**
  Cuando se cree o actualice una jornada desde la FNB, el sistema deberá registrar número de jornada (`numMatchDay`), `fnb_match_id` (`idMatch`), `fnb_universally_id` (`universallyid`, nullable), fecha/hora (`matchDay` en `Europe/Madrid`), rival, local/visitante, campo y municipio, y marcador oficial cuando `state = "1"`. Si falta la hora del partido, entonces se aplicará `spec-02 E-19` (cierre incalculable, bloqueo de guardado).

- **RF-04 — Lazy Sync en servidor con throttle (sin demonios):**
  Cuando se lea el calendario/Home en un Server Component, el sistema deberá comprobar la FNB como máximo cada `6 horas` para calendario y, para resultados, solo jornadas con `hora_partido + 2h <= ahora` en estado `pendiente_resultado` y como máximo cada `15 minutos`. Si no se cumplen esas ventanas, entonces el sistema deberá servir lo cacheado en BD sin llamar a la FNB.

- **RF-05 — Mapeo de jugadores por `fnb_uuid`:**
  Cuando se importen estadísticas, el sistema deberá emparejar primero por `fnb_uuid` (`player.uuid`, permanente toda la temporada). Si un jugador del acta no tiene `fnb_uuid` guardado, entonces el sistema deberá resolverlo por `dorsal` o nombre normalizado (sin tildes, case-insensitive) y guardar su `fnb_uuid` al vuelo.

- **RF-06 — BASE y estado desde acta digital:**
  Cuando un partido tenga acta digital, el sistema deberá fijar por cada jugador de plantilla: si aparece en el acta con `gamePlayed > 0` o `timePlayed > 0`, estado `jugo` y `BASE = trunc(valoracion)` (entero); si no aparece o aparece con `gamePlayed = 0` y `timePlayed = 0`, estado `no_convocado`/`dnp` (salvo `lesionado` ya marcado por el Admin, que se respeta) y `BASE = 0`. Si la valoración viniera no entera, entonces el sistema deberá truncar a entero según `spec-02 RF-01`.

- **RF-07 — Expulsión automática con regla FIBA:**
  Cuando se importe un acta digital, el sistema deberá marcar `expulsado = true` si `disqualification > 0` o `scuffle > 0` o `(unsportsmanslike + technique + coachTechnical) >= 2`. Si el jugador solo acumuló 5 faltas personales (`personal = 5`), entonces no deberá marcarse como expulsado.

- **RF-08 — MVP solo desde el motor §0:**
  Cuando se cierre una jornada importada, el sistema deberá dejar que el MVP (`+3`) lo calcule exclusivamente el motor puro `src/lib/scoring/` sobre la máxima `BASE` de plantilla habiendo jugado. Si la FNB trae cualquier flag de MVP, entonces el sistema deberá ignorarlo.

- **RF-09 — Partido sin acta digital exige carga manual:**
  Si un partido finalizado tiene `state = "1"` pero `universallyid = null` (acta en papel, caso J1 `55483`), entonces el sistema deberá guardar el marcador oficial, marcar la jornada como `requiere_carga_manual_acta` y no producir totales de manager hasta que el Admin complete el acta manual.

- **RF-10 — Corrección manual bloquea el auto-sync:**
  Cuando el Admin edite manualmente una jornada o un resultado de jugador, el sistema deberá marcar esa jornada con `origen_resultado = 'manual'` y el auto-sync nunca deberá sobrescribirla. Si el Admin pulsa explícitamente `Re-importar desde FNB`, entonces el sistema sí deberá reimportar y recalcular todo lo afectado según `spec-02 RF-20`.

- **RF-11 — Pre-relleno Admin por URL y botón de sincronización:**
  Cuando el Admin pegue una URL `pagina-partido/?id={idMatch}` (o `?uuid={universallyid}`) o pulse `Sincronizar calendario y actas FNB ahora`, el sistema deberá descargar ese partido y pre-rellenar el formulario manual en pantalla para revisión antes de guardar. Si la URL es inválida o la FNB no responde, entonces deberá mostrar error sin guardar nada parcial.

- **RF-12 — Formulario manual siempre garantizado:**
  Cuando la FNB esté caída, rote su clave pública o un partido no tenga acta digital, el sistema deberá permitir completar la jornada íntegramente a mano (valoraciones, lesionados/convocados/DNP, expulsados). Si falla todo lo automático, entonces la liga nunca deberá bloquearse (principio 11 de `CONSTITUTION.md`).

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | Partido futuro (`universallyid = null`, `state = "0"`) | Solo crea/actualiza calendario y `cierre = hora − 3h`; no pide acta ni calcula | Aún no hay nada que importar |
| E-02 | Partido finalizado con acta digital (`state = "1"`, `universallyid` presente, caso J2 `55488`) | Importa valoraciones, detecta DNP/expulsados, ejecuta motor §0 y marca jornada `calculada` de forma atómica | Camino feliz verificado |
| E-03 | Partido finalizado sin acta digital (`state = "1"`, `universallyid = null`, caso J1 `55483`) | Guarda marcador, marca `requiere_carga_manual_acta`, no calcula totales | Sin valoraciones no hay `BASE` (spec-02 E-16) |
| E-04 | Jugador de plantilla ausente del acta | `BASE = 0`, estado `no_convocado`/`dnp` salvo `lesionado` previo | Ocupa slot, se muestra 🚑/❌, nunca se oculta (§0) |
| E-05 | Jugador nuevo en acta sin `fnb_uuid` en BD (vinculado/refuerzo: dorsales 14/16/22 en J2) | Alta o vínculo por dorsal/nombre + guarda `fnb_uuid`; avisa al Admin para completar `posiciones[2]`/fotos | Sin 2 posiciones no hay `+5` válido (spec-02 E-21) |
| E-06 | Eliminado por 5 faltas (`personal = 5`, caso Marcos Gómez J2) | No es expulsión: `BASE` intacta, sin `−5` | Solo descalificantes/antideportivas/técnicas expulsan |
| E-07 | Cambio de hora del partido en la FNB | Recalcula `cierre = hora − 3h` sin invalidar alineaciones ya guardadas | `spec-02 RF-16/E-18` |
| E-08 | `matchDay` sin zona o con formato inesperado | Se interpreta como `Europe/Madrid`; si es ininterpretable, error y bloqueo según `spec-02 E-19` | Sin hora fiable no hay cierre |
| E-09 | Rotación de la API key pública OWC o caída de ESB/MSSTATS | Error visible con reintento manual; el calendario y el formulario manual siguen operativos | Resiliencia: la liga nunca se bloquea |
| E-10 | Jornada con `origen_resultado = 'manual'` | El auto-sync la salta; solo `Re-importar desde FNB` la reimporta | La corrección del Admin prevalece |
| E-11 | Segunda fase / cambio de `idGroup` con mismo `idTeam` | Se añade como jornadas nuevas; el histórico de Fase Previa queda intacto | La temporada tiene varias competiciones |
| E-12 | Dato ausente al calcular (falta valoración o estado de algún quinteto) | Error bloqueante sin total ni parcial, según `spec-02 RF-17/E-16` | Prohibido el `0` provisional |

## 4. Fuera de alcance explícito

- Tablas SQL, RLS, `service_role`, Auth, Onboarding, pantallas (Home, Equipo, Ficha, Mi Resultado, Clasificación, Ajustes, panel Admin como UI): lo definen las specs 03/04/06–09. Esta spec solo exige **qué columnas de vinculación** necesita la 03 (`fnb_uuid`, `fnb_match_id`, `fnb_universally_id`, `origen_resultado`, timestamps de sync) y **qué comportamientos** necesita la 09.
- Lógica del motor §0, rachas, cierre y validaciones (spec-02); fundación TS/Vitest/i18n (specs-00/01); `/normas` (spec-05).
- Cron, workers, Supabase Realtime, polling agresivo, notificaciones, navegador headless (Puppeteer/Playwright): prohibidos por `CONSTITUTION.md §3`.
- Multi-equipo / multi-liga, fotos de jugadores desde la FNB (las fotos viven en `public/`, `CONSTITUTION.md §2`), mapa de tiros y play-by-play como features de UI.
- Contenido i18n (`es/strings.json`): los textos de errores/avisos de sync los definen las specs que implementen cada pantalla.

## 5. Criterios de finalización (Definition of Done)

- [ ] Existe spec congelada con RF-01–RF-12 y E-01–E-12, coherente con `CONSTITUTION.md §3/§5/§7/§11` y `spec-02`.
- [ ] Existe `specs/10-scraping-fnb/fnb-api-reference.md` con endpoints, decodificación Base64, ejemplos reales (`11659`, `55488`, `55483`) y `uuid` de plantilla; si la FNB cambia, se actualiza la referencia en el mismo cambio.
- [ ] La spec-03 incluye las columnas de vinculación FNB (`fnb_uuid` en jugadores/entrenadores; `fnb_match_id`, `fnb_universally_id`, `origen_resultado`, timestamps de sync en jornadas) y el seed usa los `uuid` verificados de la referencia.
- [ ] Tests Vitest en verde que cubren: parseo de calendario (14 jornadas, J1 sin `universallyid`, J2 con acta), mapeo por `fnb_uuid` + fallback por dorsal/nombre, `BASE`/`estado` desde acta (juega vs DNP vs lesionado previo), expulsión FIBA (descalificante/scuffle/2×antideportiva-técnica) vs 5 faltas, throttle de sync (6h/15min/+2h) y no-sobrescritura manual.
- [ ] `npx tsc --noEmit` con 0 errores y cero `any`.
- [ ] `npm run lint` con 0 warnings.
- [ ] `npm test` en verde.
- [ ] `npm run build` en verde.
- [ ] Verificación manual: con la FNB caída o con J1 `55483`, la jornada se completa a mano y la liga no se bloquea; con J2 `55488`, pegar la URL pre-rellena las 11 valoraciones sin guardar hasta confirmación del Admin.
