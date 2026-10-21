# Tasks — 01 Fundación TS + Vitest + src completo

Fuente: `spec.md` + `plan.md` (D-01–D-14). Orden TDD: test primero, luego código.

- [x] **T-01 — Infra TS + Vitest + lint base**
  Cubre: RF-01, RF-03, RF-04, RF-05.
  Hacer: `tsconfig.json` (D-04), `vitest.config.ts` (D-08), `package.json` scripts `test/test:coverage` + devDeps sin `zod`/`@supabase/*`, `eslint.config.mjs` + `no-explicit-any:error`.
  Hecho cuando: `npx tsc --noEmit` no falla por config; `npm test` encuentra Vitest (aunque falle por falta de tests); `npm run lint` 0 warnings en config.
  Verifica: `npx tsc --noEmit`, `npm run lint`, `npx vitest --version`.

- [x] **T-02 — Tests i18n (red)**
  Cubre: RF-07/E-03, RF-08/E-04, RF-09/E-07, RF-10/E-05/E-06, RF-04.
  Hacer: `src/lib/i18n/traducir.test.ts` (interpolación `{time}/{nombre}`, clave dinámica → devuelve clave, valor no-string → throw, `{malformada` literal, extra ignorado, faltante → `console.error` + devuelve clave) + `src/lib/i18n/diccionario.test.ts` (`es` resuelve, `eu` fallback `es`, ausente/inválido lanza) + `@ts-expect-error` clave inexistente / `{var}` faltante / sobrante.
  Hecho cuando: suite en rojo por módulos `i18n` inexistentes.
  Verifica: `npm test -- src/lib/i18n` en rojo.

- [x] **T-03 — `es/strings.json` mínimo**
  Cubre: RF-10.
  Hacer: crear `es/strings.json` con solo `ui.home.countdown="Cierre en {time}"`, `errors.close.passed="Cierre pasado"`, `ui.ejemplo.saludo="Hola, {nombre}"`. Sin `ui.normas.*`, sin `errors.calculo.*`.
  Hecho cuando: `cat es/strings.json` contiene exactamente las 3 claves y `npx tsc --noEmit` puede resolver `@/es/strings.json`.
  Verifica: `npm test -- src/lib/i18n/diccionario.test.ts` deja de fallar por E-06.

- [x] **T-04 — Implementar `src/lib/i18n/`**
  Cubre: RF-07, RF-08, RF-09, RF-03.
  Hacer: `tipos.ts` (`Locale, LocaleSolicitado, Diccionario, ClaveI18n, VarsDe`), `diccionario.ts` (`cargarDiccionario`: `eu` → `console.error` + fallback `es`, nunca `throw` en dinámica), `traducir.ts` (sobrecargas estática + dinámica `unknown+narrowing`, E-03/E-04/E-05), `index.ts`.
  Hecho cuando: T-02 en verde + `100%` en `traducir.ts` + `diccionario.ts`.
  Verifica: `npm test -- src/lib/i18n`, `npm run test:coverage`, `npx tsc --noEmit`.

- [x] **T-05 — Tests placeholders `never` (red)**
  Cubre: RF-06/E-10, RF-04.
  Hacer: `scoring/contratos.test.ts`, `dominio/contratos.test.ts`, `supabase/cliente.test.ts`, `fnb/contratos.test.ts` con `expect(()=>...).toThrow(/spec-0/)` + `expectTypeOf`.
  Hecho cuando: en rojo por módulos inexistentes.
  Verifica: `npm test -- src/lib/scoring src/lib/dominio src/lib/supabase src/lib/fnb` en rojo.

- [x] **T-06 — Implementar placeholders tipados**
  Cubre: RF-06.
  Hacer: `scoring/tipos+contratos+index`, `dominio/tipos+contratos+index` (`calcularCierre/validarQuinteto:never`), `supabase/tipos+cliente+index`, `fnb/tipos+contratos+index` (`(...:unknown[]):never`, `throw 'no implementado — spec-02/03/10'`). Prohibido `Jugador/Jornada/Posicion/EstadoJornada`.
  Hecho cuando: T-05 en verde, sin lógica real (revisión manual E-10).
  Verifica: `npm test -- src/lib/scoring src/lib/dominio src/lib/supabase src/lib/fnb`.

- [x] **T-07 — App Router + estáticos**
  Cubre: RF-02, RF-06, RF-10.
  Hacer: mover `app/*` → `src/app/*.tsx` (`layout.tsx` con `lang="es"`, `page.tsx` usa `traducir('es','ui.home.countdown',{time})`, `globals.css/favicon.ico` sin cambios), eliminar `app/` raíz + `jsconfig.json`, crear `public/players/placeholder.webp` + `placeholder-pete.webp` 1px. No crear `proxy.ts` ni `normas/*`.
  Hecho cuando: no queda `.js` propio ni `app/` raíz; `public/coaches/*.webp` intactos.
  Verifica: `ls app` falla + `ls src/app` ok; `npm run build` pasa.

- [x] **T-08 — Puerta de calidad final**
  Cubre: DoD spec §5 (RF-01–RF-10, E-01–E-09).
  Hacer: pasar puerta completa, verificar E-11/E-12 por revisión manual (sin plurales/concatenación).
  Hecho cuando: `npx tsc --noEmit` 0 errores, `npm run lint` 0 warnings, `npm test` verde, cobertura cumple D-08 (`90/90/80` + `100% i18n`), `npm run build` verde, cero `any` (`grep -r "any"` vacío en `src/`+`es/`).
  Verifica: `npx tsc --noEmit && npm run lint && npm run test:coverage && npm run build`.
