# 05 — Shell móvil y Ajustes (ampliación: página Normas `/normas`)

## 1. Objetivo y contexto

**Objetivo:** definir el QUÉ de la página `/normas` (nueva §9 del `README.md`), donde el usuario ve desglosadas las reglas del juego (cierre, puntuación, qué suma, qué resta y sobre qué se aplican las bonificaciones), de forma que toda la app hable de las reglas con una sola voz.

**Contexto:**

- `README.md §0` es la fuente única de las reglas y `specs/02-motor-puntuacion-y-dominio/spec.md` congela sus ambigüedades (redondeo half-up, ramas Maider/Páter excluyentes, `BASE 0` bloquea `+5/−N` pero no Páter, MVP exige haber jugado, empate habilita a todos, `−5` por expulsado, cierre estricto `< hora−3h` en `Europe/Madrid`).
- `SDD.md Fase 1 / 05-shell-movil-y-ajustes` ya era dueña de la "vista de normativa (§0)". Esta ampliación la concreta como ruta `/normas` completa con accesos transversales, en lugar de crear una spec nueva que fragmentaría esa propiedad.
- Decisiones ya cerradas con el usuario para esta ampliación: accesos transversales (Ajustes + Onboarding-3 + ayudas en Home/Equipo/Resultado); números inyectados desde constantes del motor vía `{var}` i18n (nunca literales duplicados); ampliar la 05, no crear spec nueva.
- **Alcance de este fichero:** solo la página Normas. El resto de la 05 (layout móvil, navegación inferior, conmutador Modo Pete, tema claro/oscuro, cambio de contraseña) queda pendiente de su propia entrevista y no se especifica aquí.

## 2. Requisitos funcionales (EARS)

- **RF-01 — Ruta y bloques en orden fijo:**
  Cuando el usuario abra `/normas`, el sistema deberá mostrar las reglas en 8 bloques anclables (`#cierre`, `#base`, `#entrenadores`, `#posicion`, `#racha`, `#mvp`, `#expulsion`, `#orden`) más nota de Modo Pete y línea de fuente, siguiendo el contenido de `README.md §9` y el orden de `spec-02 RF-13`.

- **RF-02 — Accesos transversales:**
  Cuando el usuario quiera entender una regla desde otra pantalla, el sistema deberá ofrecerle enlace a `/normas`: entrada `Normas del juego` en Ajustes; paso 3 del Onboarding a `#cierre`; icono de ayuda en la cuenta atrás del Home a `#cierre`; iconos de estado del Equipo a su bloque; desglose de Mi Resultado a `#orden`.

- **RF-03 — Lectura pura:**
  Cuando se sirva `/normas`, el sistema no deberá ejecutar Server Actions ni leer BD; será un Server Component estático cacheado.

- **RF-04 — Cero hardcode con números inyectados:**
  Cuando se muestren las reglas, el sistema deberá resolver todo texto visible desde `es/strings.json` (`ui.normas.*`) y recibir los números (`+5`, `−N`, `+3`, `−5`, `x1.5`, `−3h`, zona) como `{var}` desde las constantes de `src/lib/scoring/`. Si un número de regla aparece como literal en JSX o en el JSON, entonces se considerará incumplimiento aunque `lint` pase.

- **RF-05 — Solo móvil:**
  Cuando se vea en móvil (360–430px), la página deberá leerse a una mano: una columna, objetivos táctiles ≥ 44×44px, tema claro/oscuro, respeto a safe-areas, sin hover ni drag&drop.

- **RF-06 — Modo Pete cosmético:**
  Cuando el Modo Pete esté activo, la página deberá poder mostrar ejemplos con `imgPete`/`nombrePete` y siempre incluirá el aviso de que las reglas no cambian. Si algún texto sugiere que Pete altera la puntuación, entonces se considerará incumplimiento.

- **RF-07 — Coherencia con el motor:**
  Cuando cambie una regla, el cambio deberá seguir el orden de `AGENTS.md` (test que falla → motor → §0 del README) y la página deberá actualizarse en el mismo cambio; los números se actualizarán solos vía `{var}` y solo la prosa se retoca a mano.

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | Constantes del motor ausentes al compilar | Fallo visible; prohibido mostrar números por defecto | Sin fuente única no hay garantía anti-divergencia |
| E-02 | `{var}` sin parámetro al renderizar | Se aplica lo definido en spec-00 (aviso en desarrollo, sin frase incompleta) | Heredado de la fundación i18n |
| E-03 | Ancla inexistente (ej. `#cierre` mal escrito) | El enlace llevará a `/normas` sin ancla; la página muestra los 8 bloques igual | Un typo no debe romper la página |
| E-04 | Tabla de racha | Filas generadas por fórmula `−(n−1)`, no literales por fila | La progresión es indefinida por §0 |
| E-05 | Ejemplos (`13 → 20`, `0 → 2`, `12 +5 −1 = 16`) | Hasta que exista el motor, texto congelado de §0; con motor, se derivan de su salida o un test los verifica | Los ejemplos a mano son la primera divergencia |
| E-06 | Locale sin diccionario | Lo definido en spec-00/01 (fallback a `es` con aviso) | v1 solo `es`, preparado para `eu.json` |

## 4. Fuera de alcance explícito

- Resto de la 05: layout móvil, navegación inferior, implementación del conmutador Modo Pete y del tema claro/oscuro, cambio de contraseña (pendientes de entrevista propia).
- Lógica del motor §0, rachas, cierre y validaciones (spec-02); infra i18n y migración TS (specs-00/01); persistencia, Auth, Admin, scraping (specs-03/04/06–10).
- Edición de reglas desde la app: la página es lectura; las reglas solo cambian por el flujo test → motor → §0.

## 5. Criterios de finalización (Definition of Done)

- [ ] Existe la ruta `/normas` con los 8 bloques anclados más nota Pete y fuente, según `README.md §9`.
- [ ] Los 5 accesos de RF-02 enlazan a la ruta/ancla correcta.
- [ ] Ningún número de regla es literal en JSX ni en el JSON: todos llegan como `{var}` desde `src/lib/scoring/`.
- [ ] Existe test que verifica que los valores mostrados coinciden con las constantes del motor.
- [ ] `npx tsc --noEmit` 0 errores, cero `any`; `npm run lint` 0 warnings en el alcance; `npm test` verde; `npm run build` verde con `/normas` prerenderizada.
- [ ] Revisión manual: cero hardcode, 360–430px legible a una mano, claro/oscuro, safe-areas, aviso Pete presente.
