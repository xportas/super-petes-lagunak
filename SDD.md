1. Mapa de división recomendado (9 Specs en 4 fases)

Cada spec tiene el tamaño justo para resolverse en una entrevista de ≤ 6 preguntas y entregarse como PR atómica:

### Fase 0 — Cimientos y Reglas Puras (0% BD, 100% tests unitarios)

1. 01-fundacion-ts-i18n

  Migración a TypeScript strict, Vitest, estructura src/ y motor de diccionarios i18n tipado (es/strings.json).

2. 02-motor-puntuacion-y-dominio (§0)

  Función pura de puntuación (BASE → Maider ×1.5 → Páter suelo 1 + +1 fijo → posición +5 → racha -N → MVP +3 → expulsión -5), desglose textual/estructurado, equivalencia E == A, cálculo de rachas consecutivas y validación de cierre (partido - 3h).

### Fase 1 — Persistencia, Identidad y Shell Móvil

3. 03-modelo-datos-y-semilla (Supabase)

  Tablas Postgres, RLS, usuario Admin semilla (excluido de rankings) y seed de los ~20 jugadores reales + Maider y Páter. Debe incluir las columnas de vinculación FNB que exige `specs/10-scraping-fnb/spec.md` (`fnb_uuid` en jugadores/entrenadores; `fnb_match_id`, `fnb_universally_id`, `origen_resultado` y timestamps de sync en jornadas) y sembrar los `uuid` verificados de `specs/10-scraping-fnb/fnb-api-reference.md`.

4. 04-auth-y-onboarding (§1)

  Registro/login (username case-insensitive + Argon2/bcrypt + sesión httpOnly + rate-limit), flujo "Pedir reset al admin" y Onboarding de 3 pasos (nombre pete, primer quinteto, regla -3h).

5. 05-shell-movil-y-ajustes (§7 y §9)

  Layout móvil (360–430px), navegación inferior, conmutador transversal Modo Pete (img↔imgPete, nombre↔nombrePete), tema claro/oscuro, página `/normas` (7 bloques §0 + #orden, Server Component estático cacheado, accesos desde Ajustes + Onboarding-3 + ayudas Home/Equipo/Resultado, números inyectados desde constantes del motor vía i18n) y cambio de contraseña.

### Fase 2 — Bucle Principal del Manager (Gameplay)

6. 06-alineacion-equipo (§3)

  Pantalla Equipo: los 5 slots de pista + entrenador + capitán, selector tap-to-select, estados (✅, ⚠️ -N, 🚑, ❌, 📍 +5), previsualización del cálculo en vivo y bloqueo en servidor a -3h.

7. 07-home-y-ficha-jugador (§2 y §4)

  Home (cuenta atrás al cierre, próximo partido, Top 3 Managers y Top 3 Jugadores de la última jornada) + Ficha individual (media, última valoración, tabla + mini-gráfica J1..Jn, estado actual).

8. 08-resultados-historial-y-clasificacion (§5 y §6)

  Mi Resultado (desglose anti-piques por jornada), Historial desplegable (J1: 52pts (12º)...) y Clasificación General (oro/plata/bronce arriba, gradiente rojo en los 3 últimos).

### Fase 3 — Administración y Automatización

9. 09-admin-jornadas-y-resultados (§8)

  CRUD jornadas (cierre = -3h), CRUD jugadores, reset manual de contraseñas, formulario manual de acta (valoraciones, DNP/lesionados, expulsados, MVP) + botón de recálculo de jornada. Consume la sincronización definida en `specs/10-scraping-fnb/spec.md`: botón "Sincronizar FNB ahora", pre-relleno por URL y respeto a `origen_resultado = 'manual'`.

10. 10-scraping-fnb (§8, verificado 2026-10-16)

  Fuente única: `specs/10-scraping-fnb/spec.md` + `specs/10-scraping-fnb/fnb-api-reference.md`. Auto-sync de calendario (`idTeam 11659`) y actas digitales vía APIs JSON OWC (ESB + MSSTATS, sin parsear HTML), Lazy Sync en servidor con throttle (6h calendario / 15min resultados, sin cron ni demonios), mapeo por `fnb_uuid`, MVP solo desde el motor §0 y formulario manual garantizado cuando no haya acta digital (caso J1 `55483`).