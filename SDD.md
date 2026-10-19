1. Mapa de división recomendado (10 Specs en 4 fases)

Cada spec mantiene su identificador fijo (`01` a `10`) y tiene el tamaño justo para resolverse en una entrevista de ≤ 6 preguntas y entregarse como PR atómica.

> **Orden de ejecución recomendado (sin bloqueos de dependencias):**
> - **Fase 0:** `01` → `02`
> - **Fase 1:** `03` → `05` → `06` (crea el selector de quinteto reutilizable) → `04` (reutiliza el selector de `06` en el Paso 1 del Onboarding)
> - **Fase 2:** `10` (implementa `src/lib/fnb/`) → `07` (consume Lazy Sync de `10` en Home) → `08`
> - **Fase 3:** `09` (consume `src/lib/fnb/` de `10` para los botones FNB del panel Admin)

### Fase 0 — Cimientos y Reglas Puras (0% BD, 100% tests unitarios)

1. 01-fundacion-ts-vitest-src

  Migración directa del scaffold inicial a TypeScript strict (`src/app/*.tsx`), Vitest con cobertura, estructura `src/lib/` completa (`scoring`, `dominio`, `supabase`, `fnb`, `i18n`) con contratos tipados, placeholders gráficos en `public/players/` y motor de diccionarios i18n tipado (`es/strings.json`).

2. 02-motor-puntuacion-y-dominio (§0)

  Función pura de puntuación (BASE → Maider ×1.5 → Páter suelo 1 + +1 fijo → posición +5 → racha -N → MVP +3 → expulsión -5), desglose estructurado, equivalencia E == A, cálculo de rachas consecutivas, agregador puro de temporada/liga (rachas por manager, puestos olímpicos históricos, medias y Top 3) y validación de cierre (partido - 3h).

### Fase 1 — Persistencia, Identidad y Shell Móvil

3. 03-modelo-datos-y-semilla (Supabase)

  Tablas Postgres, RLS, usuario Admin semilla (excluido de rankings) y seed de los ~20 jugadores reales + Maider y Páter. Debe incluir las columnas de vinculación FNB que exige `specs/10-scraping-fnb/spec.md` (`fnb_uuid` en jugadores/entrenadores; `fnb_match_id`, `fnb_universally_id`, `origen_resultado` y timestamps de sync en jornadas) y sembrar los `uuid` verificados de `specs/10-scraping-fnb/fnb-api-reference.md`.

4. 04-auth-y-onboarding (§1)

  Registro/login (username case-insensitive + Argon2/bcrypt + sesión httpOnly + rate-limit), flujo "Pedir reset al admin" informativo sin ticket y Onboarding de 2 pasos (primer quinteto posponible si no hay jornada abierta, regla -3h).

5. 05-shell-movil-y-ajustes (§7 y §9)

  Layout móvil (360–430px), navegación inferior, conmutador transversal Modo Pete (img↔imgPete, nombre↔nombrePete), tema claro/oscuro, página `/normas` (7 bloques §0 + #orden, Server Component estático cacheado, accesos desde Ajustes + Onboarding-2 + ayudas Home/Equipo/Resultado, números inyectados desde constantes del motor vía i18n) y entrada de cambio de contraseña en Ajustes (comportamiento dueño de spec-04).

### Fase 2 — Bucle Principal del Manager (Gameplay)

6. 06-alineacion-equipo (§3)

  Pantalla Equipo: los 5 slots de pista + entrenador + capitán, selector tap-to-select, estados (✅, ⚠️ -N, 🚑, ❌, 📍 +5), previsualización del cálculo en vivo y bloqueo en servidor a -3h.

7. 07-home-y-ficha-jugador (§2 y §4)

  Home (cuenta atrás al cierre, próximo partido, Top 3 Managers y Top 3 Jugadores de la última jornada) + Ficha individual (media, última valoración, tabla + mini-gráfica J1..Jn, estado actual).

8. 08-resultados-historial-y-clasificacion (§5 y §6)

  Mi Resultado (desglose anti-piques por jornada), Historial desplegable (J1: 52pts (12º)...) y Clasificación General (oro/plata/bronce arriba, gradiente rojo en los 3 últimos).

### Fase 3 — Administración y Automatización

9. 09-admin-jornadas-y-resultados (§8)

  CRUD jornadas (cierre = -3h), CRUD jugadores, reset manual de contraseñas, formulario manual de acta (valoraciones, DNP/lesionados, expulsados; sin campo MVP, que lo calcula solo el motor §0) + botón de recálculo de jornada. Consume la sincronización definida en `specs/10-scraping-fnb/spec.md`: botones separados (`Sincronizar calendario FNB`, `Sincronizar acta` / pegar URL con pre-relleno revisable y `Re-importar desde FNB`) y respeto a `origen_resultado = 'manual'`.

10. 10-scraping-fnb (§8, verificado 2026-10-16)

  Fuente única: `specs/10-scraping-fnb/spec.md` + `specs/10-scraping-fnb/fnb-api-reference.md`. Auto-sync de calendario (`idTeam 11659`) y actas digitales vía APIs JSON OWC (ESB + MSSTATS, sin parsear HTML), Lazy Sync en servidor con throttle (24h calendario / 1h resultados tras `hora_partido + 3h`, sin cron ni demonios), mapeo por `fnb_uuid`, MVP solo desde el motor §0 y formulario manual garantizado salvo jornada papel definitiva tras gracia de 1 día (caso J1 `55483`).