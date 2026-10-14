# super-petes-lagunak
Super Manager game version for the Lagunak Senior Men's A basketball team




## 0. REGLAS DE PUNTUACIÓN - Fuente única de verdad

Esta es la base de todo. Sin esto habrá discusiones.

**Puntos base = Valoración FNB tal cual** (puede ser negativa, ej: `1, 6, 12, 7, 2, 0, 8, -1, 1, -1, 13`).

Orden de cálculo por jugador, siempre igual:

1. `BASE` = valoración FNB. Si lesionado / no convocado / DNP = `0`.
2. `CAPITÁN (Maider)` = si es capitán: `BASE x 1.5`. Solo sobre `BASE`, antes de todo lo demás.
3. `SUELO (Páter)` = si entrenador es Páter: `max(valor_actual, 1)`.
4. `BONUS POSICIÓN` = `+5` si juega en una de sus 2 posiciones válidas.
5. `PENALIZACIÓN REPETICIÓN` = `-N` según racha (ver tabla).

A nivel jornada total:

* `+3` si tu capitán es el MVP real de la jornada (máxima valoración).
* `-5` si algún jugador de tu quinteto es expulsado.

### Tabla de repetición - penalización progresiva

| Aparición consecutiva | Penalización ese jugador |
|---|---|
| 1ª jornada (estreno) | 0 |
| 2ª seguida (1ª repetición) | -1 |
| 3ª seguida | -2 |
| 4ª seguida | -3 y así... |

> Se rompe la racha si una jornada no lo alineas. Siempre habrá elegibles (20 plantilla).

### Rebalanceo Maider vs Páter - DEFINITIVO

Con tus datos (media 4.36), Maider sin rebalancear era muy superior:

* Quinteto bueno `13,12,8,7,6 = 46`. Con Maider al 13: `+6.5` extra -> `52.5` (+ MVP +3 = 55.5).
* Con Páter antiguo en ese mismo quinteto: `+0`, porque todos ya eran >1.

Decisión final (aceptada):

* **Maider:** Capitán x1.5 sobre BASE + opta a +3 MVP. Alto riesgo.
* **Páter:** Suelo `1` + `+1` fijo a cada uno de los 5. Total `+5` garantizado + te salva de negativos.

Maider gana si aciertas el crack, Páter gana por consistencia.

### Mapa de posiciones

`B | E/A | AP | P`. E y A son lo mismo. Cada `JUGADOR` tiene 2 posiciones válidas, ej: `[B,E]`. Si lo alineas en una de ellas: `+5`.

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
* 🚑 Lesionado / ❌ No convocado = puntuará `0`
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
Capitán x1.5 aplicado a base
MVP acertado +3
Expulsión -5
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
