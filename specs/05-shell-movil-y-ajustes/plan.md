# Plan técnico — 05 Shell móvil, Navegación, Ajustes y Normas (§7 y §9)

Fuente: `specs/05-shell-movil-y-ajustes/spec.md` + `CONSTITUTION.md` + `AGENTS.md` + `README.md §0/§7/§9`.
Alcance: solo diseño. No incluye código de producción.

Prerrequisitos: `spec-01` aplicada (TS `strict`, `traducir()` tipado con `{var}`, `src/app/layout.tsx` mínimo), `spec-02` aplicada (`src/lib/scoring/constantes.ts` + `calcularJugador`/`penalizacionPara`/`esMvpCapitan`), `spec-04` aplicada (`src/proxy.ts`, `resolverDestino`, `cambiarPassword`, `cerrarSesion`). Esta spec no crea DDL/RLS (dueña `spec-03`), no implementa auth/rate-limit (dueña `spec-04`), ni pantallas de negocio (spec-06/07/08/09/10).

## 1. Modelos de datos

Cero tablas nuevas. Solo tipos TS puros. Las preferencias viven en cookies, no en BD.

```ts
// src/lib/preferencias/tipos.ts
export type Tema = 'light' | 'dark';
export type ModoPete = '0' | '1'; // '1'=ON, '0'=OFF. Cookie en string para leerla igual en server/cliente
export interface Preferencias {
  readonly modoPete: ModoPete;
  readonly tema: Tema;
}
export type Rol = 'manager' | 'admin'; // reuso tipo spec-04, no redefinir

export type RutaNav =
  | '/' | '/equipo' | '/mi-resultado' | '/clasificacion' | '/ajustes'
  | '/admin' | '/jugadores' | '/normas';

export interface ItemNav {
  readonly ruta: RutaNav;
  readonly claveEtiqueta: 'ui.nav.home' | 'ui.nav.equipo' | 'ui.nav.resultados' | 'ui.nav.clasificacion' | 'ui.nav.ajustes' | 'ui.nav.admin' | 'ui.nav.jugadores' | 'ui.nav.normas';
  readonly ancla?: string;
}

export type BloqueNormas = 'cierre' | 'base' | 'entrenadores' | 'posicion' | 'racha' | 'mvp' | 'expulsion' | 'orden';
// Orden canónico fijo, exportado como const para que /normas y tests iteren el mismo array.
```

Notas:

* `Preferencias` es el único estado transversal. Nunca incluye `username`, posiciones, ni reglas: Pete es cosmético (RF-03/RF-10).
* `ItemNav` no guarda literales, solo `claveEtiqueta` → cero hardcode.
* `BloqueNormas` fija el orden de RF-06/RF-11. Añadir un bloque rompería `tsc` en el mapa de secciones.

## 2. Decisiones justificadas

| # | Decisión | Elegida | Alternativa descartada | Justificación |
|---|---|---|---|---|
| D-01 | Persistencia Pete/Tema en cookies `modo_pete`/`tema` | Cookies `Path=/, SameSite=Lax, Max-Age=1y`, `httpOnly=false` (legibles en cliente para toggle instantáneo) | `localStorage` o columna en `usuario` | RF-03/RF-04 exigen acceso en servidor y cliente + reflejo inmediato. `localStorage` no llega al Server Component (rompería SSR de Pete). BD exigiría lectura Supabase en cada render y rompería RF-08 (cero BD en `/normas`). |
| D-02 | Mutación vía Server Actions `establecerModoPete` / `establecerTema` | `async (valor: unknown) => void` con Zod en borde + `revalidatePath` + actualización optimista en cliente | Route Handlers `POST /api/...` o solo `document.cookie` en cliente | Convención AGENTS: mutaciones solo vía Server Actions con validación en servidor. Solo-cliente divergería del SSR. |
| D-03 | Anti-flash de tema con script inline síncrono en `<head>` + `suppressHydrationWarning` en `<html>` | Script ~10 líneas que lee `tema` (fallback `'dark'`) y pone `class="dark"`/`data-theme` antes del primer pintado | `useEffect` que aplica el tema tras hidratar | RF-04 exige sin parpadeo. `useEffect` siempre flashea en recarga. Script inline es la única vía antes del pintado. |
| D-04 | `RootLayout` nunca hace `await cookies()` en nivel superior; lectura de prefs solo dentro de `<Suspense>` | `layout.tsx` estático + `<Suspense><ShellPrefs/></Suspense>` y `<Suspense><AjustesPrefs/></Suspense>` | `await cookies()` en `RootLayout` | RF-04/RF-08: con `cacheComponents:true`, `await cookies()` en el layout impediría el prerender estático de `/normas`. Aislarlo en `Suspense` preserva estático + dinámico. |
| D-05 | `BottomNav` Server por rol + isla cliente solo para `aria-current` | Server recibe `rol: Rol \| null`; el resaltado activo es componente cliente mínimo que lee `usePathname()` | Nav totalmente cliente con fetch de rol, o dos layouts duplicados | RF-02: 5 destinos difieren por rol (dato servidor de `proxy`/sesión). Duplicar layouts diverge. Hacerlo todo cliente expondría rol y parpadearía. |
| D-06 | `/normas` estática + isla Pete | `page.tsx` Server estático (sin BD, sin `cookies()` arriba); ejemplos con `nombrePete/imgPete` en subcomponente cliente o `Suspense` que lee `modo_pete` | Página totalmente dinámica (`force-dynamic`) | RF-08 exige prerender con `cacheComponents:true` y cero BD. Dinámica total perdería caché y violaría DoD `build` estático. |
| D-07 | Acordeones con `<details>/<summary>` nativos | Cero JS para expandir, `tap-to-expand`, accesible por defecto | Acordeón custom con `useState` + librería | RF-01/RF-06: tap ≥44px sin hover ni drag. Nativo = menos JS, funciona sin hidratar, respeta Constitución §8. |
| D-08 | Zod solo en borde de cookies | `esquemaTema = z.enum(['light','dark'])`, `esquemaModoPete = z.enum(['0','1'])`; lo corrupto → fallback silencioso, nunca throw en render | Validación manual con `if` o `throw` en cookie corrupta | E-06 exige fallback silencioso a `'0'`/`'dark'`. Zod centraliza el contrato; `throw` tumbaría el render en primera visita manipulada. |
| D-09 | Reuso de `spec-04`, cero duplicación | `/ajustes` invoca `cambiarPassword` y `cerrarSesion` de `spec-04` tal cual | Reimplementar formularios/rate-limit/revocación aquí | §4 fuera de alcance: lógica auth es dueña `spec-04`. Duplicar violaría E-09 y anti-divergencia. |
| D-10 | Tabla `#racha` generada por fórmula | Filas `1..N` con `penalizacionPara(n)` importada de `dominio/rachas.ts` | 4-5 filas literales en JSX | E-04: la progresión es indefinida por §0. Literales se desfasarían. |
| D-11 | Ejemplos numéricos verificados, no literales sueltos | `13→20`, `0→2`, `12+5−1=16` se afirman en test contra `calcularJugador`/`constantes`; en JSX solo `{var}` | Escribir `20`/`2`/`16` a mano en `strings.json` o JSX | E-05/RF-09/RF-11: evita ejemplos desfasados; si cambia el motor, el test falla primero (flujo AGENTS). |
| D-12 | Sin nuevas dependencias | Solo `next/headers`, `react`, Zod (ya de spec-02/04) | `next-themes`, `js-cookie`, `clsx` extra | Tema/Pete se resuelven con 2 cookies + script inline. Librería de tema añadiría JS y su propio storage, rompiendo el contrato cookie-server. |

## 3. Archivos exactos a crear / modificar / no tocar

Respetando estructura objetivo de `AGENTS.md`. `kebab-case`, negocio en español, infra en inglés.

### Crear

* `src/lib/preferencias/tipos.ts` — tipos §1. **Cubre RF-03/RF-04.**
* `src/lib/preferencias/cookies.ts` — puras: `parsearModoPete(v: unknown): ModoPete`, `parsearTema(v: unknown): Tema`, `leerPreferencias(cookieHeader: string | null): Preferencias` (fallback E-06). Sin `next/headers` dentro (testeable en `node`). **Cubre RF-03/RF-04/E-06.**
* `src/lib/preferencias/esquemas.ts` — `esquemaTema`, `esquemaModoPete` (Zod, §4). **Cubre RF-03/RF-04.**
* `src/lib/preferencias/navegacion.ts` — puras: `itemsNavPara(rol: Rol): readonly ItemNav[]`, `debeMostrarNav(ruta: string, ctx: {tieneSesion, esTemporal, onboardingCompleto}): boolean`. **Cubre RF-02/E-07.**
* `src/lib/preferencias/normas.ts` — puras: `ORDEN_BLOQUES: readonly BloqueNormas[]` (`['cierre','base',...]`), `anclaDe(b: BloqueNormas): '#cierre'...`. **Cubre RF-06.**
* `src/lib/preferencias/index.ts` — barrel.
* `src/components/shell/theme-script.tsx` — Server que emite `<script>` inline síncrono (lee `tema`, fallback `dark`). **Cubre RF-04.**
* `src/components/shell/mobile-shell.tsx` — Server: `<div class="min-w-[360px] max-w-[430px] mx-auto min-h-dvh ...">` + `pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`, sin scroll-x. **Cubre RF-01.**
* `src/components/shell/bottom-nav.tsx` — Server por rol (`itemsNavPara`) + `src/components/shell/nav-activa.tsx` cliente (`'use client'`, `usePathname()` solo para `aria-current`). Objetivos `min-h-[44px] min-w-[44px]`. **Cubre RF-02.**
* `src/app/ajustes/page.tsx` — Server: lee prefs dentro de `<Suspense>`, muestra 6 filas RF-05. **Cubre RF-05.**
* `src/app/ajustes/actions.ts` — `establecerModoPete`, `establecerTema` (validan con Zod, escriben cookie, `revalidatePath`). Reexporta `cambiarPassword`/`cerrarSesion` de spec-04, no los redefine. **Cubre RF-03/RF-04.**
* `src/app/ajustes/interruptores.tsx` — `'use client'`: switches Pete/Tema (llaman a actions + optimista). **Cubre RF-03/RF-04.**
* `src/app/ajustes/cambiar-password.tsx` — importa formulario/acción de `spec-04`, solo lo incrusta en `<details>`. **Cubre RF-05.4/E-09.**
* `src/app/normas/page.tsx` — Server estático: `export const dynamic = 'force-static'`, sin fetch/BD/`cookies()` arriba. Renderiza 8 `<section id>` en orden `ORDEN_BLOQUES` + nota Pete + fuente. **Cubre RF-06/RF-08.**
* `src/app/normas/bloque.tsx` — Server: `<details><summary>` por bloque, todo texto vía `traducir()` con `{var}` de `constantes.ts`. **Cubre RF-06/RF-09.**
* `src/app/normas/tabla-racha.tsx` — Server: genera filas con `penalizacionPara()`. **Cubre E-04.**
* `src/app/normas/ejemplo-pete.tsx` — `'use client'` o `Suspense`: único punto que lee `modo_pete` para `imgPete/nombrePete` + aviso "las reglas nunca cambian". **Cubre RF-08/RF-10.**
* Tests junto al módulo (`*.test.ts`): `src/lib/preferencias/cookies.test.ts`, `navegacion.test.ts`, `normas.test.ts`, `src/app/normas/normas-vars.test.ts` (anti-literal, ver §7).

No crear en 05: `src/lib/scoring/constantes.ts` (spec-02), `src/proxy.ts` (spec-04), migraciones SQL (spec-03), `eu.json`.

### Modificar

* `src/app/layout.tsx` — añadir `suppressHydrationWarning` en `<html>`, `<ThemeScript/>` en `<head>`, envolver en `<MobileShell/>` + `<Suspense><BottomNav/></Suspense>`. Sin `await cookies()` arriba. **Cubre RF-01/RF-02/RF-04.**
* `src/app/globals.css` — solo utilidades `safe-area` + `dark:` variant de Tailwind v4 + `overflow-x: clip` en `body`. Sin rediseño. **Cubre RF-01.**
* `es/strings.json` — añadir claves §6, sin renombrar las de spec-01/02/04.
* `vitest.config.ts` — mantener umbrales spec-01/02/04; añadir 100% líneas+ramas en `src/lib/preferencias/*.ts`.
* `package.json` — cero deps nuevas (Zod ya existe desde spec-02).

### No tocar

* `src/lib/scoring/*`, `src/lib/dominio/*` (solo importar constantes/funciones), `src/lib/auth/*`, `src/lib/supabase/*`, `src/lib/fnb/*`, `public/*`, resto de `src/app/*` (enlaces a `/normas#...` los añaden sus specs dueñas según RF-07).

## 4. Tipos de dominio en TypeScript strict y esquemas Zod

Convenciones: `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`, cero `any` (`unknown` + narrowing), `readonly`, archivos `kebab-case`.

```ts
// src/lib/preferencias/tipos.ts
export type Tema = 'light' | 'dark';
export type ModoPete = '0' | '1';
export interface Preferencias { readonly modoPete: ModoPete; readonly tema: Tema; }
export const ORDEN_BLOQUES = ['cierre','base','entrenadores','posicion','racha','mvp','expulsion','orden'] as const;
```

```ts
// src/lib/preferencias/esquemas.ts — único sitio con unknown en borde
import { z } from 'zod';
export const esquemaTema = z.enum(['light', 'dark']);
export const esquemaModoPete = z.enum(['0', '1']);
export const esquemaPreferencias = z.object({
  modo_pete: esquemaModoPete.optional(),
  tema: esquemaTema.optional(),
});
```

Zod no entra en `scoring/dominio` ni en el render de `/normas`: allí los números llegan ya tipados como `number` desde `constantes.ts` y se pasan como `Params` a `traducir()` (sobrecarga estática de spec-01: `{var}` faltante = error `tsc`, cubre E-02).

## 5. Contratos de funciones puras / Server Actions / tablas Supabase

```ts
// puras (node, sin IO) — src/lib/preferencias/
parsearModoPete(v: unknown): ModoPete; // '1'→'1', resto→'0' (E-06)
parsearTema(v: unknown): Tema;         // 'light'→'light', resto→'dark' (E-06)
leerPreferencias(header: string | null): Preferencias;
itemsNavPara(rol: Rol): readonly ItemNav[]; // manager: 5 de RF-02; admin: 5 de RF-02
debeMostrarNav(ruta: string, ctx: { tieneSesion: boolean; esTemporal: boolean; onboardingCompleto: boolean }): boolean;
// false en /login,/registro,/cambiar-password,/onboarding y en /normas sin sesión o con bloqueo (E-07)
anclaDe(b: BloqueNormas): `#${BloqueNormas}`;

// Server Actions — src/app/ajustes/actions.ts
establecerModoPete(valor: unknown): Promise<void>; // Zod→cookie modo_pete + revalidatePath
establecerTema(valor: unknown): Promise<void>;     // Zod→cookie tema + revalidatePath
// Reuso spec-04 (no se redefinen aquí):
// cambiarPassword(sesionId, input) — RF-10/E-09; cerrarSesion(sesionId) → redirect /login — RF-06
```

Tablas Supabase afectadas: **0**. Esta spec no lee/escribe BD (RF-08 prohíbe BD en `/normas`; prefs van en cookies). La distinción `manager|admin` para la nav reutiliza la sesión ya validada por `src/proxy.ts` + `guardas.ts` de spec-04. RLS `DENY ALL anon` intacto, `service_role` no se toca.

## 6. Claves i18n nuevas para `es/strings.json`

Todo visible vía `traducir()`; prohibido literal en JSX. Números como `{var}` desde `src/lib/scoring/constantes.ts` (`BONUS_POSICION`, `BONUS_MVP`, `PENALIZACION_POR_EXPULSADO`, `FACTOR_CAPITAN_NUM/DEN`, `HORAS_CIERRE`, `PENALIZACION_SIN_QUINTETO`, zona `Europe/Madrid` como `{zona}`).

* `ui.shell.contenedor_desc` (aria-label, sin vars), `ui.shell.volver` ("Volver")
* `ui.nav.home`, `ui.nav.equipo`, `ui.nav.resultados`, `ui.nav.clasificacion`, `ui.nav.ajustes`, `ui.nav.admin`, `ui.nav.jugadores`, `ui.nav.normas`
* `ui.ajustes.titulo`, `ui.ajustes.normas` ("Normas del juego"), `ui.ajustes.modo_pete`, `ui.ajustes.modo_pete_on/off`, `ui.ajustes.tema`, `ui.ajustes.tema_claro/oscuro`, `ui.ajustes.cambiar_password`, `ui.ajustes.idioma` (`"Idioma: {idioma}"` con `{idioma}="ES"`), `ui.ajustes.cerrar_sesion`
* `ui.normas.titulo`, `ui.normas.fuente`, `ui.normas.nota_pete` (aviso reglas inmutables, RF-10)
* `ui.normas.cierre_titulo/texto` (`{horas}`=`HORAS_CIERRE`, `{zona}`), `ui.normas.base_titulo/texto`, `ui.normas.entrenadores_titulo/texto` (`{factorNum}/{factorDen}`, `{ejBase13}→{ejCapitan20}`), `ui.normas.posicion_titulo/texto` (`{bonus}`=`BONUS_POSICION`), `ui.normas.racha_titulo/texto` (`{n}` generado), `ui.normas.mvp_titulo/texto` (`{bonus}`=`BONUS_MVP`), `ui.normas.expulsion_titulo/texto` (`{penalizacion}`), `ui.normas.orden_titulo/texto` (describe orden sin recalcular)
* Reuso sin duplicar: `errors.auth.*` (E-09), `errors.close.passed`.

Prohibido en 05: cualquier literal numérico de regla en JSX o en el JSON (RF-09). El test anti-literal lo verifica.

## 7. Estrategia de tests en Vitest

Entorno `node` (puras + anti-literal por lectura de ficheros, sin jsdom; sin mocks de BD/fetch/reloj salvo `ahora` inyectado donde aplique).

* `cookies.test.ts`: ausente/corrupta → `'0'`/`'dark'` (E-06); `'1'`/`'light'` se preservan; `leerPreferencias` con header `modo_pete=1; tema=light` y con basura.
* `navegacion.test.ts`: tabla `manager→[Home,Equipo,Resultados,Clasificación,Ajustes]`, `admin→[Admin,Clasificación,Jugadores,Normas,Ajustes]` (RF-02); `debeMostrarNav` false en `/login,/registro,/cambiar-password,/onboarding` y en `/normas` sin sesión o con temporal (E-07); true en `/ajustes` con sesión completa (E-08).
* `normas.test.ts`: `ORDEN_BLOQUES` = orden RF-06/RF-13-spec-02; `anclaDe` cubre las 8; ancla inexistente no rompe (E-03, test de que el router ignora hash desconocido y muestra los 8).
* `normas-vars.test.ts` (clave DoD): lee `es/strings.json` + `src/app/normas/*.tsx` y falla si aparece literal `+5|−N|+3|−5|x1.5|−3h|−10` fuera de `{var}` o si falta importar `constantes.ts` (RF-09); falla si `constantes.ts` no exporta lo usado (E-01, compilación).
* Coherencia motor (E-05): `calcularJugador({valoracion 13, capitán, Maider})→20`, `{0 + Páter}→2`, desglose `12+5−1=16` contra funciones puras de `scoring`; `penalizacionPara(1..4)→[0,−1,−2,−3]` (E-04).
* Pete cosmético (RF-10): test de que `ejemplo-pete.tsx` contiene el aviso de inmutabilidad y nunca importa `calcularJornada` para decidir.
* Puerta: `npx tsc --noEmit` 0 errores, cero `any`, `npm run lint` 0 warnings, `npm test` verde + 100% en `src/lib/preferencias/**`, `npm run build` verde con `/normas` prerenderizada (`cacheComponents:true`).

## 8. Trazabilidad requisito → plan

* RF-01 shell 360–430/safe-areas/44px/sin hover → §2 D-07 + §3 `mobile-shell.tsx`/`globals.css`/`layout.tsx` + §7 `navegacion.test` (revisión manual `break-ui` en build).
* RF-02 nav por rol + oculta → §1 `ItemNav` + §3 `bottom-nav.tsx`/`layout.tsx` + §5 `itemsNavPara/debeMostrarNav` + §7 `navegacion.test`.
* RF-03 Pete cookie cosmético → §1 `ModoPete` + §2 D-01/D-02 + §3 `cookies.ts`/`esquemas.ts`/`actions.ts`/`interruptores.tsx` + §5 `parsearModoPete/establecerModoPete` + §7 `cookies.test`.
* RF-04 Tema cookie sin flash + `cacheComponents` → §2 D-03/D-04 + §3 `theme-script.tsx`/`layout.tsx sin cookies() arriba` + §5 `parsearTema/establecerTema` + §7 `cookies.test` + `build` verde.
* RF-05 `/ajustes` 6 filas → §3 `ajustes/page+actions+interruptores+cambiar-password` + §5 reuso spec-04 + §6 `ui.ajustes.*` + §7 E-09.
* RF-06 `/normas` 8 bloques fijos → §1 `BloqueNormas` + §3 `normas/page+bloque` + §5 `ORDEN_BLOQUES` + §7 `normas.test`.
* RF-07 accesos transversales → §3 (esta spec solo crea los destinos `#...`; los enlaces los añaden spec-04/06/07/08) + §6 anclas.
* RF-08 lectura pura estática → §2 D-06/D-04 + §3 `force-static` + §5 cero BD + §7 `build` prerender.
* RF-09 cero hardcode + `{var}` desde motor → §4 sobrecarga `traducir` + §3 `bloque.tsx` + §6 claves + §7 `normas-vars.test`.
* RF-10 Pete cosmético en normas → §2 D-11 + §3 `ejemplo-pete.tsx` + §6 `nota_pete` + §7 test aviso.
* RF-11 coherencia automática → §2 D-10/D-11 + §7 test E-05 (cambio en constantes → test falla primero).
