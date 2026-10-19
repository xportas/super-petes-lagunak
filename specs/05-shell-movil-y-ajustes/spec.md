# 05 — Shell móvil, Navegación, Ajustes y Normas (§7 y §9)

## 1. Objetivo y contexto

**Objetivo:** fijar el QUÉ del contenedor móvil global (360–430px), la barra de navegación inferior adaptada al rol (`manager | admin`), los conmutadores transversales de **Modo Pete** (`ON/OFF`) y **Tema** (`claro/oscuro`), la pantalla `/ajustes` (§7 del `README.md`) y la página `/normas` (§9 del `README.md`), de modo que toda la aplicación se maneje con una mano desde el móvil y hable de las reglas con una sola voz.

**Contexto:**

- `CONSTITUTION.md §8/§9` y `AGENTS.md` exigen: juego web **solo móvil** (360–430px, sin versión escritorio, cero hover, cero drag&drop, objetivos táctiles ≥ 44×44px, respeto a `safe-area-inset-*`), conmutador global Modo Pete (`img ↔ imgPete`, `nombre ↔ nombrePete` en jugadores; entrenadores y managers invariantes), tema claro/oscuro y cero strings hardcodeados (`es/strings.json`).
- `README.md §7` define `Ajustes` (Normas del juego, Modo Pete, Cambiar contraseña, Tema claro/oscuro, Idioma `ES`, Cerrar sesión) y `README.md §9` define `/normas` con sus 8 bloques anclados (`#cierre`, `#base`, `#entrenadores`, `#posicion`, `#racha`, `#mvp`, `#expulsion`, `#orden`).
- `spec-02` gobierna las constantes y el motor §0 (`src/lib/scoring/constantes.ts`); `spec-04` gobierna la lógica y rate-limit de cambiar contraseña (`RF-10`) y revocación de sesión al cerrar sesión (`RF-06`). Esta spec provee el shell, la persistencia en cookies de Modo Pete / Tema, la vista `/ajustes` y la vista `/normas`.
- `next.config.mjs` activa `cacheComponents: true` (Next.js 16.4): la parte estática de `/normas` se prerenderiza con las constantes del motor y el fragmento que depende de la preferencia Modo Pete se aísla en un componente cliente o `<Suspense>` para no bloquear el prerender estático.

## 2. Requisitos funcionales (EARS)

### Shell móvil y Navegación inferior

- **RF-01 — Contenedor móvil único (360–430px) y safe-areas:**
  Cuando se renderice cualquier pantalla de la aplicación, el sistema deberá encajarla en una única columna móvil centrada (`min-w-[360px] max-w-[430px] mx-auto min-h-dvh`), sin scroll horizontal de página, respetando `safe-area-inset-top` y `safe-area-inset-bottom`, con objetivos interactivos de al menos `44×44px` y sin estados dependientes de hover.

- **RF-02 — Barra de navegación inferior por rol:**
  Cuando el usuario tenga sesión activa con onboarding completado y sin bloqueo de clave temporal, el sistema deberá mostrar una barra de navegación inferior fija con 5 destinos según su rol:
  - Si el rol es `manager`: `Home` (`/`), `Equipo` (`/equipo`), `Resultados` (`/mi-resultado`), `Clasificación` (`/clasificacion`) y `Ajustes` (`/ajustes`).
  - Si el rol es `admin`: `Admin` (`/admin`), `Clasificación` (`/clasificacion`), `Jugadores` (`/jugadores`), `Normas` (`/normas`) y `Ajustes` (`/ajustes`).
  En `/login`, `/registro`, `/cambiar-password` y `/onboarding` (o en `/normas` cuando el visitante no tiene sesión activa o sigue bloqueado en `/cambiar-password`/`/onboarding`), la barra inferior deberá ocultarse (mostrando botón de volver cuando corresponda).

### Modo Pete y Tema Claro/Oscuro (persistencia transversal)

- **RF-03 — Conmutador Modo Pete (`ON/OFF`) persistido en cookie:**
  Cuando el usuario active o desactive el Modo Pete desde `/ajustes`, el sistema deberá persistir la preferencia en una cookie (`modo_pete = '1' | '0'`, por defecto `'0'`) accesible tanto en servidor como en cliente, y conmutar inmediatamente en toda la app `img ↔ imgPete` y `nombre ↔ nombrePete` de los **jugadores**. El Modo Pete es estrictamente cosmético: nunca altera posiciones, rachas, validaciones, orden de desempate ni reglas, y nunca altera el `username` de los managers ni el nombre/foto de `Maider` y `Páter`.

- **RF-04 — Conmutador Tema (`Claro/Oscuro`) persistido en cookie (compatible con `cacheComponents`):**
  Cuando el usuario cambie el tema entre claro y oscuro desde `/ajustes`, el sistema deberá persistir la preferencia en una cookie (`tema = 'light' | 'dark'`, por defecto `'dark'`) y aplicar la clase/atributo de tema en el documento raíz (`<html>`) sin parpadeo visual (*flash*) al recargar. Para no invocar `await cookies()` en el nivel superior de `RootLayout` (lo cual impediría el prerender estático de `/normas` con `cacheComponents: true` en Next.js 16.4), `<html>` usará `suppressHydrationWarning` junto con un script inline síncrono mínimo en `<head>` que lea la cookie `tema` (fallback `'dark'`) antes del primer pintado, mientras que la lectura en servidor de las preferencias en `/ajustes` y vistas dinámicas se realizará dentro de su límite `<Suspense>`.

### Pantalla de Ajustes (`/ajustes`)

- **RF-05 — Contenido y acciones de `/ajustes`:**
  Cuando un usuario autenticado (`manager` o `admin`, sin clave temporal pendiente) abra `/ajustes`, el sistema deberá mostrar:
  1. Entrada táctil `Normas del juego` que navega a `/normas`.
  2. Conmutador `Modo Pete [ON/OFF]` (RF-03).
  3. Conmutador `Tema [Claro/Oscuro]` (RF-04).
  4. Formulario o sección desplegable `Cambiar contraseña` (contraseña actual + nueva contraseña + confirmación), que invoca la acción de `spec-04 RF-10` (exige actual distinta de nueva, 8–72 caracteres con al menos 1 no-espacio, rate-limit de 5 fallos / 15 min y revocación de las demás sesiones al guardar).
  5. Indicador de `Idioma: ES` (solo lectura en v1, resuelto vía i18n).
  6. Botón `Cerrar sesión`, que revoca únicamente la sesión actual (`spec-04 RF-06`) y redirige a `/login`.

### Página Normas (`/normas`, §9 del `README.md`)

- **RF-06 — Ruta `/normas` y 8 bloques en orden fijo:**
  Cuando cualquier usuario (con o sin sesión) abra `/normas`, el sistema deberá mostrar las reglas en 8 bloques anclables (`#cierre`, `#base`, `#entrenadores`, `#posicion`, `#racha`, `#mvp`, `#expulsion`, `#orden`) con acordeones o secciones `tap-to-expand`, más nota de Modo Pete y línea de fuente, siguiendo el contenido de `README.md §9` y el orden de `spec-02 RF-13`.

- **RF-07 — Accesos transversales a `/normas`:**
  Cuando el usuario quiera entender una regla desde otra pantalla, el sistema deberá ofrecerle enlace directo a `/normas`: entrada `Normas del juego` en `/ajustes`; paso 2 de `/onboarding` a `/normas#cierre`; icono de ayuda `?` en la cuenta atrás de `/` (Home) a `/normas#cierre`; iconos de estado de `/equipo` y `/jugadores/[id]` a su bloque (`#base`, `#posicion`, `#racha`, `#cierre`, `#entrenadores`); y desglose de `/mi-resultado` a `/normas#orden`.

- **RF-08 — Lectura pura y prerender estático compatible con `cacheComponents`:**
  Cuando se sirva `/normas`, el sistema no deberá ejecutar mutaciones ni consultar la base de datos. Su cuerpo de reglas se prerenderizará estáticamente y cualquier adaptación visual al Modo Pete se resolverá en un subcomponente cliente o límite `<Suspense>` para que `npm run build` prerenderice `/normas` con `cacheComponents: true`.

- **RF-09 — Cero hardcode con números inyectados desde el motor:**
  Cuando se muestren las reglas en `/normas` y los textos del shell/`/ajustes`, el sistema deberá resolver toda cadena visible desde `es/strings.json` (`ui.shell.*`, `ui.nav.*`, `ui.ajustes.*`, `ui.normas.*`) e inyectar los números de reglas (`+5`, `−N`, `+3`, `−5`, `x1.5`, `−3h`, `−10`, zona `Europe/Madrid`) como variables `{var}` importadas directamente de `src/lib/scoring/constantes.ts`. Si un número de regla aparece como literal en JSX o en `es/strings.json`, entonces se considerará incumplimiento aunque `lint` pase.

- **RF-10 — Modo Pete cosmético en `/normas`:**
  Cuando el Modo Pete esté activo, `/normas` podrá mostrar ejemplos con `imgPete`/`nombrePete` de jugadores y siempre incluirá el aviso explícito de que las reglas nunca cambian. Si algún texto sugiere que Pete altera la puntuación, se considerará incumplimiento.

- **RF-11 — Coherencia automática con el motor:**
  Cuando cambie una regla en `src/lib/scoring/constantes.ts` siguiendo el flujo de `AGENTS.md` (test que falla → motor → §0 del README), los valores numéricos mostrados en `/normas` deberán actualizarse automáticamente vía `{var}` sin duplicación.

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | Constantes del motor ausentes al compilar | Fallo de compilación `tsc`; prohibido mostrar números por defecto en `/normas` | Fuente única anti-divergencia |
| E-02 | `{var}` sin parámetro al renderizar | Fallo en compilación `tsc` (sobrecarga estática de `spec-01`) | Heredado de la fundación i18n |
| E-03 | Ancla inexistente en URL (ej. `/normas#inexistente`) | Navega a `/normas` mostrando los 8 bloques sin romper la vista | Un hash inválido no debe tumbar la página |
| E-04 | Tabla de racha en `#racha` | Filas generadas con la función/fórmula del motor (`0, −1, −2, −3…`), no literales hardcodeados por fila | La progresión es indefinida por §0 |
| E-05 | Ejemplos numéricos en `/normas` (`13 → 20`, `0 → 2`, `12 +5 −1 = 16`) | Calculados/verificados mediante test contra las funciones puras de `src/lib/scoring/` | Evita ejemplos desfasados respecto al motor |
| E-06 | Cookies `modo_pete` o `tema` ausentes o con valor corrupto | Fallback silencioso a `modo_pete = '0'` (OFF) y `tema = 'dark'` sin lanzar error | Primera visita o cookie manipulada no rompe el render |
| E-07 | Visitante sin sesión o usuario con clave temporal abre `/normas` | Puede leer `/normas` completa, pero la barra de navegación inferior no se muestra (solo enlace para volver a `/login` o `/cambiar-password`) | `/normas` es pública (`spec-04 RF-06`), pero sin exponer navegación privada |
| E-08 | Admin abre `/ajustes` | Ve los mismos controles de Modo Pete, Tema, Normas, Cambiar su propia contraseña (`spec-04 RF-07`) y Cerrar sesión, y su barra inferior mantiene los 5 ítems de Admin | El Admin no juega pero sí usa tema, Pete y gestiona su clave |
| E-09 | Fallo al cambiar contraseña en `/ajustes` (actual incorrecta, nueva igual o rate-limit activo) | Muestra error i18n devuelto por el dominio de auth (`spec-04`) sin cerrar la sesión actual ni perder el estado del resto de `/ajustes` | Contrato `spec-04 RF-10` |

## 4. Fuera de alcance explícito

- Lógica interna de autenticación, hashing, sesiones y rate-limit en BD (`spec-04`, que esta spec solo invoca desde `/ajustes`).
- Lógica del motor §0, rachas, cierre y validaciones (`spec-02`); modelo SQL y semilla (`spec-03`); pantallas de negocio `/equipo` (`spec-06`), `/` y `/jugadores` (`spec-07`), `/mi-resultado` y `/clasificacion` (`spec-08`), `/admin` (`spec-09`) y sync FNB (`spec-10`).
- Selector de idioma funcional a `eu.json` (en v1 solo se muestra `ES` preparando la arquitectura), notificaciones, versión escritorio, edición de reglas desde la app.

## 5. Criterios de finalización (Definition of Done)

- [ ] Existe el shell móvil (360–430px, 0 scroll horizontal, objetivos ≥ 44×44px, `safe-area-inset-*`) con barra de navegación inferior diferenciada para `manager` (`Home`, `Equipo`, `Resultados`, `Clasificación`, `Ajustes`) y `admin` (`Admin`, `Clasificación`, `Jugadores`, `Normas`, `Ajustes`), oculta en rutas de auth/bloqueo.
- [ ] Existen los conmutadores de `Modo Pete` y `Tema claro/oscuro` en `/ajustes`, persistidos en cookies (`modo_pete`, `tema`) con fallback seguro y reflejados en toda la app sin alterar a `Maider`/`Páter` ni `username` de managers.
- [ ] `/ajustes` incluye enlace a `/normas`, cambio de contraseña conectado al contrato de `spec-04 RF-10`, indicador de idioma `ES` y botón `Cerrar sesión`.
- [ ] Existe la ruta `/normas` prerenderizable con `cacheComponents: true`, con los 8 bloques anclados (`#cierre`, `#base`, `#entrenadores`, `#posicion`, `#racha`, `#mvp`, `#expulsion`, `#orden`) más nota Pete y fuente.
- [ ] Ningún número de regla es literal en JSX ni en `es/strings.json`: todos llegan como `{var}` desde `src/lib/scoring/constantes.ts`, verificado con test unitario en Vitest.
- [ ] `npx tsc --noEmit` 0 errores y cero `any`; `npm run lint` 0 warnings; `npm test` verde; `npm run build` verde.
