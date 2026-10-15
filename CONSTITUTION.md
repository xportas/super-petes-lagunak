# Constitución — Super Petes Lagunak

1. **Stack**: Next.js 16 (App Router, Server Actions), TypeScript `strict`, Tailwind v4 y PostgreSQL en Supabase (Free Tier).
2. **Cuota Supabase**: BD solo para datos relacionales; fotos y memes en `public/` del repo para consumir 0 MB de Supabase Storage.
3. **Ahorro de recursos**: Sin Supabase Realtime ni demonios; lecturas SSR/cacheadas y escrituras puntuales en Server Actions.
4. **Auth sin email**: `username` (case-insensitive) + `password` hasheada (Argon2/bcrypt) con sesión HTTP-only y rate-limit; reset manual vía Admin.
5. **Motor de puntuación puro**: Cálculo §0 (`BASE -> Maider/Páter -> Posición +5 -> Racha -N -> MVP +3 -> Expulsión -5`) aislado en funciones puras.
6. **Tests verificables**: 100% de cobertura unitaria (Vitest) sobre el motor §0, validación de posiciones (`B, E/A, AP, P`) y cálculo de rachas.
7. **Cierre en servidor**: Bloqueo estricto en backend a `hora_partido - 3h`; ninguna alineación se acepta tras el cierre.
8. **UX Móvil y Modo Pete**: Interacción 100% `tap-to-select` (cero drag&drop), tema claro/oscuro y conmutador global `normal <-> Pete`.
9. **Cero textos hardcodeados**: Toda cadena de UI se resuelve desde `es/strings.json` mediante claves i18n; prohibidos literales en JSX.
10. **Puerta de calidad**: Cero `any`, cero errores en `tsc --noEmit`, `eslint` y `next build` en cada entrega.
11. **Límites de alcance v1**: Sin notificaciones, rol Admin semilla excluido del ranking y carga de jornada con formulario manual garantizado + scraping FNB.
