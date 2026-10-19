# 01 — Fundación TS + Vitest + src completo

## 1. Objetivo y contexto

**Objetivo:** levantar directamente la fundación TypeScript `strict` con Vitest, motor i18n tipado (`es/strings.json`) y estructura `src/lib/` completa partiendo del scaffold inicial del repositorio.

**Contexto:**

- El repo hoy es un scaffold JS de Next.js 16.4 + Tailwind v4 con `app/layout.js` y `app/page.js` demo, `jsconfig.json` con alias `@/*` y `next.config.mjs` con `cacheComponents` y `partialPrefetching`.
- `CONSTITUTION.md §1/§6/§9/§10` y `AGENTS.md` exigen TypeScript `strict`, cero `any`, `tsc --noEmit`, `eslint`, `next build`, cero hardcode (`es/strings.json`) y Vitest con cobertura sobre motor §0, rachas y validaciones.
- **Por qué migración directa a TS (sin paso intermedio JS):** se evita crear módulos `.js` para borrarlos a continuación y se elimina la convivencia JS+TS (`allowJs`). Todo el código propio nace en TypeScript `strict` desde esta primera spec.
- **Por qué Vitest con cobertura desde ya:** sin umbral, la infra se degrada; con umbral, las siguientes specs (motor §0, dominio) heredan una red mínima exigible.
- **Por qué contratos placeholder tipados:** fija `scoring / dominio / supabase / fnb / i18n` para que los agentes no reinventen rutas ni firmas; la lógica real la aportan sus specs.
- **Por qué i18n con chequeo en compilación:** con TS la clave inexistente o el `{var}` faltante/sobrante debe impedir compilar en la sobrecarga estática, además de avisar en runtime si se invoca dinámicamente.

## 2. Requisitos funcionales (EARS)

- **RF-01 — Migración total a TS:**
  Cuando se aplique la fundación, el sistema deberá proveer todo el código propio en TypeScript `strict` sin archivos `.js` propios ni modo de compatibilidad JS, y deberá retirar `jsconfig.json` en favor de la configuración TS con alias `@/*`.

- **RF-02 — App Router tipado:**
  Cuando se compile el proyecto, el sistema deberá tipar las rutas `app/` existentes (layout, page) de modo que cualquier prop o metadata mal tipada impida la compilación.

- **RF-03 — Prohibición de `any`:**
  Cuando se verifique el código, el sistema deberá no contener ningún `any` explícito ni implícito; si se necesita un valor desconocido, entonces el sistema deberá exigir narrowing explícito.

- **RF-04 — Infra Vitest en verde:**
  Cuando se ejecute el comando de tests, el sistema deberá ejecutar la suite Vitest y terminar en verde con al menos un test ejemplo por módulo de fundación.

- **RF-05 — Cobertura exigible:**
  Cuando se ejecute la suite con medición de cobertura, el sistema deberá cumplir el umbral definido para los módulos de fundación; si no lo cumple, entonces la fundación no se considerará completa.

- **RF-06 — Estructura `src/lib/` completa con contratos y placeholders gráficos:**
  Cuando se aplique la fundación, el sistema deberá proveer los módulos `src/lib/scoring/`, `src/lib/dominio/`, `src/lib/supabase/`, `src/lib/fnb/` y `src/lib/i18n/` con contratos tipados que compilan, sin lógica de negocio real salvo `i18n`, además de los archivos estáticos `public/players/placeholder.webp` y `public/players/placeholder-pete.webp`.

- **RF-07 — i18n tipado con chequeo en compilación:**
  Cuando se solicite un texto mediante su clave, el sistema deberá verificar en compilación que la clave existe en el diccionario del locale. Si la clave no existe, entonces la compilación deberá fallar.

- **RF-08 — Variables `{var}` tipadas:**
  Cuando el valor del diccionario declare variables `{nombre}`, el sistema deberá exigir en compilación los parámetros con esos mismos nombres en llamadas estáticas (`ClaveI18n`), haciendo fallar `tsc` si falta un parámetro declarado o sobra uno no declarado. En llamadas dinámicas (`clave: string`), si falta un parámetro declarado deberá señalar error visible en desarrollo sin devolver una frase silenciosamente incompleta, y si sobra un parámetro extra no declarado lo ignorará en runtime sin error.

- **RF-09 — Locale preparado para `eu.json`:**
  Cuando se solicite un texto, el sistema deberá resolverlo a partir del locale indicado sin cambiar el modo de petición al añadir nuevos diccionarios. Si el locale no dispone de diccionario, entonces se aplicará lo definido en §3.

- **RF-10 — Diccionario mínimo inicial:**
  Cuando se complete la fundación, el sistema deberá proveer `es/strings.json` con al menos las claves `ui.home.countdown` (con `{time}`), `errors.close.passed` y `ui.ejemplo.saludo` (con `{nombre}`).

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | Queda algún `.js` propio o `jsconfig.json` | Incumplimiento de RF-01; no se da por completa | Migración total, sin convivencia |
| E-02 | `any` explícito o implícito | Fallo de verificación; exige `unknown` + narrowing | Puerta cero `any` de AGENTS |
| E-03 | Clave i18n inexistente | Fallo en compilación en llamada estática; en llamada dinámica (`string`), error visible en desarrollo + devuelve la propia clave como fallback | Cero-hardcode desde compilación sin tumbar el render dinámico |
| E-04 | `{var}` declarada sin parámetro, o parámetro no declarado | En llamada estática, fallo en compilación (`tsc`) tanto si falta como si sobra; en llamada dinámica (`string`), error visible en desarrollo si falta parámetro y se ignora en runtime si sobra | Evita frases incompletas y llamadas estáticas desacopladas |
| E-05 | Valor del diccionario no string | Error de contenido; impide dar por completa | El diccionario v1 solo admite strings |
| E-06 | `es/strings.json` ausente o JSON inválido | Fallo visible que impide completar la fundación | Sin diccionario no hay garantía de cero-hardcode |
| E-07 | Locale sin diccionario (ej. `eu` en v1) | Fallo en compilación si se referencia estáticamente; error visible + fallback a `es` si la petición es dinámica | Prepara `eu.json` sin hardcodear `es` |
| E-08 | Suite Vitest con algún test en rojo | Fundación incompleta aunque `build` pase | `npm test` verde es parte de la puerta |
| E-09 | Cobertura bajo umbral | Fundación incompleta aunque todo pase en verde | El umbral es la red mínima para motor/dominio |
| E-10 | Contratos placeholder con lógica de negocio real | Incumplimiento de alcance; la lógica la aportan sus specs | Esta 01 solo fija contratos que compilan |
| E-11 | Plural/género/fecha localizada | Fuera de alcance; se formula como frase completa en `es` | README no lo pide en v1 |
| E-12 | Concatenación manual de frases visibles | Incumplimiento por revisión manual aunque `tsc/lint` pasen | Toda frase con `{var}` debe vivir completa en `es/strings.json` |

## 4. Fuera de alcance explícito

- Lógica del motor §0 (BASE, Maider ×1.5, suelo Páter, +5 posición, −N racha, +3 MVP, −5 expulsión), tabla de repetición y desgloses de UI.
- Cálculo de cierre (`hora_partido − 3h`), validación en servidor y cuenta atrás.
- Validación de alineación (5 + entrenador + capitán), posiciones `B|E/A|AP|P`, rachas, MVP y expulsión como reglas.
- Implementación Supabase (tablas, RLS, `service_role`, Storage), Auth (`username` case-insensitive, hash, sesión httpOnly, rate-limit, reset Admin).
- Contenido completo del diccionario (auth, equipo, ficha, jornada, clasificación, ajustes, admin); solo el mínimo de RF-10.
- Contenido de `eu.json`; solo preparación del parámetro de locale.
- Plurales/género ICU, formato fechas/números, HTML en diccionario.
- Regla ESLint automática anti-literales; sigue siendo norma + revisión manual.
- Modo Pete, tema claro/oscuro, UX móvil 360–430px, tap-to-select, PWA, fondo de pista.
- Notificaciones, email, multi-liga, chat, escritorio, app nativa, scraping FNB, formulario Admin.

## 5. Criterios de finalización (Definition of Done)

- [ ] No quedan `.js` propios ni `jsconfig.json`; la configuración TS con alias `@/*` existe y es la única.
- [ ] `npx tsc --noEmit` termina con 0 errores.
- [ ] No hay ningún `any` en el código propio.
- [ ] `npm run lint` termina con 0 warnings.
- [ ] `npm test` termina en verde con al menos un test por módulo de fundación.
- [ ] La cobertura de los módulos de fundación cumple el umbral definido.
- [ ] `npm run build` termina en verde.
- [ ] Existen `src/lib/scoring/`, `src/lib/dominio/`, `src/lib/supabase/`, `src/lib/fnb/`, `src/lib/i18n/` con contratos que compilan, sin lógica de negocio real salvo `i18n`, y existen `public/players/placeholder.webp` y `public/players/placeholder-pete.webp`.
- [ ] Clave i18n inexistente o `{var}` incorrecto impide compilar.
- [ ] `es/strings.json` contiene el mínimo inicial (`ui.home.countdown`, `errors.close.passed`, `ui.ejemplo.saludo`) y `eu` sin diccionario se comporta según E-07.
- [ ] Con diccionario ausente o inválido, la fundación no se considera completa.
