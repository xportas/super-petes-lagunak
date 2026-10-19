# spec-06 — Alineación Equipo (§3 README)

## 1. Objetivo y contexto

Permitir a cada manager confeccionar su quinteto para la próxima jornada desde el móvil, con una mano. Es la acción core del juego: de aquí salen los puntos de §0.

Contexto:
- Liga cerrada, ~20 jugadores reales, 1 Admin semilla que no juega.
- Fuente reglas: `README §0` + `CONSTITUTION 5,7,8,9`. Esta spec no redefine puntuación, solo alineación.
- Desviación consciente de README §3: el ejemplo `12 (base est.) +5 −1 = 16` se sustituye por preview sin base ni total (ver RF-04).
- Depende de: Jornadas con `hora_partido`, `estado` (`pendiente | calculada | papel | invalidada`) y `cierre` (ordenadas por `hora_partido ASC, numero_jornada ASC`), plantilla con `posicionesValidas[2]` y `estado` sanitario pre-partido marcado por el Admin (`disponible | lesionado`), rachas previas en Dominio (`src/lib/dominio/`), motor puro (`src/lib/scoring/`), `es/strings.json`.

Por qué: sin alineación válida antes del cierre no hay juego; debe ser táctil, a prueba de errores y sin ambigüedad de cierre ni recálculo manual.

## 2. Requisitos Funcionales (EARS)

**RF-01 — 5 slots fijos con E==A**
Cuando el manager abre Equipo, el sistema deberá mostrar 5 slots visuales con posición fija `B, E, A, AP, P` + 1 slot entrenador + marca capitán sobre uno de los 5. A efectos de bonus `+5`, `slot E` acepta `E` ó `A` y `slot A` acepta `A` ó `E`.

**RF-02 — Tap-to-select sin duplicados (solo activos con 2 posiciones)**
Cuando el manager toca un slot vacío en `/equipo`, el sistema deberá abrir lista de jugadores elegibles (`activo = true` y con sus 2 `posicionesValidas` asignadas; los jugadores dados de baja `inactivo` y los de la bandeja `Pendientes` con posiciones nulas no aparecen en el selector), filtrable por posición válida y por estado sanitario pre-partido del jugador (`disponible | lesionado`, marcado por el Admin en `spec-09 RF-05`; haber sido `dnp` o `no_convocado` en un acta anterior no altera su disponibilidad para la próxima jornada) para elegir por tap. Si un jugador ya ocupa otro slot, entonces deberá aparecer marcado como ocupado y no elegible. Si toca un slot ocupado, entonces deberá permitir cambiar o vaciar. Prohibido drag&drop.

**RF-03 — Bonus posición vía motor**
Cuando un jugador ocupa un slot y su estado actual es `activo` y `disponible`, el sistema deberá previsualizar `📍 +5` llamando a `src/lib/scoring/` si alguna de sus 2 `posicionesValidas` coincide con el slot (`E==A`). Si su estado pre-partido actual es `lesionado` (o si quedó dado de baja `inactivo` tras haber sido guardado en la alineación), entonces el sistema deberá ocultar el `+5`.

**RF-04 — Preview sin base ni total**
Cuando el manager selecciona jugadores y entrenador, el sistema deberá mostrar solo modificadores derivados de `src/lib/scoring/`: `+5 pos` (si aplica), `−N racha` (si aplica) y etiqueta informativa del entrenador (`Maider: x1.5 solo BASE del capitán` ó `Páter: suelo 1 +1 a los 5`, sin números calculados). El sistema nunca mostrará `base est.` ni total estimado.

**RF-05 — Racha desde Dominio**
Cuando el manager selecciona un jugador con estado pre-partido `disponible`, el sistema deberá mostrar `⚠️ −N` obtenido de Dominio según sus alineaciones válidas guardadas consecutivas en jornadas anteriores cerradas (`1ª=0, 2ª=−1, 3ª=−2…`); si es estreno (`0`), mostrará `✅`. Prohibido calcular la racha en UI.

**RF-06 — Lesionado alineable con aviso y baja sobrevenida (`❌`)**
Si el jugador activo tiene estado pre-partido `lesionado` (marcado por el Admin), entonces el sistema deberá permitir alinearlo igual, ocultando `+5` y `−N`, mostrando `🚑 BASE 0` y aviso explícito de que ocupará slot y contará para racha futura. Si un jugador que ya estaba guardado en la alineación de esa jornada pasa después a `inactivo` (baja por el Admin, `spec-09 RF-04`), su slot mostrará `❌ BASE 0` (ocultando `+5` y `−N`); si el manager no vuelve a guardar, esa alineación guardada se conserva válida (puntuando `BASE 0` como `no_convocado`), pero si quiere guardar cambios antes del cierre deberá sustituirlo por un jugador `activo`.

**RF-07 — Entrenador excluyente**
Cuando el manager elige entrenador, el sistema deberá exigir exactamente uno (`Maider` ó `Páter`) en el slot de entrenador. Con `Páter`, la etiqueta informativa aplica a los 5 incluido el capitán; con `Maider`, solo al capitán.

**RF-08 — Capitán entre los 5**
Cuando el manager marca capitán, el sistema deberá exigir que sea uno de los 5 slots de jugador ocupados. Si ese slot se vacía o cambia de jugador, entonces el sistema deberá limpiar la marca de capitán y desactivar Guardar hasta elegir otro.

**RF-09 — Bloqueo preventivo sin borrador (exige 5 activos al guardar)**
Mientras falte algún slot, alguno de los 5 slots contenga un jugador dado de baja (`inactivo`), falte entrenador o falte capitán, el sistema deberá mantener Guardar desactivado mostrando motivo i18n. Si el manager sale sin guardar una alineación válida, entonces los cambios no guardados se perderán (no existe borrador parcial). Al enviar, el servidor deberá re-validar esquema completo (5 IDs distintos con `activo = true` y 2 `posicionesValidas`, 1 entrenador válido, capitán dentro de los 5).

**RF-10 — Jornada activa y cierre en servidor**
Cuando el manager abre `/equipo`, el sistema deberá resolver como **jornada activa** la primera jornada por orden cronológico (`hora_partido ASC, numero_jornada ASC`) cuyo estado sea **`pendiente`** (ignorando `calculada`, `papel` e `invalidada`, mismo criterio que el Home en `spec-07 RF-03`), con `cierre = hora_partido − 3h` en `Europe/Madrid` (mostrado siempre en `Europe/Madrid`). Mientras `ahora_servidor < cierre`, deberá permitir guardar y re-guardar ilimitadamente, siendo válido el último recibido. Si `ahora_servidor >= cierre` (segundo exacto incluido), entonces el servidor deberá rechazar cualquier intento de guardado con `errors.close.passed`.

**RF-10b — Lectura bloqueada tras cierre hasta cálculo de la jornada activa**
Mientras en la jornada activa se cumpla `ahora_servidor >= cierre` y dicha jornada siga `pendiente` (aún no haya pasado a `calculada` ni `papel`), cuando el manager abra `/equipo` el sistema deberá mostrar su última alineación válida guardada para esa jornada en modo solo lectura junto al aviso `Cerrado - vuelve tras el partido` y enlace a `/normas#cierre`, sin permitir edición. En cuanto esa jornada pase a `calculada` o `papel`, `/equipo` promoverá automáticamente la siguiente jornada cronológica (`hora_partido ASC, numero_jornada ASC`) en estado `pendiente` como activa.

**RF-11 — Iconos con ayuda tap-to-expand**
Cuando se muestran iconos de estado, el sistema deberá abrir por tap (nunca hover) un tooltip i18n con enlace al bloque de `/normas`: `✅ → #base`, `📍 → #posicion`, `⚠️ → #racha`, `🚑/❌ → #base`, `⏱/cierre → #cierre`, `Maider/Páter → #entrenadores`.

**RF-12a — Modo Pete**
Cuando Modo Pete está ON, el sistema deberá mostrar `imgPete` y `nombrePete` de los jugadores en slots y lista; cuando está OFF, `img` y `nombre`, sin alterar posiciones, rachas ni validaciones. Los entrenadores (`Maider` y `Páter`) son invariantes a Modo Pete y mantienen siempre su nombre e imagen fija.

**RF-12b — i18n cero hardcode**
Cuando se renderiza cualquier texto, etiqueta, motivo de bloqueo o error, el sistema deberá resolverlo desde `es/strings.json` (`ui.equipo.*`, `errors.close.*`, `errors.admin.*`), sin literales en JSX ni concatenaciones manuales.

**RF-12c — Móvil y accesibilidad táctil**
Cuando se muestra Equipo, el sistema deberá ajustarse a 360–430px sin scroll horizontal, con objetivos táctiles ≥44×44px y fondo de pista que mantenga contraste legible AA sobre nombres e iconos.

## 3. Casos límite y manejo de errores

- **Cierre exacto:** petición llega en el segundo exacto `ahora_servidor == cierre` → rechazada con `errors.close.passed`, no guarda. Contador Home es solo UX.
- **Bypass de UI (duplicado/incompleto):** petición directa a Server Action con <5, IDs repetidos, sin entrenador o capitán fuera de los 5 → rechazada en servidor con error i18n, sin escribir.
- **Salir a medias:** manager rellena 3 slots y cierra o navega fuera → se descarta; al volver ve su última válida guardada (o vacío si nunca guardó).
- **Sin envío antes del cierre:** si llega el cierre sin ninguna alineación válida guardada → queda sin quinteto esa jornada (`−10 pts` según `spec-02 RF-19` y `spec-03 RF-13`), Dominio rompe la racha de todos sus jugadores según §0 y en lectura bloqueada se muestra estado vacío cerrado. No se auto-repite la jornada anterior.
- **Cambio de hora por Admin:** si Admin cambia `hora_partido`, `cierre` se recalcula (`−3h`). Si el nuevo cierre vuelve a estar en el futuro, la ventana se reabre conservando las alineaciones ya guardadas; si el nuevo cierre ya pasó, se cierra conservando lo ya guardado.
- **Jugador pasa a lesionado o baja (`inactivo`) tras guardar:** la alineación guardada sigue siendo válida si el manager no vuelve a guardar; al abrir Equipo se muestra `🚑 BASE 0` (si pasó a `lesionado`) o `❌ BASE 0` (si pasó a `inactivo`). Si aún no cerró, para volver a pulsar Guardar con un jugador `inactivo` en pista el manager deberá sustituirlo por uno `activo`; si ya cerró, queda así y puntuará `BASE 0` contando racha.
- **Menos de 5 sanos en plantilla:** nunca bloquea el juego; se puede completar el quinteto con `🚑`.
- **Doble tap / corte de red al guardar:** guardado idempotente por `(usuario, jornada)`; doble tap produce una sola escritura con el último estado y ante fallo de red muestra error i18n de reintento sin perder la selección en pantalla.
- **Múltiples jornadas futuras precargadas (J1..J14) o jornada pasada `invalidada`:** la jornada activa en `/equipo` es siempre la primera por `hora_partido ASC, numero_jornada ASC` en estado `pendiente` (una jornada pasada que pase a `invalidada` tras edición no vuelve a ser jornada activa); tras pasar su cierre (`ahora_servidor >= cierre`), `/equipo` permanece mostrando esa jornada en modo solo lectura (`Cerrado - vuelve tras el partido`) hasta que pasa a `calculada` o `papel`, momento en que salta a la siguiente jornada `pendiente`.
- **Roles y sesión:** no autenticado → redirige a `/login`; clave temporal u onboarding pendiente → redirige a `/cambiar-password` o `/onboarding`; Admin semilla abre `/equipo` → bloqueado con `errors.admin.no_juega` (Admin no juega).

## 4. Fuera de alcance explícito

- Historial de jornadas pasadas y desglose post-partido con puntos reales (`spec-08` Mi Resultado).
- Ver quintetos de otros managers, Top 3 y clasificación general.
- Paso 1 del Onboarding (reutilizará el componente selector de quinteto de esta spec; su flujo de onboarding se especifica en `spec-04`).
- Cálculo final con valoración FNB real, suelo Páter aplicado a BASE real, MVP `+3` y expulsión `−5` (spec-02).
- Conmutador de tema claro/oscuro y barra de navegación (spec-05).
- CRUD de partidos/jugadores, sincronización FNB y recálculo (Admin + spec-10).
- Notificaciones, email, auto-reset, multi-liga, chat, versión escritorio y drag&drop.

## 5. Definition of Done verificable

1. En 360–430px, solo con taps (≥44×44px, 0 drag&drop, 0 scroll horizontal), se completa `5 slots (B,E,A,AP,P) + entrenador + capitán`.
2. Test unitario verifica matriz `slot vs posicionesValidas` con `E==A` usando `src/lib/scoring/`.
3. Preview no muestra número base ni total en ningún estado; muestra `+5`/`−N` desde motor/Dominio y etiqueta fija de entrenador.
4. Con jugador en racha 1ª/2ª/3ª/4ª en Dominio, se muestra `✅ / −1 / −2 / −3`; si pasa a `🚑/❌`, se ocultan `+5` y `−N` y se muestra `BASE 0` + aviso de racha futura.
5. Jugador ya elegido en un slot no se puede elegir en otro; vaciar/cambiar el slot del capitán limpia capitán y desactiva Guardar; salir sin guardar descarta cambios parciales.
6. Guardar está desactivado con motivo i18n si falta algún elemento; enviar payload inválido o duplicado directo al servidor devuelve error y no persiste.
7. Test de cierre verifica en `Europe/Madrid`: `ahora_servidor < cierre` guarda y sustituye; `ahora_servidor == cierre` y `> cierre` rechazan con `errors.close.passed`; cambio de `hora_partido` recalcula cierre y reabre/cierra ventana sin borrar guardados.
8. Sin envío antes del cierre → lectura bloqueada vacía, `−10 pts` y test de Dominio confirma ruptura de rachas.
9. Tras el cierre, Equipo muestra la última alineación válida en solo lectura con aviso y link a `/normas#cierre`.
10. Cada icono (`✅, 📍, ⚠️, 🚑/❌, ⏱, entrenador`) abre por tap su tooltip i18n y enlaza a su ancla exacta de `/normas`; Modo Pete conmuta `img↔imgPete` y `nombre↔nombrePete` sin alterar cálculo ni validación; 0 literales fuera de `es/strings.json`; Admin recibe `errors.admin.no_juega`.

> Puerta de calidad general del repo aplicable al entregar código: `tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` en verde (AGENTS.md).
