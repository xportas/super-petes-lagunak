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
* `username + password` único (case-insensitive). Hash Argon2/bcrypt, rate-limit, sesión móvil persistente.
* Sin email. ¿Olvidé contraseña? -> no hay auto-reset. Botón `Pedir reset al admin` (flujo cerrado: el admin pone una clave temporal y se la da al usuario por canal privado; este la cambia en Ajustes).
* Background: pendiente arte Keman + escudo Lagunak.

**Registro:**
* Solo `username + password`. Sin selector de rol. Admin es usuario semilla que no juega.

**Onboarding 3 pasos (solo primera vez):**
1. Elige tu nombre pete.
2. Crea tu primer quinteto + entrenador + capitán.
3. Entiende el cierre: `Cierre = Partido -3h`.

## 2. HOME

| Bloque | Contenido |
|---|---|
| Cuenta atrás | `HH:MM:SS hasta cierre` para próxima jornada. Cierre = `hora_partido -3h`. Si cerrado: `Cerrado - vuelve tras el partido`. |
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

> Al seleccionar se ve cálculo previo: `ej: 12 (base est.) +5 pos -1 racha = 16`. El cálculo final usa la valoración real post-partido.

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

## 6. CLASIFICACIÓN GENERAL

* Puntos acumulados, ranking por `username`.
* Top 3 oro/plata/bronce, últimos 3 gradiente rojo (tal como pediste).

## 7. AJUSTES

* Normativa y reglas (link a §0).
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
* Resultados: vía dual:
  1. Pegar `URL FNB` -> scraping auto (ideal).
  2. Formulario manual valoración + lesionados/convocados/expulsados/MVP.
* Usuarios: listar, reset password (al no haber email).
* Recalcular jornada.
