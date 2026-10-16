# 00 — Fundación JS + i18n

## 1. Objetivo y contexto

**Objetivo:** dejar una base JS funcional y verificable sobre la que los agentes puedan construir con Spec Driven Development, sin TypeScript y sin Vitest en esta fase.

**Contexto:**

- El repo hoy es un scaffold JS de Next.js 16.4 + Tailwind v4 con `app/layout.js` y `app/page.js` demo, `jsconfig.json` con alias `@/*` y `next.config.mjs` con `cacheComponents` y `partialPrefetching`.
- `CONSTITUTION.md §1/§10` y `AGENTS.md` exigen TypeScript `strict`, cero `any` y puerta `tsc --noEmit`. Por decisión explícita del usuario para v1, esta spec **deroga temporalmente** esa exigencia: el proyecto sigue en **JS puro**, sin `tsconfig`, sin migración a `src/app/*.tsx` y sin `tsc` en la puerta de calidad. La derogación queda registrada aquí para que futuros agentes no la reintroduzcan en silencio.
- `README.md §7` exige cero hardcode: toda cadena visible debe resolverse desde `es/strings.json` con claves jerárquicas (ej. `ui.home.countdown = "Cierre en {time}"`), pensado para escalar a `eu.json`. Hoy ese requisito es ambiguo en JS sin tipos, con interpolación sin definir y sin comportamiento de error definido. Esta spec lo cierra.
- **Por qué app/ en raíz + solo `src/lib/i18n/`:** se evita el churn de mover el App Router a `src/app/` y se fija la única estructura nueva necesaria para esta fundación. `scoring`, `dominio` y `supabase` los crearán sus specs propias, no esta.
- **Por qué Vitest queda fuera:** para mantener esta fundación pequeña y verificable con `lint + build`. La infra de tests la aportará la spec del motor §0.
- **Por qué loader con parámetro de locale desde ya:** v1 solo incluye `es`, pero no se quiere cambiar firmas/comportamiento cuando llegue `eu.json`.

## 2. Requisitos funcionales (EARS)

- **RF-01 — Estructura base JS conservada:**
  Cuando se aplique la fundación, el sistema deberá mantener `app/` en la raíz del proyecto con `jsconfig.json` y alias `@/*`, y deberá proveer el diccionario `es/strings.json` junto al módulo `src/lib/i18n/` como única novedad bajo `src/`.

- **RF-02 — Diccionario mínimo inicial:**
  Cuando la fundación esté completa, el sistema deberá incluir en `es/strings.json` al menos la clave `ui.home.countdown` con una variable de interpolación `{time}` y la clave `errors.close.passed`, además de un ejemplo adicional con variable para demostrar la sustitución.

- **RF-03 — Resolución por clave jerárquica:**
  Cuando se solicite un texto mediante su clave jerárquica, el sistema deberá devolver el valor correspondiente del diccionario del locale solicitado.

- **RF-04 — Locale como parámetro desde v1:**
  Cuando se solicite un texto, el sistema deberá resolverlo a partir del locale indicado en la solicitud, de modo que añadir un nuevo diccionario (ej. `eu.json`) no cambie el modo de petición. Si el locale solicitado no dispone de diccionario en v1, entonces el sistema deberá tratarlo como error de fundación según §3.

- **RF-05 — Interpolación simple:**
  Cuando el valor del diccionario contenga variables con forma `{nombre}`, el sistema deberá sustituir cada una por el parámetro aportado con el mismo nombre. Si el valor no contiene variables, entonces el sistema deberá devolverlo tal cual sin exigir parámetros.

- **RF-06 — Parámetro de interpolación ausente:**
  Si se solicita una clave cuyo valor declara una variable `{nombre}` y no se aporta dicho parámetro, entonces el sistema deberá señalar un error visible en desarrollo según §3 y no devolver una frase silenciosamente incompleta.

- **RF-07 — Clave inexistente (modo estricto):**
  Si se solicita una clave que no existe en el diccionario del locale, entonces el sistema deberá señalar un error visible en desarrollo y devolver la propia clave como fallback, sin romper el renderizado en producción.

- **RF-08 — Diccionario roto bloquea la base:**
  Si `es/strings.json` falta o no es un JSON válido, entonces el sistema deberá fallar de forma visible e impedir considerar la fundación como completa (ver DoD), en lugar de arrancar con un diccionario vacío silencioso.

- **RF-09 — Prohibición de concatenar frases:**
  Cuando un texto necesite una variable, el sistema deberá exigir que la frase completa con su `{var}` viva en el diccionario. Si un desarrollo intenta componer frases visibles mediante concatenación o plantillas fuera del diccionario, entonces se considerará incumplimiento de esta spec aunque `lint` no lo detecte automáticamente.

- **RF-10 — Permanencia en JS:**
  Cuando se verifique la fundación, el sistema deberá seguir sin `tsconfig.json`, sin archivos `.ts/.tsx` propios y sin exigir `tsc --noEmit`. Si aparece tooling TypeScript, entonces quedará fuera de lo especificado en esta 00.

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | Clave inexistente | Error visible en desarrollo + devolución de la clave como fallback; en producción no rompe el render | Hacer cumplir el cero-hardcode desde ya sin tumbar la app en prod |
| E-02 | Variable `{nombre}` declarada pero parámetro no aportado | Error visible en desarrollo; no se permite devolver `Cierre en {time}` sin sustituir | Evita frases a medio interpolar, ambigüedad actual del README |
| E-03 | Parámetro extra aportado que el valor no declara | Se ignora sin error | Permite reutilizar llamadas sin acoplarlas al texto exacto |
| E-04 | Valor del diccionario no es string (número, objeto, null) | Se trata como clave malformada: error visible en desarrollo + fallback a la clave | El diccionario v1 solo admite strings; lo demás es error de contenido |
| E-05 | `es/strings.json` ausente | Fallo visible que impide dar la fundación por hecha | Sin diccionario no hay garantía de cero-hardcode |
| E-06 | `es/strings.json` con JSON inválido o codificación ilegible | Fallo visible que impide dar la fundación por hecha | Misma razón que E-05; no se permite degradado silencioso |
| E-07 | Claves duplicadas / colisión por normalización (ej. distinta caja) | Gana el comportamiento del parseo JSON estándar; la spec no exige detección propia | JSON no permite expresar duplicados de forma fiable; no se añade maquinaria en 00 |
| E-08 | Locale solicitado sin diccionario (ej. `eu` en v1) | Error visible en desarrollo + fallback al diccionario `es` si es posible | Prepara el camino a `eu.json` sin hardcodear `es` por dentro |
| E-09 | Variable malformada en el diccionario (ej. `{time`, `{}`) | Se trata como texto literal, no como variable; no se exige error | Alcance mínimo: solo `{nombre}` válido interpola |
| E-10 | Intento de plural/género/fecha localizada | Fuera de alcance: no se exige en 00; si aparece, se formula como frase completa en `es` | README no lo pide en v1; ICU quedaría sobredimensionado |
| E-11 | Texto con HTML o JSX embebido en el diccionario | Fuera de alcance: el diccionario solo aporta texto plano con `{var}` | Evita inyección y acoplamiento vista-diccionario en la base |
| E-12 | Concatenación manual para formar frases | Incumplimiento de RF-09 por revisión manual, aunque `lint` pase | No hay lint automático en 00 por decisión de alcance |

## 4. Fuera de alcance explícito

- Migración a TypeScript, `tsconfig`, tipos generados desde JSON, `tsc --noEmit`, cero `any`.
- Vitest, `npm test`, umbrales de cobertura y tests del motor §0, de rachas, de cierre o de alineación (lo aportará la spec del motor/dominio).
- Motor de puntuación §0 (BASE, Maider ×1.5, suelo Páter, +5 posición, −N racha, +3 MVP, −5 expulsión) y su tabla de repetición.
- Cálculo de cierre (`hora_partido − 3h`), validación servidor y cuenta atrás del Home.
- Módulos `src/lib/scoring/`, `src/lib/dominio/`, `src/lib/supabase/` (ni placeholders en esta 00).
- Supabase (tablas, RLS, `service_role`, Storage), Auth (`username` case-insensitive, hash, sesión httpOnly, rate-limit, reset vía Admin).
- Contenido completo del diccionario (auth, equipo, ficha, jornada, clasificación, ajustes, admin); solo el mínimo de RF-02.
- `eu.json` u otro locale con contenido; solo se exige la preparación del parámetro de locale.
- Plurales/género ICU, formato de fechas/números, HTML en diccionario.
- Regla ESLint automática anti-literales en JSX; en 00 la garantía es norma + revisión manual.
- Modo Pete (`img↔imgPete`, `nombre↔nombrePete`), tema claro/oscuro, fondo de pista, móvil 360–430px, tap-to-select, PWA.
- Notificaciones, email, multi-liga, chat, escritorio, app nativa, scraping FNB, formulario manual Admin.

## 5. Criterios de finalización (Definition of Done)

- [ ] Existe `es/strings.json` válido con al menos `ui.home.countdown` (con `{time}`), `errors.close.passed` y un ejemplo con variable.
- [ ] Existe `src/lib/i18n/` como único módulo nuevo bajo `src/` y `app/` sigue en la raíz con `jsconfig.json` y alias `@/*`.
- [ ] Solicitar un texto por clave jerárquica devuelve el valor del diccionario del locale pedido.
- [ ] Solicitar con locale `es` funciona; solicitar un locale sin diccionario produce error visible en desarrollo y fallback a `es` si es posible.
- [ ] Interpolar `{time}` (y el ejemplo) con parámetros correctos devuelve la frase sustituida.
- [ ] Clave inexistente produce error visible en desarrollo y devuelve la clave, sin romper el render en producción.
- [ ] Variable declarada sin parámetro produce error visible en desarrollo.
- [ ] Con `es/strings.json` ausente o inválido, `npm run build` no se considera verde.
- [ ] `npm run lint` termina con 0 warnings.
- [ ] `npm run build` termina en verde.
- [ ] No se introduce `tsconfig.json`, archivos `.ts/.tsx` propios ni script/exigencia de `tsc --noEmit`; no se introduce Vitest ni `npm test` en esta 00.
- [ ] Ninguna pantalla nueva ni cambio visual es exigible en esta 00 más allá de lo necesario para verificar lo anterior.
