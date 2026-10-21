# Plan técnico — 01 Fundación TS + Vitest + src completo

Fuente: `specs/01-fundacion-ts-vitest-src/spec.md` + `CONSTITUTION.md` + `AGENTS.md`.
Alcance: solo diseño. No incluye código de producción. La lógica real de motor/dominio/supabase la aportan sus specs.

## 1. Modelos de datos

En esta 01 no hay modelo relacional. Cero tablas Supabase, cero migraciones, cero RLS.

Único modelo real: i18n.

- `Locale = 'es'` en v1. Se pide siempre como parámetro (`LocaleSolicitado = string` solo en la sobrecarga dinámica) para no cambiar firmas al llegar `eu.json`. Cubre **RF-09**.
- `Diccionario`: objeto jerárquico recursivo `{ readonly [k: string]: string | Diccionario }`. Solo hojas `string`. Valor no-string = error de contenido lanzado (no se silencia). Cubre **RF-10 / E-05**.
- `ClaveI18n`: unión de rutas con puntos (`ui.home.countdown`) derivada del JSON con `as const` vía `Paths<typeof es>`. Clave inexistente referenciada estáticamente = fallo de compilación. Cubre **RF-07 / E-03**.
- `VarsDe<K>`: unión de `{nombres}` extraída por tipo template-literal desde el valor de cada clave. Cubre **RF-08 / E-04**.
- `Params<K> = Record<VarsDe<K>, string | number>`. Sin `any`; entradas externas como `unknown` + narrowing. Cubre **RF-03**.

Placeholders `scoring / dominio / supabase / fnb`: solo marcas opacas sin campos (p. ej. `string & { readonly __marca: 'pendiente-spec-02' }`). Prohibido definir aquí `Jugador`, `Jornada`, `Quinteto`, `valoracionFNB`, `Posicion`, `EstadoJornada`, posiciones o cierre: lo define la spec-02. Evita **E-10**.

## 2. Decisiones justificadas

| # | Decisión | Elegida | Alternativa descartada | Justificación |
|---|---|---|---|---|
| D-01 | Migración | Total, `allowJs: false`, borrar `jsconfig.json` | Convivencia JS+TS con `allowJs` | RF-01 y E-01 exigen migración total; la convivencia perpetúa deuda y ambigüedad de puerta |
| D-02 | App Router | Mover `app/*.js` → `src/app/*.tsx` y eliminar `app/` raíz | Quedarse en `app/` raíz | Estructura objetivo de AGENTS.md: tras 01 → `src/app/*.tsx`; RF-02 exige tipar `layout/page`. Si queda `app/` raíz, Next ignora `src/app/` |
| D-03 | Qué cuenta como `.js` propio | Solo `src/**` + `es/**`; se conservan `*.mjs` de config | Borrar también `next.config.mjs` / `eslint.config.mjs` | E-01 habla de `.js` propios; los `mjs` de config no son código propio y Next/ESLint los esperan. `next-env.d.ts` generado se ignora, no se borra |
| D-04 | `tsconfig` | `strict:true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitReturns` + `resolveJsonModule` + `moduleResolution:bundler` + `jsx:preserve` + `plugins:[next]` + `paths @/*→./*` + `include:[src,es]` + `exclude:[.next,coverage]` | `strict` mínimo | RF-03 (cero `any` implícito) necesita `noUncheckedIndexedAccess`; alias `@/*` hereda `jsconfig.json`; `resolveJsonModule+bundler` permite derivar `ClaveI18n` del JSON; base Next evita romper `cacheComponents:true` y Turbopack |
| D-05 | i18n con chequeo en compilación | `import json as const` + tipos `Paths<>` + `ExtractVars<>` + sobrecargas de `traducir` | `next-intl`, codegen dedicado, o solo runtime | Sin dependencia nueva, cumple RF-07/RF-08 en `tsc`; `next-intl` sobredimensiona v1 solo-`es`; solo-runtime no impide compilar |
| D-06 | Locale sin diccionario (E-07) | Referencia estática inexistente = error `tsc`; petición dinámica con `string` = `console.error` en dev + fallback `es`, nunca `throw` en render | Hardcodear `es` dentro o lanzar siempre | Es lo que exige E-07 literalmente; `throw` en dinámica tumbaría el Server Component. Prepara `eu.json` sin cambiar firmas |
| D-07 | Tests | Vitest + `@vitest/coverage-v8`, `environment: 'node'` | Jest, `node:test`, jsdom | Constitución §6 y AGENTS exigen Vitest; fundación es pura + Server Components, no necesita DOM |
| D-08 | Umbral cobertura | `lines 90%, functions 90%, branches 80%` en `src/lib/**` + `100%` solo en `src/lib/i18n/traducir.ts` y `diccionario.ts` como red provisional | Sin umbral o 100% global | RF-05 dice “umbral definido” sin cifra: sin umbral viola RF-05/E-09. 100% global bloquearía los placeholders `never` de spec-02. Constitución §6 exige 100% solo para motor/posiciones/rachas (dueña spec-02); el 100% en i18n es red local, no anticipa el 100% motor |
| D-09 | Zod | No añadir en 01 | Añadir `zod` ya | §4 fuera de alcance: sin formularios ni Server Actions con input en 01; sería dependencia muerta. Zod entra en spec-02 (borde validación) y specs con Server Actions |
| D-10 | Supabase | Placeholder sin instalar `@supabase/*` | Instalar cliente ya | Tablas/RLS/Auth fuera de alcance §4; instalar ahora acopla versión sin uso |
| D-11 | Lint `any` | Añadir `typescript-eslint` + `no-explicit-any: error`; ignorar `.next/coverage` | Solo `tsc` | `tsc` solo no caza todo `any` explícito; la puerta AGENTS exige cero `any` también en `lint` |
| D-12 | Placeholders que compilan | Funciones `(...args: unknown[]): never` que lanzan `Error('no implementado — spec-02/10')` dev-only, sin i18n | Retornar dummies `0/null` | Un dummy es lógica falsa y viola E-10; `never` compila, se testea con `toThrow` y no contamina. Mensaje dev-only, no es cadena UI (no aplica cero-hardcode) |
| D-13 | `src/proxy.ts` | No crear en 01 | Crear vacío ya | Estructura AGENTS lo lista, pero guardas + sliding cookie son dueñas de spec-04 (Auth). Crear vacío adelanta Auth fuera de alcance |
| D-14 | Layout mínimo | `lang="es"` + `Metadata` mínima, sin shell 360–430 ni viewport custom; skill `mobile-native` cargada solo para verificar que no se rompe móvil | Implementar shell/viewport/tema/Pete ahora | Shell, nav inferior, Pete/tema son spec-05; 01 solo tipa `layout/page` (RF-02). `src/app/page.tsx` es estático sin fetch, compatible con `cacheComponents:true` |

## 3. Archivos exactos a crear / modificar / eliminar

Respetando estructura objetivo de AGENTS.md. No se crea `app/normas/*` (spec-05), ni `eu.json`, ni `src/proxy.ts` (spec-04, ver D-13).

### Eliminar (RF-01)
- `jsconfig.json`
- `app/layout.js`, `app/page.js`, `app/globals.css`, `app/favicon.ico` y el directorio raíz `app/` completo (tras mover a `src/app/`; no dejar `app/` en la raíz para evitar que Next.js ignore `src/app/`)

### Crear
- `tsconfig.json` — única config TS según D-04, alias `@/*` → `./*`. **Cubre RF-01.**
- `vitest.config.ts` — alias `@`, `include: src/**/*.test.ts(x)`, `exclude: config/tests`, cobertura v8 con umbrales D-08. **Cubre RF-04/RF-05.**
- `src/app/layout.tsx` — `RootLayout({ children: React.ReactNode })`, `Metadata`, `lang="es"`. **Cubre RF-02.**
- `src/app/page.tsx` — Server Component mínimo que usa `traducir('es', 'ui.home.countdown', { time })`. Estático, sin fetch. **Cubre RF-02 + RF-10.**
- `src/app/globals.css` y `src/app/favicon.ico` — movidos desde `app/` sin cambios visuales.
- `public/players/placeholder.webp` y `public/players/placeholder-pete.webp` — placeholders `webp` 1px válidos temporales requeridos por `spec-03`/`07`/`09`. No tocar `public/coaches/maider.webp` y `pater.webp` ya existentes. **Cubre RF-06.**
- `es/strings.json` — mínimo RF-10 (ver §6).
- `src/lib/i18n/tipos.ts` — `Locale, LocaleSolicitado, Diccionario, ClaveI18n, VarsDe`. **RF-07/RF-08/RF-09.**
- `src/lib/i18n/diccionario.ts` — `cargarDiccionario`. **RF-09.**
- `src/lib/i18n/traducir.ts` — `traducir` sobrecargado tipado. **RF-07/RF-08.**
- `src/lib/i18n/index.ts` — único punto de importación.
- `src/lib/scoring/tipos.ts`, `contratos.ts`, `index.ts` — tipos opacos + firmas `never`. **RF-06.**
- `src/lib/dominio/tipos.ts`, `contratos.ts`, `index.ts` — firmas `calcularCierre`, `validarQuinteto` como `never`. **RF-06.**
- `src/lib/supabase/tipos.ts`, `cliente.ts`, `index.ts` — `crearClienteSupabase(): never`. **RF-06.**
- `src/lib/fnb/tipos.ts`, `contratos.ts`, `index.ts` — `sincronizarCalendarioFNB(): never`, `sincronizarResultadosFNB(): never`. **RF-06.**
- Tests (al menos uno por módulo, **RF-04**):
  - `src/lib/i18n/traducir.test.ts`
  - `src/lib/i18n/diccionario.test.ts`
  - `src/lib/scoring/contratos.test.ts`
  - `src/lib/dominio/contratos.test.ts`
  - `src/lib/supabase/cliente.test.ts`
  - `src/lib/fnb/contratos.test.ts`
  - Asserts de tipos con `expectTypeOf` + `@ts-expect-error` para RF-07/RF-08 (pueden vivir dentro de los `.test.ts` anteriores).

No crear en 01: `src/lib/scoring/constantes.ts` (la crea spec-02 como única fuente de números para `/normas`), `eu.json`, `src/proxy.ts`, migraciones SQL, Server Actions.

### Modificar
- `package.json` — scripts `test: vitest run` / `test:coverage: vitest run --coverage`; `devDeps`: `typescript, vitest, @vitest/coverage-v8, @types/node, @types/react, @types/react-dom, typescript-eslint`. No `zod`, no `@supabase/*`.
- `eslint.config.mjs` — añadir preset TS + `no-explicit-any: error`; ignorar `.next/coverage`.
- `next.config.mjs` — sin cambios salvo que `lint/build` lo exija.

## 4. Tipos de dominio en TypeScript strict y esquemas Zod

Diseño (no implementación):

```ts
// src/lib/i18n/tipos.ts
import es from '@/es/strings.json';
export type Locale = 'es';
export type LocaleSolicitado = string;
export type Diccionario = { readonly [k: string]: string | Diccionario };
type Paths<T> = ...; // 'ui.home.countdown' | 'errors.close.passed' | 'ui.ejemplo.saludo'
export type ClaveI18n = Paths<typeof es>;
type ExtractVars<S extends string> = ...; // unión de nombres en {nombre}
export type VarsDe<K extends ClaveI18n> = ExtractVars<ValorEn<K>>;
```

```ts
// src/lib/i18n/traducir.ts
export function traducir<K extends ClaveI18n>(
  locale: Locale,
  clave: K,
  ...args: [VarsDe<K>] extends [never] ? [] : [params: Record<VarsDe<K>, string | number>]
): string;
export function traducir(locale: string, clave: string, params?: Record<string, unknown>): string;
```

La primera sobrecarga da error `tsc` si la clave no existe (E-03) o si falta/sobra `{var}` (E-04). La segunda cubre la petición dinámica E-07 con `unknown` + narrowing (cero `any`, RF-03).

**Zod: no aplica en 01.** No hay formularios, Server Actions con input ni tablas. La validación de `es/strings.json` ausente/inválido (E-06) se resuelve con `import` estático (JSON inválido rompe `build` solo) + `throw` visible en `cargarDiccionario` si falta `es`, no con un esquema. Ver D-09.

## 5. Contratos de funciones puras / Server Actions / tablas Supabase

### Funciones puras i18n (únicas reales)
1. `cargarDiccionario(locale: string): Diccionario` — devuelve el diccionario del locale; si no existe (p. ej. `eu` en v1), `console.error` en dev + fallback a `es`. Si `es/strings.json` falta o es JSON inválido, lanza fallo visible que impide dar la fundación por completa (E-06 impide `build` verde). **Cubre RF-09 / E-06 / E-07.**
2. `traducir(locale, clave, params?)` — resuelve clave jerárquica, sustituye solo `{nombre}` válido, trata valor no-string como error de contenido con `throw` (E-05) y `{malformada` como literal. En **llamada estática** (`ClaveI18n`), clave inexistente o `{var}` faltante/sobrante falla en compilación `tsc` (E-03, E-04). En **llamada dinámica** (`clave: string`), clave inexistente devuelve la clave + `console.error` en dev, `{var}` sin param hace `console.error` en dev y devuelve la clave (nunca frase incompleta) y param extra no declarado se ignora en runtime. Retorno siempre `string`, nunca `throw` en la rama dinámica para no tumbar el render. **Cubre RF-07 / RF-08.**

Ambas puras respecto a UI: sin `window`, sin fetch, sin BD.

### Placeholders tipados (sin lógica, E-10)
- `scoring.calcularPuntuacion(...args: unknown[]): never` — lanza `no implementado — spec-02`.
- `dominio.calcularCierre(horaPartido: unknown): never`, `dominio.validarQuinteto(quinteto: unknown): never` — lanzan `no implementado — spec-02`.
- `supabase.crearClienteSupabase(): never` — lanza `no implementado — spec-03`.
- `fnb.sincronizarCalendarioFNB(): never`, `fnb.sincronizarResultadosFNB(): never` — lanzan `no implementado — spec-10`.

### Server Actions
0 afectadas. Esta fundación no muta nada.

### Tablas Supabase
0 afectadas. Sin migraciones, sin RLS, sin `service_role`, sin Storage.

## 6. Claves i18n nuevas para `es/strings.json`

Mínimo inicial de la fundación (**RF-10**). Ninguna clave de pantallas futuras en 01:

- `ui.home.countdown="Cierre en {time}"` — con `{time}`.
- `errors.close.passed="Cierre pasado"` — sin variables. Namespace reservado: spec-02 añadirá `errors.close.missing_time/invalid_time` y `errors.calculo.*`/`errors.alineacion.*` sin renombrar esta clave.
- `ui.ejemplo.saludo="Hola, {nombre}"` — con `{nombre}`, ejemplo de sustitución.

Prohibido añadir en 01 claves de auth, equipo, ficha, jornada, clasificación, ajustes, admin o `ui.normas.*` (spec-05). Texto plano, sin HTML, sin plurales (E-11). Prohibida concatenación fuera del diccionario (E-12, revisión manual).

## 7. Estrategia de tests en Vitest

- `npm test` = `vitest run`; `test:coverage` = `vitest run --coverage`. Suite en verde exigida por **RF-04 / E-08**; cobertura bajo umbral = incompleta (**RF-05 / E-09**).
- `src/lib/i18n/traducir.test.ts`: interpolación `{time}`/`{nombre}`, clave inexistente dinámica devuelve la clave + avisa, valor no-string lanza (E-05), `{malformada` literal, param extra en llamada dinámica (`string`) ignorado en runtime, variable faltante hace `console.error` y devuelve la clave sin frase incompleta.
- `src/lib/i18n/diccionario.test.ts`: `es` resuelve, locale sin diccionario avisa y usa `es` (E-07), fixture con JSON ausente/inválido lanza (E-06).
- `contratos.test.ts` de `scoring/dominio/supabase/fnb`: `expect(() => ...).toThrow(/spec-0/)` + `expectTypeOf` de que la firma compila.
- Tipos en compilación (**RF-07/RF-08**): casos `@ts-expect-error` para clave inexistente, `{var}` faltante y param sobrante. Si compilan sin error, el test de tipos falla.
- Puerta final: `npx tsc --noEmit` 0 errores, cero `any`, `npm run lint` 0 warnings, `npm test` verde + umbral D-08, `npm run build` verde. Los tests de 01 cubren solo fundación; el 100% motor/posiciones/rachas y los mínimos de cierre/validación son puerta de spec-02 (`AGENTS.md` puerta de calidad).

## 8. Trazabilidad requisito → plan

- RF-01 migración total → §2 D-01/D-03 + §3 eliminar/crear `tsconfig`.
- RF-02 App tipado → §2 D-02/D-14 + §3 `src/app/*.tsx`.
- RF-03 prohibición `any` → §2 D-04/D-11 + §4 `unknown` + narrowing.
- RF-04 suite verde → §3 tests + §7.
- RF-05 cobertura → §2 D-08 + §7.
- RF-06 estructura `src/lib/` con contratos → §3 crear + §5 placeholders.
- RF-07 clave en compilación → §4 `ClaveI18n` + §5.1 + §7 `@ts-expect-error`.
- RF-08 `{var}` tipadas → §4 `VarsDe/Params` + §5.2 + §7.
- RF-09 locale param → §2 D-06 + §4 `LocaleSolicitado` + §5 `cargarDiccionario`.
- RF-10 mínimo preservado → §6 tres claves + `page.tsx` las usa.
