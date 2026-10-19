# AGENTS.md — Super Petes Lagunak

## Qué es
Super Manager/Fantasy **privado** para los colegas del equipo Lagunak Senior Masculino A. Juego web **solo móvil** (se juega desde el móvil, con una mano). No es producto público ni multi-liga: liga cerrada, ~20 jugadores reales, jornadas reales y un Admin semilla que no juega.

## Fuentes de verdad (en este orden)
1. `CONSTITUTION.md` — 11 principios no negociables. Si algo la contradice, gana ella.
2. `README.md` — especificación funcional completa. Su **§0 define el motor de puntuación y es LA fuente única de las reglas**.
3. `node_modules/next/dist/docs/` — este Next.js (16.4) **no es el que conoces**: lee la guía relevante antes de escribir código (caché, rutas, Server Actions) y haz caso a los avisos de deprecación.

## Skills del proyecto (úsalas tú, sin que te lo pidan)
Viven en `.opencode/skills/<id>/`. Si tienes herramienta de skills, cárgalas con su **id exacto**; si no, lee `.opencode/skills/<id>/SKILL.md` y sus `references/`. Carga la skill **antes** de escribir código, no después. Mapa tarea → skill:

| Tarea | Skill |
|---|---|
| Cualquier UI o interacción de móvil (pantallas, componentes, viewport, safe areas, taps, PWA) | **`mobile-native` (obligatoria)** |
| Pulir componentes y detalles finos de interfaz | `emil-design-eng` |
| Gestos, springs, sheets, drag/swipe o motion estilo Apple | `apple-design` |
| Construir una animación o transición nueva | `animate` |
| Criticar una animación concreta | `review-animations` |
| Auditar/planificar mejoras de todo el motion del repo | `improve-animations` |
| Buscar dónde falta animación (solo propone) | `find-animation-opportunities` |
| Jank, elección de propiedades, `will-change` | `animation-performance` |
| Antes de añadir una librería de UI/componentes/toasts | `pick-ui-library` |
| Construir varias variantes de una pieza de UI | `prototype` |
| Probar el peor caso de una UI (nombres largos, listas vacías, emoji…) | `break-ui` |
| Página pública/landing (nunca para pantallas de la app) | `design-taste-frontend` |
| Sonner (toasts), solo si algún día se usa | `ask-sonner` |

No usar `animate-expo` ni `write-swift`: no aplican a este stack.

## Comandos
| Comando | Uso |
|---|---|
| `npm run dev` / `build` / `start` | ciclo Next.js |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | typecheck estricto (tras migrar a TS) |
| `npm test` | Vitest: motor §0 y dominio (por crear) |

## Reglas duras

### Motor de puntuación (§0 del README)
- Vive en **funciones puras** en un único módulo (`src/lib/scoring/`). Prohibido duplicar o reinterpretar la lógica en componentes, Server Actions, formularios admin o SQL. La futura página `/normas` (ver §9 del README, la define la spec-05) no calculará: solo mostrará reglas inyectando las constantes del motor vía `{var}` i18n.
- Orden fijo y no negociable: `BASE → capitán ×1.5 (round_half_up, solo BASE) ó suelo Páter max(_,1)+1 excluyentes → +5 posición (E==A, bloqueado si BASE 0) → −N racha (bloqueado si BASE 0, pero cuenta para racha futura) → +3 MVP (exige haber jugado, empate habilita a todos, nunca se multiplica) → −5 expulsión (por expulsado, BASE intacta)`.
- Todo desglose en UI (`Arnau 12 +5 −1 = 16`) se deriva de la misma salida del motor. Nunca se recalcula a mano.
- Cambiar una regla = (1) test que falla, (2) motor, (3) actualizar §0 del README. En ese orden y en el mismo cambio.

### Dominio (resumen ejecutable, detalle en §0 + spec-02)
- Posiciones: `B | E | A | AP | P`, donde `E == A`. Cada jugador tiene exactamente 2 válidas; alinear en una = `+5`, bloqueado si `BASE = 0`.
- Capitán (Maider): `round_half_up(BASE ×1.5)` solo sobre BASE y opta al `+3` MVP (máxima BASE de plantilla habiendo jugado; empate habilita a todos; nunca se multiplica).
- Entrenador (Páter): `max(valor, 1)` + `+1` fijo a cada uno de los 5, incluso con `BASE = 0` (`0 → 2`).
- Racha: `−1` en la 2ª alineación consecutiva, `−2` en la 3ª… Se rompe si una jornada no lo alineas o no envías quinteto. Alinear lesionado/DNP cuenta para racha futura.
- Lesionado / no convocado / DNP → BASE `= 0` (sigue ocupando slot y se muestra 🚑/❌, nunca se oculta).
- **Cierre = hora del partido − 3h** (`Europe/Madrid`), y se valida **en el servidor**: solo lo recibido estrictamente antes; el segundo exacto o después se rechaza. El contador del Home es solo UX; jamás es la puerta.
- **Orden cronológico canónico**: toda resolución de jornada activa, cálculo secuencial de rachas, evolución y puestos históricos se ordena por `hora_partido ASC, numero_jornada ASC` (`DESC` en listado de Historial). Estados de jornada: `pendiente | calculada | papel | invalidada` (una `calculada` que quede incompleta tras edición o re-sync pasa a `invalidada`, nunca regresa a `pendiente`).
- Alineación válida: 5 jugadores + 1 entrenador + 1 capitán (uno de los 5). Se valida en servidor antes de guardar.

### Solo móvil
- **Toda tarea de UI empieza cargando la skill `mobile-native`** (ver § Skills del proyecto).
- Diseño entre 360 y 430 px de ancho. No hay versión escritorio: nada de hover, tablas anchas ni layouts de dos columnas.
- Interacción única: **tap-to-select + lista**. Drag & drop prohibido. Excepción: `/normas` es lectura con acordeones `tap-to-expand`.
- Objetivos táctiles ≥ 44×44 px; legibilidad sobre el fondo de pista.
- Modo Pete (ON/OFF) y tema claro/oscuro son transversales: toda vista respeta `img↔imgPete` y `nombre↔nombrePete`. El Modo Pete es cosmético: **las reglas nunca cambian**.

### i18n — cero hardcode
- Ningún string visible en el código: todo en `es/strings.json` con claves jerárquicas (`ui.home.countdown`, `errors.close.passed`, `ui.normas.*` cuando la cree la spec-05).
- v1 solo `es`, pero escrito como si mañana existiera `eu.json`. Prohibido concatenar frases a mano. Los números de reglas en la futura `/normas` llegarán como `{var}` desde constantes del motor, nunca como literales duplicados.

### Supabase (Free Tier)
- Postgres solo para datos relacionales. Imágenes y memes en `public/` del repo → 0 MB de Storage.
- Sin Realtime, sin cron, sin polling agresivo: lecturas en Server Components (cacheadas) y escrituras puntuales en Server Actions.
- Auth propia de la app, no Supabase Auth: `username` case-insensitive + hash Argon2/bcrypt + sesión httpOnly + rate-limit. Sin email; reset manual vía Admin.
- RLS activado en todas las tablas **sin políticas públicas para `anon`** (`DENY ALL` exterior). Todo acceso a BD se realiza desde el servidor Next.js (Server Components / Server Actions) usando el cliente de servidor con `service_role` (que jamás llega al cliente) tras validar la sesión `httpOnly` y el rol (`manager | admin`) en el backend. Secretos solo en `.env.local` (ignorado por git).

### FNB — sincronización automática (ver `specs/10-scraping-fnb/`)
- Fuente única: `specs/10-scraping-fnb/spec.md` (comportamiento) + `specs/10-scraping-fnb/fnb-api-reference.md` (endpoints OWC verificados 2026-10-16). Prohibido parsear el HTML de `fnbaloncesto.com`.
- Las specs 03 (modelo/semilla), 09 (admin) y 10 (FNB) deben leer `specs/10-scraping-fnb/` antes de diseñar tablas, seed o panel admin: columnas `fnb_uuid`, `fnb_match_id`, `fnb_universally_id`, `origen_resultado` y Lazy Sync con throttle (sin cron ni demonios). El MVP lo calcula solo el motor §0; el manual nunca se bloquea.

## Estado actual del repo (importante)
- Scaffold JS de Next.js 16.4 + Tailwind v4. `next.config.mjs` activa `cacheComponents` y `partialPrefetching`: consulta la doc correspondiente antes de tocar fetching/caché.
- **Pendiente migrar a TypeScript `strict`** (constitución) y crear la infra de Vitest (`spec-01`): es la primera tarea técnica, antes de cualquier feature.
- Aún no hay `src/`, BD ni tests; la estructura de abajo es el destino.

## Estructura objetivo
```
es/strings.json          # i18n (creado en spec-01; spec-05 añade ui.normas.*)
public/                  # fotos img / imgPete + placeholders (players/placeholder*.webp, coaches/*.webp)
src/proxy.ts             # guardas de ruta y renovación sliding de cookie en Next.js 16.4 (middleware.ts está deprecado)
src/app/                 # rutas App Router en TypeScript tras spec-01 (*.tsx)
src/app/normas/page.tsx  # página Normas (la crea la spec-05)
src/lib/scoring/         # motor §0 (puro) + agregador de temporada + tests junto al módulo
src/lib/scoring/constantes.ts  # única fuente de números para /normas (spec-02)
src/lib/dominio/         # cierre, rachas, validaciones de alineación
src/lib/fnb/             # cliente API FNB (ESB + MSSTATS) y mapeo a dominio (placeholder en spec-01; dueña spec-10)
src/lib/supabase/        # cliente(s) de servidor y queries
src/lib/i18n/            # diccionario + traducir tipado (spec-01)
```

## Mapa de rutas canónico (App Router)
- `/` — Home (`spec-07`; `/home` redirige permanentemente a `/`)
- `/login`, `/registro`, `/cambiar-password`, `/onboarding` — Auth y Onboarding (`spec-04`)
- `/equipo` — Alineación próxima jornada (`spec-06`)
- `/jugadores`, `/jugadores/[id]` — Plantilla activa y Ficha individual (`spec-07`)
- `/mi-resultado`, `/clasificacion` — Mi Resultado + Historial y Clasificación General (`spec-08`)
- `/ajustes`, `/normas` — Ajustes y Normativa desglosada (`spec-05`)
- `/admin` — Panel Admin con pestañas (`spec-09`)

## Convenciones
- TypeScript `strict`; **cero `any`** (usa `unknown` + narrowing).
- Server Components por defecto; `'use client'` solo donde haga falta interactividad real.
- Mutaciones solo vía Server Actions, con validación de esquema en servidor (zod).
- Dominio en español en nombres de negocio (`Jugador`, `Jornada`, `Quinteto`, `valoracionFNB`); infraestructura en inglés. Archivos en `kebab-case`.

## Puerta de calidad (antes de dar cualquier tarea por hecha)
1. `npx tsc --noEmit` → 0 errores. 2. `npm run lint` → 0 warnings. 3. `npm test` → verde. 4. `npm run build` → verde.
Tests mínimos obligatorios: motor §0 (base negativa/0, capitán, Páter, rachas 1ª–4ª, MVP, expulsión, empate de MVP), cálculo de cierre (−3h exactas) y validación de alineación.

## Fuera de alcance v1 (no improvisar)
Notificaciones, email, auto-reset, multi-liga, chat, escritorio, app nativa. El Admin no juega ni aparece en rankings.
El scraping FNB es opcional: si falla, el **formulario manual de resultados debe funcionar siempre**.

## Flujo de trabajo
- Cambios pequeños y atómicos; antes de un refactor grande o una feature nueva, propone plan y espera aprobación.
- Mensajes de commit en español, imperativo y cortos.
- Si README y CONSTITUTION chocan en reglas de juego, propone solución y pregunta; no decidas en silencio.
