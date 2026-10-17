# 07 — Home y Ficha Jugador (§2 y §4)

## 1. Objetivo y contexto

**Objetivo:** fijar el QUÉ de la pantalla `Home` (§2 del `README.md`), del listado de plantilla `/jugadores` y de la `Ficha de jugador individual` (§4 del `README.md`) para que cualquier manager consulte de un vistazo el cierre, el próximo partido, los mejores de la última jornada y el rendimiento/estado de cada jugador real desde el móvil con una mano.

**Contexto:**

- `README.md §2` y `§4` definen los bloques del Home y la Ficha, pero dejaban abiertos el criterio de transición entre jornadas con calendario FNB precargado, el tratamiento de empates y cortes en el Top 3, el origen de la racha en la ficha, el redondeo de medias y la distinción visual entre `BASE = 0` jugando vs `lesionado / no_convocado / dnp`.
- `CONSTITUTION.md §3/§5/§7/§8/§9/§11` y `AGENTS.md` exigen: lecturas SSR/cacheadas sin demonios ni Realtime, cálculos derivados exclusivamente del motor puro (`src/lib/scoring/`) y dominio (`src/lib/dominio/`), contador del Home solo como UX (el cierre real `< hora_partido − 3h` lo valida el servidor en `Europe/Madrid`), diseño solo móvil (360–430px, `tap-to-select`, objetivos ≥ 44×44px), Modo Pete y tema claro/oscuro transversales, cero strings hardcodeados (`es/strings.json`) y resiliencia ante caída de la FNB.
- `spec-02` gobierna el cálculo §0 y las rachas; `spec-03` gobierna las entidades, los 4 estados de acta (`jugo | lesionado | no_convocado | dnp`) y la excepción de jornada en papel (RF-11); `spec-05` gobierna las anclas de `/normas`; `spec-10` gobierna el Lazy Sync FNB con throttle. Esta spec solo consume esas reglas, sin redefinirlas.

**Decisiones cerradas con el usuario que esta spec congela:**
- Home global puro (los 4 bloques de §2, sin resumen personal de mi quinteto ni mis puntos).
- Jornada activa del Home = primera jornada cronológica aún no `calculada` ni `papel`; mantiene `Cerrado - vuelve tras el partido` tras pasar su cierre hasta que queda `calculada` (auto-sync FNB o manual) o `papel`, instante en que salta a la cuenta atrás de la siguiente ($N+1$). Sin jornada futura pendiente, muestra el último partido disputado con aviso `Sin próxima jornada`.
- Cuenta atrás siempre en formato `HH:MM:SS` acumulando horas (ej. `72:05:10`), actualizada cada segundo. Dato ausente de lugar o rival = `Por confirmar`.
- Última jornada para Tops y Ficha = última jornada `calculada` (vía FNB o manual), excluyendo jornadas en `papel` (`spec-03 RF-11`).
- Top 3 Managers y Top 3 Jugadores: máximo 3 filas, numeración olímpica (`1, 1, 3`), formato con nombre + cifra + etiqueta `(Jx)`. En Managers solo entran quienes enviaron alineación válida esa jornada (los `−10` por no enviar no entran al Top 3) y nunca el Admin semilla. En Jugadores ordena por `BASE` (incluyendo `0` y negativos), desempata alfabéticamente siempre por `nombre` real (invariante a Modo Pete) y nunca incluye entrenadores (`Maider`/`Páter`).
- Accesos a Ficha: tap en Top 3 Jugadores, enlace `Ver toda la plantilla` bajo el Top 3 hacia `/jugadores` (activos ordenados por dorsal y `nombre` real) y URL directa.
- Ficha solo lectura (sin CTA de alinear): `Media temporada` a 1 decimal `round_half_up` solo sobre partidos con `estado = 'jugo'` (`Sin datos` si 0 jugados); `Última valoración` = `BASE` de la última jornada calculada junto a su icono (`✅` si jugó, `🚑` si `lesionado`, `❌` si `no_convocado` o `dnp`); estado actual en 2 líneas separadas (estado sanitario según última acta + racha `−N` del manager en sesión obtenida de Dominio, oculta/`No aplica` para Admin); tooltips por tap hacia `/normas#base` y `/normas#racha`.
- Gráfica lineal de `BASE` con línea base `0` visible (soporta negativos y punto único si solo hay 1 jornada), solo jornadas calculadas desde el alta del jugador, y scroll horizontal confinado exclusivamente al contenedor de la gráfica.
- Si cae la FNB durante el Lazy Sync del Home, se sirve BD en silencio; solo si falla la lectura de BD se muestra pantalla de error completa con botón `Reintentar`.

## 2. Requisitos funcionales (EARS)

### Guardias de acceso y sincronización

- **RF-01 — Guardia de sesión, clave temporal y onboarding:**
  Cuando un usuario solicite el Home (`/`), el listado de plantilla (`/jugadores`) o una Ficha de jugador, el sistema deberá verificar que tiene sesión activa. Si no tiene sesión, entonces deberá redirigir a login; si su sesión tiene flag de clave temporal pendiente de cambio o el onboarding incompleto (y no es Admin), entonces deberá redirigir al flujo obligatorio correspondiente (`spec-04`) antes de renderizar la pantalla.

- **RF-02 — Lazy Sync FNB silencioso en Home:**
  Cuando se cargue el Home en el servidor, el sistema deberá invocar la comprobación de Lazy Sync con el throttle de `spec-10 RF-04` (calendario máx. cada 6h; resultados de jornadas con `hora_partido + 2h <= ahora` pendientes máx. cada 15 min). Si la API de la FNB falla, tarda o devuelve error, entonces el sistema deberá ignorar el fallo en la vista y renderizar el Home con los datos ya persistidos en BD sin bloquear al usuario.

### Home — Cuenta atrás y Próximo partido

- **RF-03 — Resolución de jornada activa y cuenta atrás (`HH:MM:SS`):**
  Cuando se cargue el Home y exista al menos una jornada aún no `calculada` ni marcada como `papel`, el sistema deberá tomar como jornada activa la primera por orden cronológico. Mientras `ahora < cierre` (`cierre = hora_partido − 3h` en `Europe/Madrid`), el sistema deberá mostrar la cuenta atrás en vivo con formato exacto `HH:MM:SS` (acumulando las horas totales en `HH` aunque superen 24h) actualizada cada segundo como mera UX.

- **RF-04 — Estado Cerrado hasta cálculo de la jornada activa:**
  Cuando en la jornada activa se cumpla `ahora >= cierre` y dicha jornada aún no haya pasado a estado `calculada` (ni `papel`), el sistema deberá mantener esa jornada en el Home mostrando `Cerrado - vuelve tras el partido` en lugar de la cuenta atrás. En cuanto la jornada pase a `calculada` o `papel`, el sistema deberá promover automáticamente la siguiente jornada cronológica como activa.

- **RF-05 — Fallback sin próxima jornada:**
  Si todas las jornadas existentes están ya `calculadas` o en `papel` (o aún no hay próxima jornada futura tras la última disputada), entonces el sistema deberá mostrar en el bloque de partido los datos del último partido disputado junto al aviso explícito `Sin próxima jornada` y ocultar la cuenta atrás. Si no existe ninguna jornada en BD (liga recién creada sin calendario), entonces mostrará estado vacío informativo.

- **RF-06 — Datos del bloque de partido y placeholders:**
  Cuando el Home muestre el próximo partido (o el último como fallback según RF-05), deberá presentar fecha y hora en formato corto español en zona `Europe/Madrid`, condición de local/visitante, lugar (campo/municipio) y rival. Si falta el lugar o el rival, entonces el sistema deberá mostrar el placeholder `Por confirmar` en el campo ausente, nunca hueco vacío.

- **RF-07 — Ayuda de cierre hacia `/normas#cierre`:**
  Cuando el usuario toque el icono de ayuda `?` del bloque de cuenta atrás/cierre, el sistema deberá navegar a `/normas#cierre` (`spec-05 RF-02`).

### Home — Top 3 Managers y Top 3 Jugadores

- **RF-08 — Criterio de última jornada calculada:**
  Cuando el sistema resuelva los bloques `Top 3 Managers` y `Top 3 Jugadores`, deberá tomar únicamente la última jornada en estado `calculada` (sea con `origen_resultado = 'fnb'` o `'manual'`). Si la última jornada disputada fue marcada como acta en `papel` (`spec-03 RF-11`) o sigue pendiente de cálculo, entonces el sistema deberá mantener los Top 3 de la jornada `calculada` inmediatamente anterior (indicando su etiqueta `(Jx)`). Si no existe ninguna jornada `calculada` en la temporada, ambos bloques deberán mostrar `Sin datos`.

- **RF-09 — Top 3 Managers (con envío válido, olímpico, máx. 3 filas):**
  Cuando exista última jornada `calculada`, el sistema deberá mostrar hasta 3 filas con los managers que enviaron alineación válida en esa jornada, ordenados de mayor a menor puntuación de esa jornada (derivada del motor §0) con el formato `puesto. username — N pts (Jx)`. El Admin semilla y los managers que no enviaron alineación esa jornada (aunque computen `−10` en la clasificación general) nunca deberán aparecer en este Top 3. Si hay empate a puntos, compartirán número de puesto con numeración olímpica (`1, 1, 3`), ordenados entre sí alfabéticamente por `username` (case-insensitive), y la lista se cortará siempre en un máximo de 3 filas. Si menos de 3 managers enviaron quinteto, mostrará solo los que haya (o `Sin datos` si nadie envió). Las filas de managers no tendrán navegación al tap.

- **RF-10 — Top 3 Jugadores (por BASE, olímpico, desempate invariante a Pete):**
  Cuando exista última jornada `calculada`, el sistema deberá mostrar hasta 3 filas con los jugadores reales de plantilla presentes en esa jornada, ordenados de mayor a menor `BASE` (valoración FNB entera tal cual; `0` para `lesionado / no_convocado / dnp`, incluyendo negativos) con el formato `puesto. Nombre — N (Jx)`. Los entrenadores (`Maider` y `Páter`) nunca deberán aparecer. Si hay empate en `BASE`, compartirán puesto con numeración olímpica (`1, 1, 3`), desempatando alfabéticamente siempre por el `nombre` real del jugador (nunca por `nombrePete`, para que el Modo Pete no altere quién entra en el corte), cortando en un máximo de 3 filas.

- **RF-11 — Navegación desde Top 3 Jugadores y acceso a `/jugadores`:**
  Cuando el usuario toque cualquier fila del `Top 3 Jugadores`, el sistema deberá abrir la Ficha individual de ese jugador. Bajo el `Top 3 Jugadores`, el Home deberá mostrar siempre un enlace táctil `Ver toda la plantilla` que navegue a `/jugadores`.

### Listado de plantilla (`/jugadores`) y Ficha Jugador (§4)

- **RF-12 — Listado de plantilla activa (`/jugadores`):**
  Cuando el usuario abra `/jugadores`, el sistema deberá listar todos los jugadores reales con estado `activo` en plantilla (excluyendo siempre a `Maider` y `Páter` y a las bajas inactivas), ordenados por dorsal ascendente (los sin dorsal al final) y desempate alfabético por `nombre` real. Cada fila deberá mostrar foto (`img`/`imgPete`), nombre (`nombre`/`nombrePete`), dorsal (o `Sin dorsal`), posiciones `[x,y]` (o `Posición pendiente`) e icono de estado actual (`✅ / 🚑 / ❌`), y al tocarla deberá abrir su Ficha individual.

- **RF-13 — Ruta de Ficha y jugador inexistente o entrenador:**
  Cuando el usuario acceda a la ruta de Ficha de un jugador existente (activo o dado de baja), el sistema deberá mostrar su ficha en modo solo lectura (sin botón/CTA de alinear). Si el jugador está dado de baja (`inactivo`), deberá mostrar además una etiqueta visible de `Baja`. Si el identificador no existe o corresponde a un entrenador (`Maider`/`Páter`), entonces deberá mostrar estado `Jugador no encontrado` con enlace para volver a `/jugadores` o al Home.

- **RF-14 — Cabecera de identidad con placeholders explícitos:**
  Cuando se renderice la Ficha, el sistema deberá mostrar foto (`img` o `imgPete`), nombre (`nombre` o `nombrePete`), dorsal, posiciones válidas `[x,y]` y descripción faltosa. Si falta la imagen correspondiente al modo activo, el dorsal, las 2 posiciones (caso refuerzo pendiente de completar en Admin, `spec-03 RF-21`) o la descripción, entonces el sistema deberá mostrar su placeholder explícito (avatar genérico en `public/`, `Sin dorsal`, `Posición pendiente`, `Sin descripción`), nunca dejando el campo en blanco ni ocultándolo en silencio.

- **RF-15 — Media temporada y Última valoración:**
  Cuando se renderice la Ficha, el sistema deberá mostrar:
  1. `Media temporada`: media aritmética de `BASE` calculada exclusivamente sobre las jornadas `calculadas` en las que el jugador tuvo `estado = 'jugo'` (excluyendo `lesionado`, `no_convocado`, `dnp` y jornadas en `papel`), redondeada a **1 decimal con `round_half_up`** (formato español, ej. `7,3`). Si el jugador tiene `0` partidos jugados en jornadas `calculadas`, mostrará `Sin datos`.
  2. `Última valoración`: `BASE` del jugador en la última jornada `calculada` en la que formaba parte de la plantilla, acompañada de su icono de estado (`✅` si `jugo` —incluso si hizo `0`—, `🚑` si `lesionado`, `❌` si `no_convocado` o `dnp`). Si no existe ninguna jornada `calculada` desde su alta, mostrará `Sin datos`.

- **RF-16 — Evolución por jornada (tabla + mini-gráfica lineal):**
  Cuando existan jornadas `calculadas` desde el alta del jugador, el sistema deberá mostrar:
  1. **Tabla de evolución:** una fila por cada jornada `calculada` desde su alta (`Jx`), con su `BASE` e icono de estado (`✅ / 🚑 / ❌`), ajustada al ancho móvil sin scroll horizontal.
  2. **Mini-gráfica lineal:** evolución de `BASE` por jornada `calculada` (`J1: 12, J2: 7...`) con la línea base `0` marcada visualmente para distinguir valores positivos, cero y negativos. Si solo hay 1 jornada `calculada`, dibujará el punto único sobre el eje. Si hay muchas jornadas, el scroll horizontal estará confinado exclusivamente al contenedor de la gráfica, sin provocar scroll horizontal en la página ni secuestrar el gesto de retroceso. Las jornadas sin calcular, las jornadas en `papel` y las jornadas previas al alta mid-season del jugador no aparecerán. Si no hay jornadas `calculadas`, mostrará `Sin datos`.

- **RF-17 — Estado actual en dos líneas y racha por manager:**
  Cuando se renderice la Ficha, el sistema deberá mostrar el bloque de estado actual en dos líneas independientes:
  1. **Estado sanitario / convocatoria:** según la última acta `calculada` (o marca vigente de lesión del Admin, `spec-03 RF-08`), mostrando `✅ Disponible` (`jugo`), `🚑 Lesionado` (`lesionado`) o `❌ No convocado / DNP` (`no_convocado` o `dnp`). La expulsión no se muestra en este bloque.
  2. **Racha para la próxima jornada:** obtenida de `src/lib/dominio/` para el **manager en sesión**, indicando la penalización `⚠️ −N` que aplicaría si lo alinea en la próxima jornada (o `✅ Sin penalización (0)` si está en 1.ª aparición). Si quien consulta la ficha es el **Admin semilla**, esta segunda línea deberá ocultarse o mostrar `No aplica`.

- **RF-18 — Tooltips de ayuda hacia `/normas` en Ficha:**
  Cuando el usuario toque en la Ficha los iconos de estado (`✅ / 🚑 / ❌`) o de racha (`⚠️`), el sistema deberá abrir por tap un tooltip i18n con enlace a `/normas#base` y `/normas#racha` respectivamente, consistente con `spec-05 RF-02` y `spec-06 RF-11`.

### Transversales y errores

- **RF-19 — Fallo de carga con Reintentar sin bloques parciales:**
  Si falla la lectura de base de datos al cargar el Home, `/jugadores` o una Ficha, entonces el sistema deberá mostrar una vista de error completa para esa pantalla con mensaje i18n y botón `Reintentar`, sin renderizar bloques parciales ni cifras provisionales.

- **RF-20 — Derivación pura, Modo Pete, tema, móvil e i18n:**
  Cuando se rendericen Home, `/jugadores` y Ficha, el sistema deberá:
  1. Obtener puntos de jornada, medias y rachas desde las funciones puras de `src/lib/scoring/` y `src/lib/dominio/`, sin duplicar fórmulas en componentes ni SQL.
  2. Conmutar `img ↔ imgPete` y `nombre ↔ nombrePete` en jugadores según el Modo Pete global (respetando siempre el `username` de los managers, que no tienen mote), y aplicar tema claro/oscuro.
  3. Cumplir diseño móvil 360–430px, objetivos táctiles ≥ 44×44px, cero hover y cero literales fuera de `es/strings.json` (`ui.home.*`, `ui.jugadores.*`, `ui.ficha.*`, `errors.*`).

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | Arranque de temporada (0 jornadas `calculadas`, J1 futura creada) | Cuenta atrás y próximo partido de J1 visibles; Top 3 Managers y Top 3 Jugadores muestran `Sin datos`; en Ficha, Media, Última valoración y Evolución muestran `Sin datos` | No hay actas cerradas aún, pero sí calendario |
| E-02 | Jornada con acta en papel (caso J1 `55483`, `spec-03 RF-11`) | Cuando J1 se marca `papel`, la jornada activa salta a J2; J1 queda excluida de Top 3, de `Media temporada`, de `Última valoración` y de tabla/gráfica de evolución (aunque rompió rachas en Dominio) | Coherencia estricta con `spec-03 RF-11 / E-03` |
| E-03 | Cierre de J2 pasado (`ahora >= cierre_J2`), partido en juego o pendiente de acta, con J3–J14 ya en BD | El Home sigue mostrando J2 en estado `Cerrado - vuelve tras el partido` hasta que J2 pase a `calculada` o `papel`; solo entonces salta a la cuenta atrás de J3 | Evita que las 14 jornadas precargadas de la FNB oculten el estado `Cerrado` |
| E-04 | Más de 24h para el cierre (ej. 3 días y 4h) | La cuenta atrás muestra `76:00:00` en formato `HH:MM:SS` sin texto de días | Formato único acordado para el reloj |
| E-05 | Managers sin quinteto enviado en la última jornada `calculada` | Reciben `−10` en la general (`spec-02 RF-19`), pero quedan excluidos del `Top 3 Managers` del Home; si ningún manager envió quinteto esa jornada, el bloque muestra `Sin datos` | El podio del Home premia quintetos jugados en la jornada |
| E-06 | Empate múltiple en Top 3 (ej. 4 empatados en el 1.º o en el 3.º) | Numeración olímpica (`1, 1, 1` o `1, 2, 3`) desempatando por `username` (Managers) o `nombre` real (Jugadores) y cortando siempre en máximo 3 filas visibles | Nunca desborda el layout móvil ni altera el corte al activar Modo Pete |
| E-07 | Jugador que jugó (`estado = 'jugo'`) e hizo `BASE = 0` o negativa (`-2`) vs jugador `lesionado / no_convocado / dnp` (`BASE = 0`) | El que jugó lleva icono `✅` (`0 ✅` o `-2 ✅`) y ese partido **sí entra** en el denominador de `Media temporada`; el que no jugó lleva `🚑` o `❌` (`0 🚑` / `0 ❌`) y **no entra** en el denominador de la media | Distingue rendimiento en pista de ausencia y respeta la regla de media solo jugados |
| E-08 | Jugador con 0 partidos jugados pero con jornadas `calculadas` en las que estuvo `🚑/❌` | `Media temporada` muestra `Sin datos`; `Última valoración` muestra `0 🚑` o `0 ❌`; tabla y gráfica muestran sus filas/puntos en `0` con icono `🚑/❌` | Evita división por cero en la media sin ocultar que estuvo en acta con BASE 0 |
| E-09 | Alta mid-season (refuerzo que entra en J6) | Su tabla y mini-gráfica de evolución solo muestran desde J6 en adelante; J1–J5 no aparecen | En J1–J5 no pertenecía a la plantilla (`spec-03 RF-01/E-18`) |
| E-10 | Baja mid-season (jugador pasa a `inactivo`) | Desaparece del listado `/jugadores`, pero su Ficha sigue accesible por URL directa o historial mostrando la etiqueta `Baja` y sus estadísticas hasta su baja | No rompe enlaces ni histórico |
| E-11 | Refuerzo importado por auto-sync aún sin posiciones o jugador sin fotoPete/dorsal/descripción | Muestra `Posición pendiente`, avatar placeholder de `public/`, `Sin dorsal` o `Sin descripción` según lo que falte | Nunca bloquea la vista ni deja huecos rotos (`spec-03 E-01/E-11`) |
| E-12 | Intento de abrir ficha con ID de `Maider`, `Páter` o ID inexistente | Respuesta de `Jugador no encontrado` con botón de retorno a `/jugadores` o Home | Entrenadores son entidad separada sin ficha de jugador (`spec-03 RF-02`) |
| E-13 | Admin semilla abre una Ficha de jugador | Ve toda la ficha en lectura, pero la línea de racha personal se oculta o muestra `No aplica` | El Admin no juega ni tiene quintetos (`CONSTITUTION §11`) |
| E-14 | Gráfica lineal con 1 sola jornada `calculada` o con valores negativos | Con 1 jornada dibuja un punto visible con su etiqueta; con negativos dibuja la línea cruzando bajo la referencia `0` | Una serie de 1 punto o con negativos no debe romper el SVG/canvas |
| E-15 | Caída de la API FNB durante Lazy Sync vs caída de BD | Si cae la FNB, el Home sirve los datos de BD sin mostrar error; si cae la BD, pantalla de error con botón `Reintentar` sin bloques parciales | Cumple `CONSTITUTION §11` y `spec-10 E-09` |
| E-16 | Lugar o rival ausente en el partido | Muestra `Por confirmar` en el dato faltante | Evita cadenas vacías o `undefined` |

## 4. Fuera de alcance explícito

- Bloques personales en el Home (`mi quinteto enviado`, `mis puntos`, avisos de no haber enviado alineación) — pertenecen a `Equipo` (`spec-06`) y `Mi Resultado` (`spec-08`).
- Navegación al tocar un manager del Top 3, ver quintetos de otros managers o comparador de jugadores.
- Botón/CTA `Alinear` dentro de la Ficha, buscador por texto o filtros complejos en `/jugadores`.
- Mostrar puntos fantasy con bonus (`x1.5`, suelo Páter, `+5`, `−N`, `+3` MVP, `−5` expulsión) en el Top 3 de Jugadores o en la Ficha — la Ficha y el Top Jugadores muestran únicamente `BASE` (valoración FNB).
- Edición de datos de jugador, estados médicos o partidos (responsabilidad del panel Admin, `spec-09`).
- Estado offline, pull-to-refresh, Supabase Realtime, notificaciones, versión escritorio, drag & drop.

## 5. Criterios de finalización (Definition of Done)

- [ ] Existe `specs/07-home-y-ficha-jugador/spec.md` congelada con RF-01–RF-20 y E-01–E-16, y `specs/06-alineacion-equipo/spec.md` tiene corregida la errata `0 pts → −10 pts` por no enviar quinteto.
- [ ] Guardia activa: sin sesión redirige a login; con clave temporal u onboarding incompleto redirige a su flujo correspondiente antes de mostrar Home, `/jugadores` o Ficha.
- [ ] En Home, la jornada activa muestra `HH:MM:SS` en vivo antes del cierre (`hora_partido − 3h Europe/Madrid`), pasa a `Cerrado - vuelve tras el partido` al cumplirse el cierre, y salta a la siguiente jornada solo cuando la actual queda `calculada` o `papel`; sin jornada futura muestra el último partido + `Sin próxima jornada`. `?` enlaza a `/normas#cierre`.
- [ ] El bloque de partido muestra fecha/hora (`Europe/Madrid`), local/visitante, lugar y rival, o `Por confirmar` si falta lugar/rival.
- [ ] `Top 3 Managers` y `Top 3 Jugadores` usan la última jornada `calculada` (ignorando `papel`), cortan en máximo 3 filas con numeración olímpica (`1, 1, 3`), excluyen en Managers al Admin y a los no-enviados (`−10`), excluyen en Jugadores a `Maider`/`Páter`, y desempatan en Jugadores por `nombre` real (invariante a Modo Pete).
- [ ] Tap en jugador del Top 3 abre su Ficha; enlace `Ver toda la plantilla` abre `/jugadores` con los ~20 jugadores activos ordenados por dorsal y `nombre` real.
- [ ] Ficha en solo lectura muestra cabecera completa según Modo Pete o placeholders explícitos (`Sin dorsal`, `Posición pendiente`, `Sin descripción`, avatar por defecto); etiqueta `Baja` si el jugador está inactivo; `Jugador no encontrado` para IDs inválidos o entrenadores.
- [ ] Tests Vitest en verde verifican: cálculo de `Media temporada` a 1 decimal `round_half_up` excluyendo `lesionado / no_convocado / dnp` y jornadas `papel` (pero incluyendo `BASE = 0` si `estado = 'jugo'`); `Última valoración` con su icono `✅ / 🚑 / ❌`; orden y corte olímpico de ambos Top 3 con desempate invariante a Modo Pete; resolución de jornada activa (`abierta → cerrada → salto al calcular`).
- [ ] Evolución muestra tabla + mini-gráfica lineal con línea base `0` (soportando 1 punto y negativos) solo con jornadas `calculadas` desde el alta del jugador, con scroll horizontal confinado exclusivamente a la caja de la gráfica (0 scroll horizontal en página/tabla).
- [ ] Estado actual en Ficha muestra en 2 líneas: estado última acta (`✅ / 🚑 / ❌`) y racha `−N` del manager en sesión desde `src/lib/dominio/` (oculta/`No aplica` para Admin), con tooltips por tap hacia `/normas#base` y `/normas#racha`.
- [ ] Si cae la FNB durante el Lazy Sync, el Home renderiza desde BD sin error; si falla la BD, muestra error completo con botón `Reintentar` sin bloques parciales.
- [ ] Cero strings fuera de `es/strings.json`, usable a una mano en 360–430px (objetivos ≥ 44×44px), y puerta de calidad en verde (`npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`).
