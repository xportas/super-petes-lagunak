# 02 — Motor de puntuación y dominio (§0)

## 1. Objetivo y contexto

**Objetivo:** fijar el QUÉ del cálculo de puntos §0 y de las reglas de dominio asociadas (elegibilidad, validación de alineación, rachas, cierre) para que cualquier implementación futura produzca el mismo resultado ante las mismas entradas y no haya discusiones de jornada.

**Contexto:**

- `README.md §0` es la fuente única de las reglas, pero es ambiguo en redondeo, interacción Maider/Páter, alcance de bonus con `BASE 0`, empates de MVP, expulsiones múltiples, conjunto del MVP y cierre exacto. Esta spec cierra esas ambigüedades con decisiones del usuario.
- `CONSTITUTION.md §5/§6/§7` y `AGENTS.md` exigen cálculo aislado en funciones puras, orden fijo, tests Vitest del motor, validación de posiciones `B|E/A|AP|P`, cálculo de rachas y cierre en servidor a `hora_partido − 3h`.
- **Corrección que prevalece sobre README:** Maider y Páter no son jugadores ni roles acumulables. Son los dos únicos entrenadores, excluyentes, elegibles solo en el slot de entrenador. El resto de la plantilla solo es elegible en slots de jugador. Maider nunca ocupa slot de jugador ni recibe suelo Páter, y Páter nunca multiplica. El capitán es siempre uno de los 5 jugadores. Si otro documento dice lo contrario, esta spec obliga a corregirlo en el mismo cambio.
- **Por qué redondeo fijado:** el x1.5 sobre BASE impar produce `.5` y el total dejaría de ser entero; sin regla única habría desempates y rankings distintos según quién calcule.
- **Por qué ramas excluyentes:** sin exclusión, el orden `x1.5 → max(_,1)` daría resultados distintos a `max → x1.5` y permitiría un superequipo Maider+Páter contrario al rebalanceo aceptado (Maider = riesgo, Páter = consistencia).
- **Por qué BASE 0 bloquea bonus pero no Páter:** evita premiar con `+5` a quien no jugó, pero preserva la identidad de Páter (te salva de ceros y negativos).
- **Por qué racha cuenta aunque lesionado:** alinear a un lesionado ocupa slot y debe tener coste de repetición; si no, se podría bloquear un slot gratis sin consecuencia.
- **Por qué MVP exige haber jugado:** evita que un `0` por DNP empate en lo alto y regale `+3` sin jugar.

Decisiones cerradas con el usuario que esta spec congela: redondeo a entero half-up; x1.5 solo sobre BASE del capitán; `+1` Páter siempre incluso con BASE 0; BASE 0 bloquea `+5/−N`; racha cuenta aunque lesionado y cuentan todas las jornadas; sin quinteto = `−10` a la jornada y reinicio de rachas; empate MVP → todos suman; MVP sobre BASE forzada y solo si jugó; expulsado sí puede ser MVP; lesión/DNP y expulsión excluyentes; FNB entrada siempre entera; `−5` por cada expulsado con BASE normal; solo Maider/Páter como entrenadores; `[E,A]` permitido; alcance motor+dominio; total puede ser negativo; dato ausente = error sin cálculo; cierre estricto en `Europe/Madrid` con instante de inicio y sin invalidar lo ya guardado; incompleta se rechaza; recálculo total ante corrección admin; desglose como dato del motor.

## 2. Requisitos funcionales (EARS)

- **RF-01 — BASE como valoración tal cual:**
  Cuando se calcule un jugador, el sistema deberá tomar como BASE su valoración FNB, que es siempre un entero y puede ser negativo, cero o positivo. Si su estado es lesionado / no convocado / DNP, entonces el sistema deberá fijar BASE en `0` en lugar de la valoración. Si el jugador está lesionado / no convocado / DNP, entonces nunca deberá constar a la vez como expulsado.

- **RF-02 — Elegibilidad separada jugadores/entrenadores:**
  Cuando se componga una alineación, el sistema deberá aceptar solo a Maider o Páter en el slot de entrenador y solo a jugadores de plantilla en los 5 slots de jugador. Si Maider o Páter aparece en un slot de jugador, o un jugador aparece en el slot de entrenador, entonces el sistema deberá rechazar la alineación.

- **RF-03 — Entrenador único y excluyente:**
  Cuando se registre una alineación válida, el sistema deberá exigir exactamente un entrenador, Maider o Páter, sin opción neutra ni doble. Si falta o hay más de uno, entonces el sistema deberá rechazarla.

- **RF-04 — Efecto Maider solo sobre BASE del capitán con redondeo:**
  Cuando el entrenador sea Maider, el sistema deberá multiplicar por `1.5` solo la BASE del capitán y redondear el resultado a entero con half-up (`13→19.5→20`, `−1→−1.5→−1`). Si el jugador no es el capitán, entonces el sistema no deberá aplicarle ningún multiplicador.

- **RF-05 — Efecto Páter suelo más fijo siempre:**
  Cuando el entrenador sea Páter, el sistema deberá aplicar a cada uno de los 5 jugadores `max(BASE,1)` y después sumar `+1` fijo, incluso si su BASE es `0` por lesión/DNP (`0→2`, `−5→2`). Si el entrenador no es Páter, entonces el sistema no deberá aplicar suelo ni `+1` a nadie.

- **RF-06 — Bonus de posición con equivalencia E/A:**
  Cuando un jugador sea alineado en una posición incluida en sus 2 posiciones válidas, tratando `E` y `A` como intercambiables, el sistema deberá sumar `+5` a ese jugador. Si la posición no coincide ni por equivalencia, entonces el sistema no deberá sumar nada por este concepto.

- **RF-07 — Bloqueo de posición y racha con BASE 0:**
  Si la BASE de un jugador es `0` por lesionado / no convocado / DNP, entonces el sistema deberá omitir tanto el `+5` de posición como el `−N` de racha para ese jugador, aunque esté bien colocado o tenga racha.

- **RF-08 — Penalización por repetición progresiva:**
  Cuando un jugador sea alineado en jornadas con envío válido consecutivas, el sistema deberá restar `0` en la 1.ª aparición, `−1` en la 2.ª seguida, `−2` en la 3.ª, `−3` en la 4.ª y así sucesivamente (`−(n−1)` para la n-ésima consecutiva), salvo bloqueo por BASE 0 según RF-07.

- **RF-09 — Qué cuenta y qué rompe racha:**
  Cuando se compute la racha, el sistema deberá contar como aparición cada jornada con envío válido con el jugador en quinteto guardado, aunque su BASE fuera `0`. Cuentan todas las jornadas con envío; la J1 siempre cuenta como 1.ª y un alta mid-season reinicia. Si una jornada el jugador no está en el quinteto guardado, entonces el sistema deberá romper su racha y la siguiente aparición volverá a contar como 1.ª.

- **RF-10 — MVP al capitán que jugó y es máximo de plantilla:**
  Cuando el capitán sea el jugador con máxima BASE forzada entre la plantilla Lagunak de esa jornada, haya jugado (no lesionado/DNP) y su valoración esté presente, el sistema deberá sumar `+3` al total de jornada. Si hay empate en lo alto, entonces cada manager cuyo capitán sea uno de los empatados y haya jugado deberá recibir el `+3`.

- **RF-11 — Expulsión por cada expulsado sin anular BASE:**
  Cuando uno o más jugadores del quinteto resulten expulsados, el sistema deberá restar `−5` por cada uno al total de jornada y mantener sus BASE y demás conceptos calculados con normalidad. Un expulsado sí puede ser MVP y acumular `+3` y `−5`. Si no hay expulsados en el quinteto, entonces el sistema no deberá restar nada por este concepto.

- **RF-12 — Total de jornada con MVP y expulsiones coexistiendo:**
  Cuando se cierre una jornada calculada con quinteto enviado, el sistema deberá obtener el total como suma de los 5 totales de jugador más `+3` por MVP si aplica menos `5` por cada expulsado. Si el resultado es negativo, entonces el sistema deberá mantenerlo negativo sin suelo a cero.

- **RF-13 — Orden fijo y excluyente por jugador y jornada:**
  Cuando se calcule, el sistema deberá aplicar por jugador en este orden: `BASE → x1.5 Maider solo si es capitán y entrenador Maider (con redondeo) → suelo+1 Páter solo si entrenador Páter → +5 posición (salvo BASE 0) → −N racha (salvo BASE 0)`; y a nivel jornada `+3` MVP y después `−5` por expulsado. Si el entrenador es Maider, entonces nunca se aplicará suelo Páter; si es Páter, nunca se aplicará x1.5.

- **RF-14 — Alineación válida completa:**
  Cuando se guarde una alineación, el sistema deberá exigir 5 jugadores distintos, 1 entrenador y 1 capitán que sea uno de esos 5, cada jugador con posición de alineación válida. Si falta algún slot, falta capitán o posición, hay duplicados o el capitán no pertenece al quinteto, entonces el sistema deberá rechazarla sin guardar.

- **RF-15 — Posiciones válidas y slot de alineación:**
  Cuando se valide, el sistema deberá exigir que cada jugador tenga exactamente 2 posiciones válidas y que la posición de alineación elegida pertenezca a `B|E|A|AP|P`. La pareja `["E","A"]` es válida aunque E y A sean la misma casilla a efectos del `+5`. Si no se cumple, entonces el sistema deberá rechazar la alineación.

- **RF-16 — Cierre en servidor:**
  Cuando se intente guardar una alineación, el sistema deberá tomar como instante el inicio de la petición en servidor y aceptar solo si es estrictamente anterior a `hora_partido − 3h` calculada en zona `Europe/Madrid`. Si es igual o posterior, entonces el sistema deberá rechazarla aunque el contador del cliente aún mostrara tiempo. Si después cambia la hora del partido, el cierre se recalcula sin invalidar lo ya guardado.

- **RF-17 — Dato ausente bloquea el cálculo:**
  Si falta la valoración FNB o el estado (lesionado/convocado/DNP/expulsado) de algún jugador del quinteto, o falta la hora del partido para el cierre, entonces el sistema deberá señalar error y no producir total ni desglose parcial.

- **RF-18 — Desglose como dato del motor:**
  Cuando se calcule una jornada, el sistema deberá devolver por jugador cada concepto aplicado y un total que sea exactamente la suma declarada en RF-12, sin recalcular a mano. Las pantallas solo mostrarán ese dato.

- **RF-19 — Quinteto vacío penaliza y reinicia:**
  Si una jornada queda sin quinteto válido enviado, entonces el sistema deberá fijar el total de esa jornada en `−10` y romper las rachas de todos los jugadores como si no hubieran sido alineados.

- **RF-20 — Recálculo total ante corrección:**
  Cuando el admin corrija valoración, estado o posiciones válidas, el sistema deberá recalcular todo lo afectado de esa jornada con las reglas vigentes.

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | BASE negativa (`−1`) sin Páter | Cuenta tal cual y puede dejar total de jugador y jornada en negativo | La valoración FNB puede ser negativa por definición §0 |
| E-02 | BASE impar con capitán y Maider (`13→19.5→20`, `−1→−1.5→−1`) | Redondeo half-up inmediato antes de seguir el orden; el único decimal nace del x1.5 porque la FNB de entrada es siempre entera | Sin redondeo único habría `.5` o criterios dispares |
| E-03 | Capitán lesionado/DNP (BASE 0) con entrenador Maider | Total del capitán `0`, sin `+5/−N`, y nunca MVP aunque empate en lo alto | BASE 0 bloquea bonus y MVP exige haber jugado |
| E-04 | Lesionado/DNP con entrenador Páter | `0→max(0,1)=1→+1=2`, sin `+5/−N`; BASE negativa igual (`−5→2`) | Páter salva ceros y negativos pero no premia posición ni castiga racha sin jugar |
| E-05 | Lesionado/DNP bien colocado o con racha | No suma `+5` ni resta `−N`, pero esa jornada sí cuenta para su racha futura | Evita premio sin jugar y evita slot gratis sin coste |
| E-06 | Jugador con `posicionesValidas ["E","A"]` alineado en `E` o `A` | Siempre `+5`; E y A son la misma casilla a estos efectos | README declara E==A; no debe depender de la letra elegida |
| E-07 | Racha 1.ª–4.ª y siguientes (`0,−1,−2,−3,−4…`) | Penalización `−(n−1)` sin tope | Tabla §0 progresiva indefinida |
| E-08 | Jugador nuevo o tras romper racha | Siguiente aparición cuenta como 1.ª con `0` | Toda racha rota reinicia |
| E-09 | Jornada sin quinteto válido enviado | Total `−10` y rompe las rachas de todos; la siguiente aparición cuenta como 1.ª | Penaliza el olvido y reinicia repeticiones |
| E-10 | MVP empatado en lo alto entre plantilla (sobre BASE forzada) | Todos los empatados que jugaron habilitan `+3` a quien los tenga de capitán | Decisión de usuario: el empate no anula el premio |
| E-11 | Máxima BASE es `0` o negativa, o nadie jugó | Solo hay MVP si al menos un jugador de plantilla jugó y alcanza el máximo; si nadie jugó, no hay `+3` para nadie | MVP exige haber jugado |
| E-12 | Capitán MVP con entrenador Maider | `(BASE×1.5 redondeado …) +3`, el `+3` nunca se multiplica | Decisión de usuario: el extra se suma al resultado ya multiplicado |
| E-13 | Capitán MVP con entrenador Páter | Páter (suelo+1, sin `+5/−N` si BASE 0) más `+3` si el capitán jugó y es máximo | El `+3` es del capitán, independiente del entrenador |
| E-14 | 2 expulsados en el mismo quinteto | `−10` total (`−5` por cada uno), con sus BASE intactas | Decisión de usuario: castigo por expulsado, no único |
| E-15 | Expulsado que además es capitán y/o MVP | Sí puede ser MVP: acumula su total de jugador normal más `+3` si es máximo y `−5` por su expulsión | Los conceptos son independientes y coexisten |
| E-16 | Valoración o estado ausente al calcular | Error bloqueante, sin total ni desglose parcial | Decisión de usuario: prohibido tratar el hueco como `0` provisional |
| E-17 | Alineación con duplicados, sin capitán, capitán fuera del quinteto, sin posición, entrenador inválido o Maider/Páter en slot de jugador | Rechazo con error, sin guardar | Alineación válida cerrada en RF-14/RF-02 |
| E-18 | Envío en el segundo exacto de `hora−3h` o posterior (instante de inicio) | Rechazo aunque el cliente mostrara cuenta atrás; un cambio posterior de hora no invalida lo ya guardado | Cierre estricto en servidor, zona `Europe/Madrid` |
| E-19 | Partido sin hora o con hora inválida | Cierre incalculable → error y bloqueo de guardado para esa jornada | Sin hora no hay garantía de cierre |
| E-20 | Total de jornada negativo | Se mantiene negativo, sin recorte a cero | Decisión de usuario: el mal quinteto puede perder puntos |
| E-21 | Jugador con distinto número de posiciones válidas (0,1,3+), salvo `["E","A"]` permitido | Dato inválido: bloquea validación de ese jugador | Cada jugador tiene exactamente 2 válidas por §0; `[E,A]` vale aunque sea una casilla efectiva |
| E-22 | Lesionado/DNP a la vez que expulsado | Combinación inválida: son excluyentes | Un no jugado nunca consta como expulsado |
| E-23 | Corrección admin de valoración, estado o posiciones | Recalcula todo lo afectado con las reglas vigentes | Lo corregido no deja totales parciales antiguos |

## 4. Fuera de alcance explícito

- Pantallas y componentes (Home, Equipo, Ficha, Mi Resultado, Clasificación, Ajustes, Admin), previsualización en vivo (`12 +5 −1 = 16`), gráfica de evolución, top 3, modo Pete visual (`img↔imgPete`, `nombre↔nombrePete`), tema claro/oscuro, móvil 360–430px, tap-to-select, PWA, fondo de pista. El desglose de RF-18 es dato del motor; aquí no se define ninguna pantalla.
- Persistencia, esquema SQL, RLS, `service_role`, lecturas SSR/cacheadas, Server Actions como mecanismo, Auth (`username` case-insensitive, hash, sesión httpOnly, rate-limit, reset Admin), rol Admin semilla y su exclusión del ranking.
- Origen de datos de jornada: scraping FNB por URL, formulario manual de valoración/lesionados/convocados/expulsados/MVP, CRUD de jugadores/partidos/usuarios y recálculo como botón (la regla de qué recalcular es RF-20; el botón es de otra spec).
- Contenido i18n (`es/strings.json`, futura `eu.json`), claves de error/desglose y textos visibles.
- Notificaciones, email, auto-reset, multi-liga, chat, escritorio, app nativa.
- Rendimiento, caché, cuotas Supabase Storage y cualquier decisión de implementación (lenguaje, rutas de ficheros, firmas, librerías, SQL).

## 5. Criterios de finalización (Definition of Done)

- [ ] Existe spec congelada con RF-01–RF-20, E-01–E-23 y la corrección Maider/Páter como entrenadores excluyentes.
- [ ] Tests Vitest en verde que cubren: BASE negativa y `0` con FNB entero; capitán x1.5 con redondeo half-up (`13→20`, `−1→−1.5→−1`); Páter suelo+1 con BASE `0/negativa` (`0→2`, `−5→2`); bloqueo de `+5/−N` con BASE 0; rachas 1.ª–4.ª y siguientes; ruptura por no alinear; sin quinteto `−10` con reinicio; racha que cuenta aunque lesionado; J1 y alta como 1.ª; MVP simple sobre BASE forzada, empate MVP, MVP que exige jugar, MVP con Maider y con Páter, expulsado MVP (`+3` y `−5`); expulsión simple, doble (`−10`) y con BASE intacta; lesión/expulsión excluyentes; total negativo preservado; E/A intercambiables con `["E","A"]` válido; validación (5 distintos + entrenador + capitán del quinteto con posición, elegibilidad separada, 2 posiciones por jugador); cierre exacto `−3h` en `Europe/Madrid` con instante de inicio y rechazo en el segundo exacto; cambio de hora sin invalidar; dato ausente que impide calcular; recálculo total tras corrección.
- [ ] Cobertura unitaria del 100% sobre el cálculo §0, validación de posiciones y cálculo de rachas.
- [ ] `npx tsc --noEmit` con 0 errores y cero `any`.
- [ ] `npm run lint` con 0 warnings.
- [ ] `npm test` en verde.
- [ ] `npm run build` en verde.
- [ ] Todo desglose mostrado en cualquier vista deriva de la misma salida del cálculo, sin recálculo manual divergente.
