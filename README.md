# super-petes-lagunak
Super Manager game version for the Lagunak Senior Men's A basketball team




## 0. REGLAS DE PUNTUACIÓN - Fuente única de verdad

Esta es la base de todo. Sin esto habrá discusiones.

**Puntos base = Valoración FNB tal cual** (puede ser negativa, ej: `1, 6, 12, 7, 2, 0, 8, -1, 1, -1, 13`).

Roles: `Maider` y `Páter` son los dos únicos entrenadores, excluyentes y elegibles solo en el slot de entrenador. El capitán es uno de los 5 jugadores. El resto de la plantilla solo es elegible en slots de jugador.

Orden de cálculo por jugador, siempre igual:

1. `BASE` = valoración FNB tal cual (puede ser negativa). Si lesionado / no convocado / DNP = `0`.
2. `EFECTO ENTRENADOR` (excluyente, solo una rama):
   - Si entrenador es `Maider` y el jugador es el capitán: `round_half_up(BASE x 1.5)` (ej: `13 → 20`, `-1 → -1`). Solo sobre `BASE`.
   - Si entrenador es `Páter`: `max(valor_actual, 1) + 1` fijo a cada uno de los 5, incluso con `BASE = 0` (ej: `0 → 2`).
3. `BONUS POSICIÓN` = `+5` si juega en una de sus 2 posiciones válidas (`E` y `A` cuentan como la misma). No aplica si `BASE = 0` por lesionado / no convocado / DNP.
4. `PENALIZACIÓN REPETICIÓN` = `-N` según racha (ver tabla). No aplica si `BASE = 0`, pero esa jornada sí cuenta para la racha futura.

A nivel jornada total:

* `+3` si tu capitán es MVP real: máxima `BASE` entre la plantilla Lagunak, habiendo jugado. Si hay empate en lo alto, todos los empatados habilitan el `+3`. El `+3` se suma después del `x1.5`, nunca se multiplica.
* `-5` por cada jugador de tu quinteto que sea expulsado. Su `BASE` cuenta con normalidad.
* El total puede ser negativo. Si falta valoración o estado de algún jugador del quinteto, no se calcula (error, no `0` provisional).

### Tabla de repetición - penalización progresiva

| Aparición consecutiva | Penalización ese jugador |
|---|---|
| 1ª jornada (estreno) | 0 |
| 2ª seguida (1ª repetición) | -1 |
| 3ª seguida | -2 |
| 4ª seguida | -3 y así... |

> Se rompe la racha si una jornada no lo alineas o si no envías quinteto. Alinearlo lesionado / DNP cuenta para la racha aunque puntúe `0`. Siempre habrá elegibles (20 plantilla).

### Rebalanceo Maider vs Páter - DEFINITIVO

Con tus datos (media 4.36), Maider sin rebalancear era muy superior:

* Quinteto bueno `13,12,8,7,6 = 46`. Con Maider al 13: `13 x 1.5 = 19.5 → 20` -> `53` (+ MVP +3 = 56).
* Con Páter antiguo en ese mismo quinteto: `+0`, porque todos ya eran >1.

Decisión final (aceptada):

* **Maider (entrenadora):** x1.5 con redondeo half-up solo sobre la BASE del capitán + opta a +3 MVP (el +3 se suma después, sin multiplicar). Alto riesgo.
* **Páter (entrenador):** Suelo `1` + `+1` fijo a cada uno de los 5, incluso con `BASE 0`. Total `+5` garantizado + te salva de negativos.

Maider gana si aciertas el crack, Páter gana por consistencia.

### Mapa de posiciones

`B | E/A | AP | P`. E y A son la misma casilla a efectos del `+5`. Cada `JUGADOR` tiene exactamente 2 posiciones válidas, ej: `[B,E]`. Si lo alineas en una de ellas: `+5` (salvo `BASE = 0`, que bloquea el bonus). Maider y Páter no tienen posiciones ni ocupan slots de jugador.

```json
// Jugador.tipo
{
  "posicionesValidas": ["E","A"],
  "img": "arnau.png",
  "imgPete": "arnau_meme.png",
  "nombre": "Arnau",
  "nombrePete": "El Faltoso"
}
```

## 1. AUTH + ONBOARDING

**Login:**
* `username + password` único (case-insensitive). Hash Argon2/bcrypt, rate-limit (5 fallos en 15 min → bloqueo 15 min), sesión móvil persistente (30 días exactos renovables, multi-dispositivo).
* Sin email. ¿Olvidé contraseña? -> no hay auto-reset. Botón `Pedir reset al admin` (solo informativo: indica contactar al admin por canal privado con tu username; no crea ticket ni notificación. El admin pone una clave temporal, revoca sesiones previas y te la da por canal privado; al entrar con ella deberás cambiarla por una distinta en Ajustes antes de jugar; vale hasta completar el cambio).
* Background: pendiente arte Keman + escudo Lagunak (no bloquea).

**Registro (liga cerrada):**
* `username + password + código de invitación único de liga` vigente y rotable por el admin (se valida antes que el `username`). Sin selector de rol. Admin es usuario semilla que no juega.
* `username 3-20 [A-Za-z0-9_-]`, único case-insensitive (display preservado). `password` 8–72 con al menos 1 no-espacio. `nombrePete` es solo de jugadores, no de managers.

**Onboarding 2 pasos (solo primera vez, reanudable):**
1. Crea tu primer quinteto + entrenador + capitán (solo jugadores activos; misma validación que Equipo con posición por slot; si no hay próxima jornada abierta o el cierre ya pasó, se muestra aviso y se continúa al paso 2 para crearlo luego en Equipo).
2. Entiende el cierre: `Cierre = Partido -3h` (ver `/normas#cierre`). Obligatorio antes de Home; si el cierre ya había pasado al completarlo, esa jornada no cuenta `−10`.

## 2. HOME

| Bloque | Contenido |
|---|---|
| Cuenta atrás | `HH:MM:SS hasta cierre` para próxima jornada. Cierre = `hora_partido -3h`. Si cerrado: `Cerrado - vuelve tras el partido`. Icono de ayuda `?` enlaza a `/normas#cierre`. |
| Próximo partido | Fecha, hora, lugar, rival. |
| Top 3 Managers | Username ordenados por puntos de la **última jornada**, no acumulado. |
| Top 3 Jugadores | Jugadores reales ordenados por valoración última jornada. Tap -> ficha. |

## 3. EQUIPO - Alineación próxima jornada

* Slots: `5 jugadores + 1 entrenador (6º slot) + 1 capitán (uno de los 5)`.
* Interacción móvil: `tap-to-select + lista`. Nada de drag&drop.
* Fondo pista sutil, que no reste legibilidad.

Estados por jugador en el selector, con icono + tooltip:

* ✅ Disponible
* ⚠️ Penalizado `-N` (muestra `-1/-2...` en vivo al seleccionarlo)
* 🚑 Lesionado / ❌ No convocado = `BASE 0` (con Páter `2`, sin `+5` ni `-N`)
* 📍 Bonus posición `+5` si coincide (se previsualiza)

> Al seleccionar se ve cálculo previo: `ej: 12 (base est.) +5 pos -1 racha = 16`. El cálculo final usa la valoración real post-partido. Cada icono enlaza al bloque correspondiente de `/normas` (posición, racha, cierre).

## 4. FICHA JUGADOR INDIVIDUAL

* Foto / imgPete según modo, Nombre / mote, Dorsal, Posiciones `[x,y]`, Descripción faltosa.
* Media temporada, Última valoración.
* **Evolución por jornada:** tabla + mini-gráfica `J1:12, J2:7...`
* Estado actual: disponible / lesionado / racha.

## 5. JORNADA > MI RESULTADO + HISTORIAL

Página nueva, obligatoria para evitar piques.

**Mi Resultado (por jornada):**
```
Arnau 12 +5 pos -1 racha = 16
...
Capitán x1.5 con redondeo solo sobre BASE (con Maider)
MVP acertado +3 (después del x1.5, sin multiplicar)
Expulsión -5 por cada expulsado
TOTAL: 67
```

**Historial:** lista `J1: 52pts (12º), J2: 67pts (3º)...` Tap expande desglose.

> El desglose sigue el orden fijo de §0. Dudas de reglas: ver `/normas#orden`.

## 6. CLASIFICACIÓN GENERAL

* Puntos acumulados, ranking por `username`.
* Top 3 oro/plata/bronce, últimos 3 gradiente rojo (tal como pediste).

## 7. AJUSTES

* Normativa y reglas: entrada `Normas del juego` que abre la página `/normas` (contenido §0 desglosado, ver §9).
* Modo Pete [ON/OFF]: cambia `img->imgPete` y `nombre->nombrePete`. Normas no cambian.
* Cambiar contraseña.
* Tema claro/oscuro.
* Cerrar sesión.
* Idioma: v1 solo `ES`, pero **cero hardcode**. Todo por claves i18n:
  ```
  ui.home.countdown = "Cierre en {time}"
  ```
  en `es/strings.json`, escalable a `eu.json`, etc.

Sin notificaciones en v1.

## 8. ADMIN (no juega)

* Partidos/Jornadas: crear rival, lugar, fecha, cálculo auto `cierre = -3h`.
* Jugadores: CRUD + `posiciones[2], img, imgPete, nombrePete, dorsal`.
* Resultados: triple vía (detalle en `specs/10-scraping-fnb/spec.md`):
  1. Auto-sync FNB transparente: calendario desde `idTeam 11659` y actas digitales post-partido vía APIs JSON OWC (sin parsear HTML), con Lazy Sync en servidor y throttle.
  2. Pegar `URL FNB` (`pagina-partido/?id=...`) o botón `Sincronizar FNB ahora` -> pre-rellena el formulario para revisión antes de guardar.
  3. Formulario manual valoración + lesionados/convocados/expulsados/MVP: garantizado siempre (si la FNB cae o el partido no tiene acta digital, como la J1 `55483`, la liga nunca se bloquea).
* Usuarios: listar, reset password (al no haber email).
* Recalcular jornada.

## 9. NORMAS (`/normas`) - Página de reglas desglosadas

Página de lectura prevista (sin acciones ni BD) que desglosa el §0. Fuente de contenido: §0 + `specs/02-motor-puntuacion-y-dominio/spec.md`. No duplicará ni reinterpretará el motor: cuando se implemente (spec-05), los números (`+5`, `−N`, `+3`, `−5`, `x1.5`, `−3h`) se inyectarán desde las constantes de `src/lib/scoring/` vía variables `{var}` de `es/strings.json` (`ui.normas.*`).

Accesos transversales: Ajustes (`Normas del juego`), Onboarding paso 2 (`#cierre`), Home cuenta atrás (`?` → `#cierre`), Equipo (iconos → bloque correspondiente), Mi Resultado (`#orden`).

Bloques en orden fijo (anclas):

1. `#cierre` Cierre: `hora_partido − 3h` en `Europe/Madrid`, validado en servidor. Solo se acepta lo recibido estrictamente antes; el segundo exacto o después se rechaza. El contador del Home es solo UX.
2. `#base` BASE = valoración FNB tal cual (puede ser negativa). Lesionado / no convocado / DNP → `BASE = 0` (ocupa slot, se muestra 🚑/❌, nunca se oculta).
3. `#entrenadores` Maider y Páter excluyentes, solo slot de entrenador. Maider: `round_half_up(BASE x 1.5)` solo sobre BASE del capitán (ej: `13 → 20`, `-1 → -1`) + opta a MVP. Páter: `max(valor, 1) + 1` a cada uno de los 5, incluso con `BASE = 0` (`0 → 2`). Nunca se combinan.
4. `#posicion` `+5` si juega en una de sus 2 válidas (`B | E/A | AP | P`, `E == A`). Bloqueado si `BASE = 0`.
5. `#racha` `−N` progresivo: 1ª = `0`, 2ª seguida = `−1`, 3ª = `−2`, 4ª = `−3`... Se rompe si una jornada no lo alineas o no envías quinteto. Alinear lesionado/DNP cuenta para la racha aunque puntúe `0`.
6. `#mvp` `+3` jornada si tu capitán es máxima BASE de la plantilla Lagunak habiendo jugado. Empate en lo alto: todos los empatados habilitan el `+3`. Se suma después del `x1.5`, nunca se multiplica.
7. `#expulsion` `−5` por cada expulsado del quinteto. Su BASE cuenta con normalidad. Acumula con MVP si coincide.
8. `#orden` Orden fijo por jugador: `BASE → x1.5 Maider ó suelo+1 Páter → +5 posición → −N racha`; jornada: `+3 MVP → −5 expulsión`. Total puede ser negativo. Dato ausente = error, no `0` provisional.

Nota Modo Pete: cosmético (`img↔imgPete`, `nombre↔nombrePete`). Las reglas nunca cambian.
