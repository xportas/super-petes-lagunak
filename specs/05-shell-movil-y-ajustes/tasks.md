# Tasks — 05 Shell móvil, Navegación, Ajustes y Normas (§7 y §9)

Fuente: `specs/05-shell-movil-y-ajustes/spec.md` + `plan.md`. Tareas pequeñas y atómicas.

> Orden: primero coherencia motor/dominio (E-04/E-05), luego puras + i18n, luego shell/nav, luego `/ajustes`, luego `/normas`, luego puerta. Cada tarea es atómica.

- [x] **T-01 — Tests coherencia motor para `/normas` (fórmula racha + ejemplos)** — Cubre **RF-11, RF-09, E-04, E-05**.
  Verificación: `npm test -- src/lib/preferencias src/app/normas`.
  Hecho cuando: existe test que afirma `penalizacionPara(1..4) → [0,−1,−2,−3]` importado de `dominio/rachas.ts` (no literales), y `calcularJugador({13, capitán, maider}) → 20`, `{0 + pater} → 2`, `12+5−1=16` contra `src/lib/scoring/`. Si cambia `constantes.ts`, este test falla primero.

- [x] **T-02 — Tipos + esquemas + parseo cookies con fallback** — Cubre **RF-03, RF-04, E-06**.
  Archivos: `src/lib/preferencias/tipos.ts`, `esquemas.ts`, `cookies.ts` (`parsearModoPete/parsearTema/leerPreferencias`), `index.ts`.
  Verificación: `npm test -- src/lib/preferencias/cookies.test.ts`.
  Hecho cuando: `parsearModoPete('1')='1'`, resto→`'0'`; `parsearTema('light')='light'`, resto→`'dark'`; ausente/corrupta no lanza; cero `any`.

- [x] **T-03 — Navegación pura por rol + ocultación** — Cubre **RF-02, E-07**.
  Archivos: `src/lib/preferencias/navegacion.ts` (`itemsNavPara/debeMostrarNav`).
  Verificación: `npm test -- src/lib/preferencias/navegacion.test.ts`.
  Hecho cuando: `manager → [/, /equipo, /mi-resultado, /clasificacion, /ajustes]`; `admin → [/admin, /clasificacion, /jugadores, /normas, /ajustes]`; `debeMostrarNav=false` en `/login,/registro,/cambiar-password,/onboarding` y `/normas` sin sesión o con temporal.

- [x] **T-04 — Orden canónico + anclas de `/normas`** — Cubre **RF-06, E-03**.
  Archivos: `src/lib/preferencias/normas.ts` (`ORDEN_BLOQUES`, `anclaDe`).
  Verificación: `npm test -- src/lib/preferencias/normas.test.ts`.
  Hecho cuando: `ORDEN_BLOQUES=['cierre','base','entrenadores','posicion','racha','mvp','expulsion','orden']`; hash desconocido documentado como no-rompedor (muestra los 8).

- [x] **T-05 — Claves i18n `ui.shell/ui.nav/ui.ajustes/ui.normas`** — Cubre **RF-09, RF-05, RF-02, RF-10**.
  Archivo: `es/strings.json` (solo añadir, sin renombrar claves spec-01/02/04; números solo como `{var}`).
  Verificación: `npx tsc --noEmit` + `npm test -- src/lib/i18n`.
  Hecho cuando: existen `ui.shell.*`, 8 `ui.nav.*`, `ui.ajustes.*` (6 filas), `ui.normas.*_titulo/texto` + `nota_pete` + `fuente`; `{var}` sin parámetro falla en `tsc` (E-02).

- [x] **T-06 — Shell móvil + estilos safe-area** — Cubre **RF-01**.
  Archivos: `src/components/shell/mobile-shell.tsx`, `src/app/globals.css` (solo `safe-area`, `overflow-x: clip`, variant `dark:`).
  Verificación: `npm run build` + revisión manual 360–430px sin scroll-x, tap ≥44px, cero `hover`.
  Hecho cuando: toda pantalla queda en `min-w-[360px] max-w-[430px] mx-auto min-h-dvh` con `safe-area-inset-top/bottom`.

- [x] **T-07 — Anti-flash tema + `layout` compatible `cacheComponents`** — Cubre **RF-04, RF-08**.
  Archivos: `src/components/shell/theme-script.tsx`, modificar `src/app/layout.tsx` (`suppressHydrationWarning`, script en `<head>`, `<Suspense>` para prefs; prohibido `await cookies()` arriba).
  Verificación: `npm run build` prerenderiza `/normas`; recarga con `tema=light` no flashea.
  Hecho cuando: fallback `dark` antes del primer pintado; `/normas` sigue estática.

- [x] **T-08 — Barra inferior por rol** — Cubre **RF-02, E-07, E-08**.
  Archivos: `src/components/shell/bottom-nav.tsx` (server por rol) + `nav-activa.tsx` (`'use client'`, solo `aria-current` vía `usePathname()`).
  Verificación: `npm run dev`, login como `manager` y `admin`.
  Hecho cuando: 5 destinos exactos por rol; oculta en auth/bloqueo (solo volver); admin mantiene sus 5 en `/ajustes`.

- [x] **T-09 — Server Actions `establecerModoPete/establecerTema`** — Cubre **RF-03, RF-04**.
  Archivo: `src/app/ajustes/actions.ts` (Zod en borde, cookie `Path=/ SameSite=Lax Max-Age=1y`, `revalidatePath`).
  Verificación: `npm test -- src/lib/preferencias` + toggle manual persiste cookie legible en server y cliente.
  Hecho cuando: valor corrupto → fallback silencioso, nunca `throw` en render.

- [x] **T-10 — Página `/ajustes` completa (reuso spec-04)** — Cubre **RF-05, E-08, E-09**.
  Archivos: `src/app/ajustes/page.tsx` (server + `<Suspense>`), `interruptores.tsx` (cliente optimista), `cambiar-password.tsx` (incrusta acción `spec-04 RF-10` en `<details>`).
  Verificación: `npm test` + manual: enlace a `/normas`, Pete ON/OFF, Tema, cambiar contraseña (actual≠nueva, 8–72, rate-limit 5/15min, revoca demás), `Idioma: ES`, cerrar sesión → `/login` (solo actual).
  Hecho cuando: fallo de contraseña muestra `errors.auth.*` i18n sin cerrar sesión ni perder resto del estado.

- [x] **T-11 — `/normas` estática + 8 bloques + tabla racha** — Cubre **RF-06, RF-08, RF-09, E-04**.
  Archivos: `src/app/normas/page.tsx` (`force-static`, cero BD/mutaciones), `bloque.tsx` (`<details>/<summary>` + `traducir()` con `{var}` de `constantes.ts`), `tabla-racha.tsx` (filas vía `penalizacionPara()`).
  Verificación: `npm run build` (prerender) + `npm test -- src/app/normas`.
  Hecho cuando: 8 `<section id>` en orden fijo + fuente; sin `cookies()` arriba; sin literal numérico.

- [x] **T-12 — Isla Pete en `/normas` + aviso inmutable** — Cubre **RF-10, RF-08, E-07**.
  Archivo: `src/app/normas/ejemplo-pete.tsx` (único punto que lee `modo_pete`; `imgPete/nombrePete` solo jugadores, nunca `Maider/Páter` ni `username`).
  Verificación: `npm test -- src/app/normas` + manual con `modo_pete=1`.
  Hecho cuando: siempre visible `ui.normas.nota_pete` ("las reglas nunca cambian"); ningún texto sugiere que Pete altera puntos; visitante sin sesión la lee sin nav privada.

- [x] **T-13 — Test anti-literal `{var}` + fuente única** — Cubre **RF-09, RF-11, E-01**.
  Archivo: `src/app/normas/normas-vars.test.ts` (lee `es/strings.json` + `src/app/normas/*.tsx`, exige `import` de `constantes.ts`).
  Verificación: `npm test -- src/app/normas/normas-vars.test.ts`.
  Hecho cuando: falla si `+5|−N|+3|−5|x1.5|−3h|−10` aparece fuera de `{var}`; falla si falta export en `constantes.ts` (E-01, sin números por defecto).

- [x] **T-14 — Puerta de calidad 05** — Cubre **DoD**.
  Verificación: `npx tsc --noEmit` → 0 errores y cero `any`; `npm run lint` → 0 warnings; `npm test` → verde + 100% en `src/lib/preferencias/**`; `npm run build` → verde con `/normas` prerenderizada.
  Hecho cuando: los 4 comandos en verde en el mismo cambio; RF-07 transversal lo verifican sus specs dueñas (aquí solo existen los destinos `#...`).
