# 08 — Resultados, Historial y Clasificación (§5 y §6)

## 1. Objetivo y contexto

**Objetivo:** fijar el QUÉ de las páginas `Mi Resultado + Historial` (§5 del `README.md`) y `Clasificación General` (§6 del `README.md`) para que cada manager vea su rendimiento por jornada con el desglose del motor §0 y su posición acumulada, y vea la general acumulada sin piques ni filtraciones de quintetos ajenos, desde el móvil con una mano.

**Contexto:**

- `README.md §5` pide página nueva con `Mi Resultado` por jornada (`Arnau 12 +5 −1 = 16 ... TOTAL: 67`) e `Historial` (`J1: 52pts (12º)... Tap expande desglose`) con enlace a `/normas#orden`. `README.md §6` pide puntos acumulados, ranking por `username`, Top 3 oro/plata/bronce y últimos 3 en rojo.
- `CONSTITUTION.md §5/§8/§9/§11` y `AGENTS.md` exigen: cálculo aislado en funciones puras sin duplicar lógica, solo móvil 360–430px con tap, cero hardcode i18n, Admin semilla excluido del ranking y totales nunca materializados.
- `spec-02` gobierna cálculo §0, orden fijo, rachas, MVP, expulsión, dato ausente y cierre. `spec-03` gobierna entidades, `−10` sin quinteto, excepción papel, altas tardías sin retroactivo y totales derivados al leer. `spec-04` gobierna guardias de sesión, clave temporal y onboarding. `spec-05` gobierna `/normas` y sus anclas. `spec-06` gobierna alineación y preview sin base. `spec-07` gobierna jornada activa, Top 3 con olímpica y `Sin datos`. `spec-10` gobierna origen FNB/manual. Esta spec solo consume esas reglas, sin redefinirlas.
- **Por qué solo veo mi desglose:** evita copias y piques; de otros managers solo se muestran totales y puesto en la General.
- **Por qué puesto acumulado en Historial:** la fila `Jx: N pts (Pº)` responde a "cómo iba en la general tras esa jornada", no al puesto de la jornada aislada.
- **Por qué destacado + lista:** la última jornada calculada es lo que más se consulta tras el partido; el resto queda en historial descendente expandible.
- **Por qué ocultar papel y pendientes:** el papel vale `0` excluido de todo y rompería medias y acumulados si se mostrara; la pendiente con dato ausente es error bloqueante (`spec-02 RF-17`), nunca `0` provisional.

**Decisiones cerradas con el usuario que esta spec congela:** dos páginas separadas (`/mi-resultado` y `/clasificacion`); última calculada en bloque destacado + historial descendente; fila simple `Jx: N pts (Pº acumulado)` con acordeón exclusivo; desglose completo derivado del motor con cifra de entrenador solo en la línea del jugador; conceptos a cero explícitos; expulsados señalados por jugador; fila `−10 Sin envío` sin desglose pero con nota expandible; papel oculta; pendiente oculta; dato ausente que invalida una calculada se oculta con aviso sin bloquear el resto; acumulado solo calculadas + `−10`; puesto histórico y general con olímpica; colores por nº de puesto, sin rojo con ≤6, sin colores si todo a cero o sin calculadas; nuevo entra ya con `0`; sin retroactivo en filas propias; baja histórica sin etiqueta; Maider/Páter invariantes a Pete; General no tocable con mi fila resaltada; Admin fuera de ranking pero con lectura de General e Historial bloqueado; recálculo silencioso que actualiza puestos viejos; fallo BD con error total y Reintentar.

**Inconsistencia explícita asumida por decisión del usuario:** el manager nuevo no tiene filas propias anteriores a su alta (sin retroactivo), pero su `0` actual sí cuenta para el puesto histórico de otros en jornadas viejas y entra ya en la General pudiendo adelantar a acumulados negativos. Se especifica tal cual.

## 2. Requisitos funcionales (EARS)

### Guardias y rutas

- **RF-01 — Dos páginas separadas:**
  Cuando el manager navegue a resultados, el sistema deberá ofrecer dos páginas distintas, `/mi-resultado` (bloque destacado + Historial propio) y `/clasificacion` (General de todos), enlazadas entre sí y desde la navegación móvil. Si solo existe una de las dos, entonces se considerará incumplimiento.

- **RF-02 — Guardias de sesión, temporal y onboarding:**
  Cuando se solicite `/mi-resultado` o `/clasificacion`, el sistema deberá verificar sesión activa en servidor. Si no hay sesión, entonces deberá redirigir a login; si hay clave temporal pendiente o el onboarding está incompleto (y no es Admin), entonces deberá redirigir al flujo obligatorio correspondiente antes de renderizar.

- **RF-03 — Admin lee General, no Historial:**
  Cuando el Admin semilla abra `/clasificacion`, el sistema deberá mostrarle la General en lectura con los mismos totales y puestos que un manager. Cuando intente abrir `/mi-resultado`, entonces el sistema deberá denegarlo con error de no juega, sin mostrar desglose alguno.

### Mi Resultado + Historial (`/mi-resultado`)

- **RF-04 — Bloque destacado de última calculada:**
  Cuando exista al menos una jornada calculada elegible para el manager, el sistema deberá mostrar arriba un bloque destacado con el desglose completo de su última jornada calculada. Si no existe ninguna, entonces deberá mostrar estado `Sin datos` en lugar del bloque.

- **RF-05 — Historial descendente solo con calculadas y −10:**
  Cuando se liste el Historial, el sistema deberá mostrar las jornadas en orden descendente (más reciente primero), incluyendo únicamente jornadas calculadas normales y jornadas normales sin envío (`−10`). Si una jornada está pendiente de cálculo, tiene dato ausente o es papel, entonces no deberá aparecer como fila.

- **RF-06 — Fila colapsada con puesto acumulado:**
  Cuando se muestre cada fila del Historial, el sistema deberá presentar `Jx: N pts (Pº)` donde `Pº` es el puesto en la general acumulada tras esa jornada, calculado entre todos los managers actuales (los dados de alta después cuentan con `0` en jornadas viejas), con numeración olímpica y desempate alfabético case-insensitive. Si hay recálculo retroactivo de una jornada vieja, entonces los puestos de esa jornada y las posteriores deberán actualizarse al leer.

- **RF-07 — Acordeón exclusivo con tap:**
  Cuando el manager toque una fila con desglose, el sistema deberá expandir su desglose completo y colapsar cualquier otra jornada abierta (una sola abierta cada vez). Si toca la fila abierta, entonces deberá colapsarla. Todo por tap, nunca hover.

- **RF-08 — Fila −10 sin desglose pero con nota:**
  Si una jornada normal quedó sin alineación válida enviada, entonces el sistema deberá mostrar fila `Jx: −10 pts (Pº)` sin líneas de jugador y, al tocarla, desplegar nota explicativa de penalización por no envío con enlace a `/normas#orden`. Esa jornada sí suma `−10` al acumulado y rompe rachas según dominio.

- **RF-09 — Desglose completo derivado del motor:**
  Cuando se expanda una jornada calculada con envío, el sistema deberá mostrar por cada uno de los 5 jugadores su secuencia en orden fijo (`BASE → efecto entrenador → +5 posición → −N racha → subtotal jugador`) y a nivel jornada `+3` MVP si aplica, `−5` por cada expulsado y `TOTAL`, todo derivado de la salida del motor puro sin recalcular a mano. Si falta algún concepto, entonces no deberá inventar cifras.

- **RF-10 — Cifra de entrenador solo en el jugador:**
  Cuando el entrenador sea Maider, el sistema deberá reflejar su `x1.5` con redondeo solo en la línea del capitán; cuando sea Páter, su suelo `+1` en la línea de cada uno de los 5. La cabecera del desglose deberá mostrar solo etiqueta informativa del entrenador elegido (Maider o Páter) sin cifra agregada separada. Si aparece una cifra de entrenador fuera de las líneas de jugador, entonces se considerará incumplimiento por apariencia de doble suma.

- **RF-11 — Detalle por jugador completo y ceros explícitos:**
  Cuando se muestre cada línea de jugador, el sistema deberá incluir posición de slot alineada, marca de capitán cuando aplique e icono de estado (`✅` jugó aunque `BASE` sea `0`, `🚑` lesionado, `❌` no convocado/DNP). Los conceptos con valor `0` deberán mostrarse con `0` explícito, no omitirse. Si hay expulsados, entonces cada jugador expulsado deberá quedar señalado en su línea además del `−5` a nivel jornada.

- **RF-12 — Papel oculta, pendiente oculta, dato ausente con aviso:**
  Si una jornada es papel, entonces el sistema deberá ocultarla del Historial y excluirla del acumulado, aunque rompa rachas por dentro. Si una jornada está pendiente o tiene dato ausente que impide el cálculo, entonces deberá ocultarla como fila sin usar `0` provisional. Si una jornada que ya era calculada queda invalidada por dato ausente tras una corrección, entonces el sistema deberá ocultarla como fila y mostrar aviso visible de jornada excluida por dato incompleto, sin bloquear el resto del Historial ni inventar su total.

- **RF-13 — Sin retroactivo en filas propias:**
  Cuando un manager se dé de alta a mitad de temporada o complete su onboarding tarde, el sistema deberá mostrar en su Historial solo jornadas desde su primera jornada elegible, sin filas de jornadas anteriores ni como `0` ni como `−10`. Si mira el puesto histórico de otros en jornadas viejas, entonces él contará con `0` en ese cálculo aunque no tenga fila propia allí.

### Clasificación General (`/clasificacion`)

- **RF-14 — Acumulado solo calculadas más −10:**
  Cuando se calcule la General, el sistema deberá sumar por manager únicamente jornadas calculadas normales, incluyendo `−10` por no envío. Las jornadas papel y las pendientes o invalidadas por dato ausente no deberán sumar nada. Si el recálculo del Admin cambia una jornada, entonces los acumulados deberán actualizarse al leer sin aviso especial.

- **RF-15 — Orden, olímpica y Admin excluido:**
  Cuando se ordene la General, el sistema deberá ordenar por acumulado descendente con numeración olímpica en empates y desempate alfabético por `username` case-insensitive. El Admin semilla nunca deberá aparecer en el ranking. Si un manager nuevo aún no tiene ninguna calculada elegible, entonces deberá aparecer ya con `0` pts pudiendo adelantar a acumulados negativos.

- **RF-16 — Lista no tocable con mi fila resaltada:**
  Cuando se muestre la General, ninguna fila deberá ser tocable ni navegar a desgloses (ni la propia ni las ajenas). La fila del manager en sesión deberá distinguirse visualmente del resto. Si alguna fila permite tap para ver quintetos ajenos, entonces se considerará incumplimiento.

- **RF-17 — Colores por puesto con umbrales:**
  Cuando haya al menos una jornada calculada y no todos los acumulados sean `0`, el sistema deberá pintar medallas por nº de puesto (oro/plata/bronce según puestos `1º/2º/3º` con olímpica) y gradiente rojo a los puestos de cola solo si hay más de 6 managers en el ranking. Si hay 6 o menos, entonces no deberá pintar rojo. Si no hay calculadas o todos van a `0`, entonces deberá mostrar la lista sin colores con estado `Sin datos` donde aplique.

### Transversales

- **RF-18 — Enlace a normas:**
  Cuando se muestre `Mi Resultado`, Historial o sus notas (`−10`, aviso por dato ausente), el sistema deberá enlazar a `/normas#orden`. Si falta ese acceso, entonces se considerará incumplimiento.

- **RF-19 — Fallo de BD con Reintentar:**
  Si falla la lectura de BD al cargar `/mi-resultado` o `/clasificacion`, entonces el sistema deberá mostrar vista de error completa con botón `Reintentar`, sin renderizar acumulados parciales ni filas provisionales.

- **RF-20 — Derivación pura, Pete, tema, móvil e i18n:**
  Cuando se rendericen `/mi-resultado` y `/clasificacion`, el sistema deberá obtener puntos, puestos y rachas desde motor puro y dominio sin duplicar fórmulas; conmutar `img↔imgPete` y `nombre↔nombrePete` en jugadores manteniendo `username` de managers y `Maider`/`Páter` invariantes; aplicar tema claro/oscuro; cumplir móvil 360–430px sin scroll horizontal con táctiles ≥44×44px y cero hover; y resolver todo texto desde `es/strings.json` sin literales ni fórmulas concatenadas a mano.

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | Arranque sin calculadas, o solo papel | Ambas páginas muestran `Sin datos`, General sin colores | Sin actas no hay puntos ni puestos |
| E-02 | Todos los acumulados a `0` | Lista visible sin oro/plata/bronce ni rojo | Sin diferencias no hay podio ni cola |
| E-03 | 6 o menos managers | Medallas por puesto sí, rojo nunca | Sin solape visual con pocos |
| E-04 | Empate en corte de medallas o cola (ej. tres `3º`) | Color por nº de puesto olímpico, no por fila; puede haber más o menos de 3 filas coloreadas | Coherencia con numeración olímpica |
| E-05 | Fila `−10 Sin envío` | Fila con `−10` y puesto, sin líneas de jugador, expande nota con enlace a normas, suma al acumulado y rompe rachas | Penaliza el olvido sin inventar quinteto |
| E-06 | Jornada papel | Oculta de Historial y General, `0` excluido, rompe rachas por dentro | Excepción causa externa, no castigo |
| E-07 | Jornada pendiente o con hueco (sin acta o dato ausente) | Oculta como fila, nunca `0` provisional, no suma | Prohibido inventar puntos |
| E-08 | Calculada invalidada después por dato ausente | Oculta como fila + aviso de jornada excluida, resto visible, acumulado sin ella | No perpetual bloqueante ni parcial silencioso |
| E-09 | Corrección Admin de J2 vista en J6 | Recalcula totales y puestos de J2..J6 al leer, sin aviso especial | Lo corregido no deja saldos viejos |
| E-10 | Alta mid-season / onboarding tardío | Sin filas propias pasadas; entra ya en General con `0`; cuenta con `0` en puestos históricos de otros | Sin retroactivo pero ranking vivo |
| E-11 | Veterano en negativo vs nuevo a `0` | El nuevo a `0` ordena por delante del negativo aunque no haya jugado | El acumulado manda, sin suelo a cero |
| E-12 | Jugador hoy de baja en jornada vieja | Su línea histórica se muestra normal, sin etiqueta de baja | La baja no reescribe el acta pasada |
| E-13 | 2 expulsados en el quinteto | Cada expulsado señalado en su línea y `−10` a nivel jornada con BASE intacta | Castigo por expulsado acumulable |
| E-14 | Capitán MVP con Maider o Páter | Línea del capitán con su efecto + `+3` a nivel jornada nunca multiplicado | El extra se suma después |
| E-15 | Conceptos a cero | Se muestran con `0` (`+0 pos`, `−0 racha`, `+0 MVP`) | Trazabilidad del orden fijo |
| E-16 | Acordeón con varias filas | Solo una expandida cada vez; tocar otra colapsa la anterior | Evita listas eternas en móvil |
| E-17 | Maider/Páter con Pete ON | Mismo nombre siempre, sin mote; jugadores sí alternan, managers mantienen `username` | Pete es cosmético de jugadores |
| E-18 | Fallo de BD | Error completo + Reintentar, sin parciales | Sin lecturas a medias |
| E-19 | Admin en 08 | Ve General en lectura sin aparecer en ranking; `/mi-resultado` denegado con no juega | Admin no juega pero puede ver la liga |
| E-20 | `BASE 0` jugando vs `BASE 0` por lesión/DNP | `0 ✅` cuenta para media futura y permite MVP por jugar; `0 🚑/❌` bloquea `+5/−N` y MVP | Distingue pista de ausencia |

## 4. Fuera de alcance explícito

- Ver desgloses, quintetos, capitán o entrenador de otros managers; comparador de managers; tocar filas de la General.
- Gráficas de evolución general, filtros por tramo, exportar o compartir resultados.
- Previsualización con base estimada o totales provisionales antes del cálculo.
- Edición de actas, partidos, jugadores o recálculo como botón (dueños spec-09 y spec-10; aquí solo se exige qué se recalcula al leer).
- Lógica del motor §0, rachas como cálculo y cierre como validación (spec-02); esquema SQL, RLS y semilla (spec-03); Auth y onboarding como flujo (spec-04); `/normas` como contenido (spec-05); alineación Equipo (spec-06); Home y Ficha (spec-07); sync FNB como comportamiento (spec-10).
- Notificaciones, email, auto-reset, multi-liga, chat, escritorio, app nativa, Realtime, cron, polling agresivo.
- Decisiones de implementación (componentes, librerías, firmas, SQL, caché).

## 5. Criterios de finalización (Definition of Done)

- [ ] Existen rutas `/mi-resultado` (destacado + Historial descendente) y `/clasificacion` (General) enlazadas, con RF-01–RF-20 y E-01–E-20 congelados.
- [ ] Sin sesión redirige a login; con temporal u onboarding incompleto redirige a su flujo; Admin ve General sin rankear e Historial denegado.
- [ ] Historial muestra solo calculadas + `−10`, más reciente primero, fila `Jx: N pts (Pº acumulado olímpico)` con acordeón exclusivo; `−10` expande nota; papel y pendientes ocultas; dato ausente invalidado oculta con aviso; sin retroactivo en filas propias.
- [ ] Desglose deriva del motor en orden fijo con cifra de entrenador solo en líneas de jugador, slot + capitán + iconos, ceros explícitos, expulsados señalados, `+3`/`−5`/TOTAL a nivel jornada; nada recalculado a mano.
- [ ] General suma solo calculadas + `−10`, ordena por acumulado con olímpica y alfabético, excluye Admin, resalta mi fila, no es tocable, colores por puesto con umbrales (sin rojo con ≤6, sin colores con todo a cero o sin calculadas), recálculo silencioso que actualiza puestos viejos.
- [ ] Tests Vitest en verde: acumulado con `−10`/papel/pendiente, olímpica en General e Histórico, colores y umbrales, acordeón y filas especiales, dato ausente con aviso, alta tardía sin retroactivo con entrada ya a `0`, recálculo retroactivo, guardias y denegación Admin en Historial.
- [ ] `Sin datos` en vacío inicial; fallo BD con error total y Reintentar sin parciales; enlace a `/normas#orden` presente.
- [ ] Cero literales fuera de `es/strings.json`, 360–430px sin scroll horizontal, táctiles ≥44×44px, Pete y tema respetados con Maider/Páter invariantes.
- [ ] `npx tsc --noEmit` 0 errores y cero `any`; `npm run lint` 0 warnings; `npm test` verde; `npm run build` verde.
