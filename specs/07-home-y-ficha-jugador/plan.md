# Plan técnico — 07 Home y Ficha Jugador (§2 y §4)

Fuente: `specs/07-home-y-ficha-jugador/spec.md` + `CONSTITUTION.md` + `AGENTS.md` + `README.md §0/§2/§4` + planes 01/02/03 + specs 04/05/10.
Alcance: solo diseño. No incluye código de producción.

Prerrequisitos: 01 (TS strict, Vitest, `es/strings.json`, `traducir`, placeholders), 02 (`src/lib/scoring/` + `src/lib/dominio/` reales: `calcularCierre`, `calcularRachas`, `agregarTemporada`, constantes), 03 (tablas `jugador/jornada/resultado_jugador/alineacion`, RLS, semilla J1 `papel` + J2 `calculada`), 04 (`src/proxy.ts` + guardia sesión/onboarding), 05 (shell 360-430, cookies `modo_pete`/`tema`, anclas `/normas#*`), 10 (Lazy Sync + throttle + `esVigenteEn`). Esta 07 solo consume, no redefine.

## 1. Modelos de datos

Cero tablas nuevas, cero columnas calculadas persistidas. Todo es vista derivada al leer (spec-03 RF-15).

```ts
// DTOs reutilizados (no redefinir, solo importar):
// spec-02: Posicion, EstadoJornada, EstadoJugadorActa, JornadaOrdenable
// spec-03: JugadorRow, JornadaRow, ResultadoJugadorRow, AlineacionRow
```

View-models nuevos (puros, `readonly`):

```ts
// src/lib/home/tipos.ts
interface JornadaActivaView {
  readonly jornada: JornadaRow;
  readonly cierre: Date;              // derivado calcularCierre()
  readonly estadoHome: 'cuenta_atras' | 'cerrado' | 'sin_proxima' | 'vacia';
  readonly ultimaDisputada: JornadaRow | null; // solo para fallback RF-05
}
interface TopManagerRow { readonly managerId: string; readonly username: string; readonly puntos: number; readonly jornadaEtiqueta: string; readonly puesto: number; }
interface TopJugadorRow { readonly jugadorId: string; readonly base: number; readonly jornadaEtiqueta: string; readonly puesto: number; }

// src/lib/ficha/tipos.ts
interface FichaCabecera { readonly jugador: JugadorRow; readonly esBaja: boolean; }
interface MediaTemporada { readonly tipo: 'valor'; readonly media: number; readonly jugados: number } | { readonly tipo: 'sin_datos' };
interface UltimaValoracion { readonly tipo: 'valor'; readonly base: number; readonly estado: EstadoJugadorActa; readonly jornadaEtiqueta: string } | { readonly tipo: 'sin_datos' };
interface EvolucionFila { readonly jornadaId: string; readonly etiqueta: string; readonly base: number; readonly estado: EstadoJugadorActa; }
interface EstadoActualDosLineas { readonly lineaSanitaria: 'disponible' | 'lesionado' | 'baja'; readonly lineaRacha: { readonly tipo: 'valor'; readonly penalizacion: number } | { readonly tipo: 'no_aplica' }; }
```

Vigencia para evolución/media (spec-03 RF-01/RF-07): `fecha_alta <= cierre_J AND (fecha_baja IS NULL OR fecha_baja > cierre_J)` + bajas que jugaron/fueron alineadas esa J. Orden canónico siempre `hora_partido ASC, numero_jornada ASC`.

## 2. Decisiones justificadas

| # | Decisión | Elegida | Alternativa descartada | Justificación |
|---|---|---|---|---|
| D-01 | Home = Server Components + islas cliente mínimas | `page.tsx` SSR + `cuenta-atras.tsx` (`'use client'`, `setInterval` 1s) + resto estático | Todo cliente con fetch o `revalidatePath` en render | CONSTITUTION §3 + RF-02: lecturas SSR/cacheadas; el cierre real lo valida el servidor (spec-02), el reloj es solo UX |
| D-02 | Lazy Sync dentro de `<Suspense>` del Home, sin `revalidatePath` en render | `comprobarLazySyncHome()` con throttle spec-10 RF-04 (24h calendario, 1h resultados si `hora+3h<=ahora`, con lock); fallo FNB → sirve BD en silencio | Sync en `layout`, cron o Realtime | RF-02 + E-15 + CONSTITUTION §3/§11: sin demonios; FNB caída no bloquea |
| D-03 | Resolución jornada activa/última calculada como pura testeable | `resolverJornadaActiva(jornadas, ahora)` y `resolverUltimaCalculada(jornadas)` en `src/lib/home/` | Lógica inline en `page.tsx` o en SQL | RF-03/04/05/08 + E-03: `pendiente` primera cronológica; `Cerrado` hasta `calculada/papel`; última `calculada` excluyendo `papel/pendiente/invalidada` |
| D-04 | Top 3 + numeración olímpica como pura | `ordenarTop3()` genérico + `puesto` olímpico (`1,1,3`), corte duro en 3 filas | `DENSE_RANK` en SQL o `ROW_NUMBER` | RF-09/10 + E-06: desempate Managers por `username` ci, Jugadores por `nombre` real (invariante Pete); SQL duplicaría motor |
| D-05 | Ficha/Media/Evolución derivan de `scoring/dominio`, cero fórmulas en UI | `calcularMediaTemporada()` con `Math.floor(m*10+0.5)/10`, `ultimaValoracion()`, `evolucionVigente()` | Media en SQL `AVG()` o en componente | RF-15/16/20 + E-07/08: solo `jugo` entra en denominador; `BASE=0✅` sí cuenta, `🚑/❌` no; `papel` excluida |
| D-06 | Gráfica SVG inline sin librería | `grafica-evolucion.tsx` SVG puro, línea base `0`, punto único, `overflow-x-auto` solo en su contenedor | `recharts/chart.js`/canvas o scroll de página | RF-16 + E-14: 1 punto y negativos no deben romper; scroll confinado, 0 scroll horizontal de página; 0 MB/0 deps |
| D-07 | Modo Pete/tema vía cookie servidor (spec-05), prop drilling | Lee `modo_pete` en Server Component, elige `img/nombre` vs `imgPete/nombrePete`; managers/entrenadores invariantes | Estado global cliente o duplicar orden por `nombrePete` | RF-20 + E-06: cosmético, nunca altera corte ni reglas |
| D-08 | Guardia en `src/proxy.ts` (spec-04), no en cada page | Pages asumen sesión; `proxy` redirige `/login`, `/cambiar-password`, `/onboarding` | `redirect()` duplicado en las 3 rutas | RF-01: evita divergencia; pages solo leen `session.rol` para ocultar racha a Admin |
| D-09 | Error full-screen por ruta, sin parciales | `error.tsx` + `not-found.tsx` por segmento + botón `Reintentar` cliente (`router.refresh()`); fallo BD → error completo | Bloques parciales o `0` provisional | RF-19 + E-15: FNB cae → silencio; BD cae → error + reintento |
| D-10 | Sin Server Actions nuevas, sin Zod nuevo | Solo lectura; `id` de `/jugadores/[id]` se valida con `z.string().uuid()` en servidor y se rechaza `Maider/Páter` por slug/tabla `entrenador` | Crear actions de lectura o formularios | RF-12/13: ficha solo lectura, sin CTA alinear; Zod vive en el borde (spec-02/03) |

## 3. Archivos exactos a crear / modificar / no tocar

Respetando estructura `AGENTS.md`. No se crea `/normas` (spec-05) ni `eu.json`.

### Crear
- `src/app/page.tsx` — Home SSR (jornada activa + partido + 2 Top3 + enlace plantilla). Cubre RF-01–11, RF-19/20.
- `src/app/jugadores/page.tsx` — listado activos orden dorsal/`nombre` real. Cubre RF-01/12/19/20.
- `src/app/jugadores/[id]/page.tsx` + `not-found.tsx` — ficha lectura, etiqueta `Baja`, `Jugador no encontrado`. Cubre RF-01/13/14/19/20.
- `src/app/components/cuenta-atras.tsx` (`'use client'`) — `HH:MM:SS` acumulando horas, tick 1s, estado `Cerrado`. Cubre RF-03/04.
- `src/app/components/bloque-partido.tsx` — fecha `Europe/Madrid`, local/visitante, lugar/rival o `Por confirmar`, `?` → `/normas#cierre`. Cubre RF-06/07.
- `src/app/components/top-managers.tsx`, `top-jugadores.tsx` — máx 3 filas olímpicas, tap en jugador → ficha. Cubre RF-09/10/11.
- `src/app/components/ficha-cabecera.tsx`, `ficha-media.tsx`, `ficha-evolucion.tsx` (tabla), `grafica-evolucion.tsx` (SVG), `ficha-estado.tsx`, `tooltip-normas.tsx` (tap → `/normas#base/#racha`). Cubren RF-14–18.
- `src/lib/home/resolver-jornada.ts` — `resolverJornadaActiva`, `resolverUltimaCalculada`, `ordenarCanonico`. Cubre RF-03/04/05/08.
- `src/lib/home/top3.ts` — `top3Managers`, `top3Jugadores`, `puestosOlimpicos`. Cubre RF-09/10.
- `src/lib/home/tipos.ts`, `index.ts` — barrels.
- `src/lib/ficha/media-evolucion.ts` — `calcularMediaTemporada`, `ultimaValoracion`, `evolucionVigente`, `formatearMediaES`. Cubre RF-15/16.
- `src/lib/ficha/estado-actual.ts` — `resolverEstadoActual(manager|admin)`. Cubre RF-17.
- `src/lib/ficha/tipos.ts`, `index.ts`.
- `src/lib/supabase/queries-home.ts` — `leerHomeBD()` (jornadas + última `calculada` + actas + alineaciones válidas). Solo lectura. Cubre RF-02/08/09/10.
- `src/lib/supabase/queries-ficha.ts` — `leerJugadorPorId`, `listarPlantillaActiva`, `leerActasJugador`. Solo lectura. Cubre RF-12/13/15/16.
- Tests junto al módulo (ver §7).

### Modificar
- `es/strings.json` — añadir claves §6, sin renombrar las de 01/02/03/05.
- `vitest.config.ts` — incluir `src/lib/home/**`, `src/lib/ficha/**`, `src/app/**` en cobertura (umbral hereda 01/02; 100% solo en puras nuevas).
- `package.json` — sin deps nuevas (SVG inline, sin chart lib; sin zod nuevo).

### No tocar
- `src/lib/scoring/*`, `src/lib/dominio/*` (solo consumir), `src/lib/fnb/*` (dueña 10), `src/proxy.ts` (dueña 04), migraciones/SQL (dueña 03), `README.md §0`, `public/coaches/*`.

## 4. Tipos TypeScript strict y Zod

`strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`, cero `any` (`unknown` + narrowing), `readonly`, `kebab-case`, negocio en español.

```ts
// src/lib/home/resolver-jornada.ts
export function resolverJornadaActiva(
  jornadas: readonly JornadaRow[], ahora: Date
): { tipo: 'activa'; jornada: JornadaRow; cerrada: boolean } | { tipo: 'sin_proxima'; ultima: JornadaRow | null } | { tipo: 'vacia' };
// cerrada = ahora >= calcularCierre(hora_partido) && estado==='pendiente'

// src/lib/home/top3.ts
export function puestosOlimpicos<T>(filasOrdenadas: readonly T[]): readonly (T & { puesto: number })[];
export function top3Managers(puntosPorManager: ReadonlyMap<string, { username: string; puntos: number }>, jornadaEtiqueta: string): readonly TopManagerRow[];
export function top3Jugadores(bases: readonly { jugadorId: string; nombre: string; base: number }[], jornadaEtiqueta: string): readonly TopJugadorRow[];

// src/lib/ficha/media-evolucion.ts
export function calcularMediaTemporada(actas: readonly { base: number; estado: EstadoJugadorActa; estadoJornada: EstadoJornada }[]): MediaTemporada;
export function formatearCuentaAtras(msRestantes: number): string; // HH:MM:SS con HH>24
```

Zod: no aplica nuevo esquema. Único borde: `params.id` en `/jugadores/[id]` se parsea con `z.string().uuid()` existente de spec-03; entrenadores se excluyen consultando tabla `entrenador`, nunca por heurística de nombre.

## 5. Contratos puras / Server Actions / Supabase

Puras nuevas (sin IO, sin `Date.now()` — `ahora` inyectado):
- `resolverJornadaActiva`, `resolverUltimaCalculada`, `ordenarCanonico(hora ASC, numero ASC)`
- `top3Managers` (excluye Admin y sin-envío; `-10` nunca entra), `top3Jugadores` (excluye `Maider/Páter`, orden `BASE DESC, nombre ASC`), `puestosOlimpicos`
- `calcularMediaTemporada` (solo `jugo` en `calculada`), `ultimaValoracion` (última `calculada` vigente + icono), `evolucionVigente` (vigencia + orden canónico), `formatearMediaES` (`,` decimal), `formatearCuentaAtras`
- `resolverEstadoActual(jugadorRow, rachaManager | null)` — sanitaria de tabla `jugador` + `−N` de `calcularRachas` spec-02 para el manager en sesión; `No aplica` si Admin.

Server Actions: 0 nuevas. Home/listado/ficha son lectura. `Reintentar` = `router.refresh()` cliente, no mutación.

Tablas afectadas (solo `SELECT` vía cliente servidor `service_role`, RLS `DENY ALL anon`):
- `jornada` (activa + última `calculada` + fallback última disputada), `resultado_jugador` (BASE/estado/expulsado crudo), `jugador` (plantilla, vigencia, sanitario), `alineacion` + `alineacion_seleccion` (quién envió válido para Top Managers + rachas), `usuario/sesion` (solo guardia vía proxy). Cero `INSERT/UPDATE`, cero totales materializados.

## 6. Claves i18n nuevas (`es/strings.json`)

Sin literales en JSX; números de reglas vía `{var}` de `src/lib/scoring/constantes.ts` (no literales aquí):

- `ui.home.cuenta_atras="Cierre en {time}"`, `ui.home.cerrado="Cerrado - vuelve tras el partido"`, `ui.home.sin_proxima="Sin próxima jornada"`, `ui.home.por_confirmar="Por confirmar"`, `ui.home.ver_plantilla="Ver toda la plantilla"`, `ui.home.top_managers="Top 3 Managers"`, `ui.home.top_jugadores="Top 3 Jugadores"`, `ui.home.sin_datos="Sin datos"`, `ui.home.ultimo_partido="Último partido"`
- `ui.jugadores.titulo`, `ui.jugadores.sin_dorsal="Sin dorsal"`, `ui.jugadores.posicion_pendiente="Posición pendiente"`, `ui.jugadores.no_encontrado="Jugador no encontrado"`, `ui.jugadores.baja="Baja"`, `ui.jugadores.volver="Volver"`
- `ui.ficha.media="Media temporada"`, `ui.ficha.ultima="Última valoración"`, `ui.ficha.evolucion="Evolución"`, `ui.ficha.estado="Estado actual"`, `ui.ficha.disponible="✅ Disponible"`, `ui.ficha.lesionado="🚑 Lesionado"`, `ui.ficha.baja="❌ Baja"`, `ui.ficha.sin_penalizacion="✅ Sin penalización (0)"`, `ui.ficha.racha="⚠️ −{n}"`, `ui.ficha.no_aplica="No aplica"`, `ui.ficha.sin_dorsal/descripcion="Sin descripción"`
- `errors.carga="Error al cargar"`, `errors.reintentar="Reintentar"`

## 7. Estrategia tests Vitest

Entorno `node` para puras + `happy-dom`/SSR mínimo para componentes si 01 lo permite; reloj inyectado, BD mockeada, sin fetch real.
- `src/lib/home/resolver-jornada.test.ts`: abierta → `HH:MM:SS` (`76:00:00` >24h), segundo exacto de cierre → `Cerrado`, salto solo al `calculada/papel`, sin `pendiente` → última + `Sin próxima jornada`, 0 jornadas → vacía, J1 `papel` salta a J2 (E-02/E-03).
- `src/lib/home/top3.test.ts`: olímpico `1,1,3`, corte en 3 con 4 empatados, exclusión Admin y `-10`, exclusión `Maider/Páter`, desempate Jugadores por `nombre` real invariante a Pete, `Sin datos` sin `calculada` o sin envíos (E-01/05/06).
- `src/lib/ficha/media-evolucion.test.ts`: media 1 decimal half-up solo `jugo` (`BASE=0✅` cuenta, `🚑/❌` no), 0 jugados → `Sin datos`, `Última` con icono correcto, `papel` excluida de media/última/evolución, alta J6 excluye J1–J5, 1 jornada → punto único, negativos cruzan `0` (E-07/08/09/14).
- `src/app/components/*.test.ts`: placeholders (`Sin dorsal`, `Posición pendiente`, avatar `public/`, `Por confirmar`), `Baja`, `Jugador no encontrado` para uuid inexistente/`Maider/Páter`, 2 líneas de estado, racha oculta para Admin, scroll confinado a `.grafica-scroll` (0 scroll página).
- Puerta: `npx tsc --noEmit` 0 errores, cero `any`, `npm run lint` 0 warnings, `npm test` verde, `npm run build` verde.

## 8. Trazabilidad RF → plan

- RF-01 → §2 D-08 + `page.tsx`/`jugadores/**` (proxy).
- RF-02 → D-02 + `queries-home.ts` + test throttle/silencio FNB.
- RF-03/04/05/06/07 → D-01/03 + `cuenta-atras.tsx` + `bloque-partido.tsx` + `resolver-jornada.test.ts`.
- RF-08/09/10/11 → D-04 + `top3.ts` + `top-*.tsx` + `top3.test.ts`.
- RF-12/13/14 → `jugadores/page.tsx`, `[id]/page.tsx`, `ficha-cabecera.tsx` + tests placeholders/Baja/no-encontrado.
- RF-15/16 → D-05/06 + `media-evolucion.ts` + `ficha-media/evolucion/grafica` + tests.
- RF-17/18 → `estado-actual.ts` + `tooltip-normas.tsx` (→ `/normas#base/#racha`).
- RF-19/20 → D-07/09 + `error.tsx` + claves §6 + test BD-caída vs FNB-caída.
