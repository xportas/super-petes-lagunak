# Plan técnico — 03 Modelo de datos y semilla

Fuente: `specs/03-modelo-datos-y-semilla/spec.md` + `CONSTITUTION.md` + `AGENTS.md` + `README.md §0/§8` + `specs/10-scraping-fnb/fnb-api-reference.md` + planes 01/02.
Alcance: solo diseño. No incluye código de producción. La lógica real la implementará la fase de build de esta spec.

Prerrequisito: spec-01 aplicada (TS `strict`, Vitest, `es/strings.json` mínimo, `public/players/placeholder*.webp`) y spec-02 aplicada (`src/lib/scoring/constantes.ts`, tipos `Posicion/Entrenador/EstadoJornada`, `calcularCierre/validarQuinteto/calcularRachas`). Esta 03 mapea esos DTOs a tablas, no los redefine. Incluye la actualización conjunta de spec-02 que exige RF-11 (papel).

## 1. Modelos de datos

Solo entradas crudas en BD. Cero totales, desgloses, MVP, rachas o cierres persistidos (RF-06/RF-14/RF-15/RF-16). Cierre y racha siempre derivados con spec-02.

```text
usuario(id uuid PK, username text display, username_normalizado text UNIQUE,
  password_hash text, es_temporal bool, onboarding_paso smallint,
  onboarding_completado_at timestamptz NULL, rol 'manager|admin', creado_at timestamptz)
  -- RF-03/RF-04. Formato username, longitud password, caducidad y umbrales: dueña spec-04.

sesion(id uuid PK, usuario_id FK usuario, token_hash text UNIQUE,
  expira_at timestamptz, ultima_renovacion_at timestamptz, revocada_at timestamptz NULL)
  -- RF-03. 30 días sliding, multi-dispositivo; revocación individual o total.

invitacion_liga(id uuid PK, codigo text UNIQUE, vigente bool, creada_at timestamptz)
  -- RF-03. Invariante: una sola fila vigente. Rotar = insert nuevo + vigente=false anterior.
  -- No afecta a cuentas ya creadas.

rate_limit(alcance text, sujeto text, intentos int, primer_fallo_at timestamptz,
  bloqueado_hasta timestamptz NULL, PK(alcance,sujeto))
  -- RF-03. Una fila única por (alcance, sujeto), ventana fija 15m desde primer_fallo_at.
  -- Alcances y umbrales: dueña spec-04.

jugador(id uuid PK, nombre text, nombre_fnb text, dorsal smallint NULL,
  posiciones_validas char(2)[] NULL, nombre_pete text NULL,
  img text, img_pete text, descripcion text, fnb_uuid uuid UNIQUE NULL,
  estado_sanitario 'disponible|lesionado', activo bool,
  fecha_alta timestamptz, fecha_baja timestamptz NULL)
  -- RF-01/RF-07/RF-10/RF-20. Vigente en jornada J:
  --   fecha_alta <= cierre_J AND (fecha_baja IS NULL OR fecha_baja > cierre_J)
  --   + bajas que jugaron el acta + bajas en alguna alineación guardada de J (como no_convocado).
  -- posiciones_validas NULL solo si activo=true en bandeja Pendientes: visible en
  -- /jugadores con "Posición pendiente", no elegible en /equipo ni /onboarding,
  -- bloquea el cálculo del acta donde figure. Dorsal repetible, nunca mapea.
  -- nombrePete no único (cosmético). Fotos en public/, 0 MB Storage.

entrenador(slug 'maider|pater' PK, nombre text, img text, fnb_uuid uuid UNIQUE)
  -- RF-02. Sin posiciones, dorsal, nombrePete ni imgPete. Invariante a Modo Pete.
  -- Nunca se sincroniza contra FNB (spec-10). Tercer entrenador se rechaza.

jornada(id uuid PK, numero_jornada int UNIQUE, numero_jornada_fnb int NULL,
  rival text, es_local bool, campo text NULL, municipio text NULL,
  hora_partido timestamptz, estado 'pendiente|calculada|papel|invalidada',
  fnb_match_id text UNIQUE NULL, fnb_universally_id text NULL,
  marcador_local smallint NULL, marcador_visitante smallint NULL,
  origen_resultado 'manual|fnb' NULL,
  last_calendar_sync timestamptz NULL, last_result_sync timestamptz NULL)
  -- RF-05/RF-06/RF-11/RF-18. Orden canónico: hora_partido ASC, numero_jornada ASC.
  -- cierre siempre derivado hora-3h Europe/Madrid, nunca columna.
  -- calculada incompleta tras edición/re-sync pasa a invalidada, nunca a pendiente.

fnb_partidos_ignorados(fnb_match_id text PK, eliminado_at timestamptz)
  -- RF-05. fnb_match_id descartados por Admin para que el auto-sync no los recree.

alineacion(id uuid PK, manager_id FK usuario, jornada_id FK jornada,
  entrenador 'maider|pater', capitan_jugador_id FK jugador,
  instante_inicio timestamptz, UNIQUE(manager_id, jornada_id))
  -- RF-12. Una única alineación por manager/jornada, editable hasta cierre.
  -- Vale la última enviada con instante estrictamente anterior al cierre.

alineacion_seleccion(alineacion_id FK alineacion, jugador_id FK jugador,
  posicion_alineada 'B|E|A|AP|P', PK(alineacion_id, jugador_id))
  -- RF-10/RF-12. 5 filas por alineación, letra guardada tal cual sin normalizar.

resultado_jugador(jornada_id FK jornada, jugador_id FK jugador,
  valoracion int, estado 'jugo|lesionado|no_convocado|dnp',
  expulsado bool, PK(jornada_id, jugador_id))
  -- RF-07/RF-08/RF-09. Crudo por jugador vigente. Motivo de expulsión resuelto
  -- antes de guardar con esExpulsion() spec-02 (incluye 5 personales). Sin conteos.
```

Semilla RF-19:
- 12 jugadores §3.4 `fnb-api-reference.md` con `fecha_alta='2026-09-01T00:00:00+02:00'` (previa a J1/J2), 2 posiciones provisionales editables, `img/imgPete` a placeholders.
  - 8 MARIO SARASA GIL `c66dee66-eb38-11e9-83ca-0216824770c2`, 10 INARI ITURRI CILVETI `c663ea09-…`, 12 IKER BALDA AFONSO `c66df5a9-…`, 14 IÑIGO ORTEGA CARCAMO `c67324d5-…`, 15 XABIER PORTAS GONZALEZ `9fb20b1e-…`, 16 MARCOS GOMEZ ARNEDO `d441b014-…`, 17 ANDONI ESTIRADO GAISAN `6d3c74db-…`, 21 JAVIER BRINGAS BASTERRA `c66df169-…`, 22 OSKAR ZURDO FERNANDEZ `579eb47a-…`, 23 ASIER VALENCIA ARBIZU `c66df3c0-…`, 30 MARC CATALAN FEIJOO `c6684685-…`, DAVID VITAL PAGOLA `c668475e-…` (no convocado J2).
- 2 entrenadores: Maider `c663ff92-eb38-11e9-83ca-0216824770c2`, Páter `c66dca7c-eb38-11e9-83ca-0216824770c2`.
- Admin semilla (único usuario, sin quinteto, excluido de rankings) + código invitación inicial vía env con fallback dev.
- J1 `55483` (`2026-10-03 18:00 Europe/Madrid`, `universallyid=null`, estado `papel`) + J2 `55488` (`2026-10-11 18:00`, `universallyid=6acbcc7bd75749bb61a786f8`, estado `calculada`, 11 valoraciones `1,6,12,7,2,0,8,1,-1,13,-1` + VITAL `no_convocado`).

## 2. Decisiones justificadas

| # | Decisión | Elegida | Alternativa descartada | Justificación |
|---|---|---|---|---|
| D-01 | Sin columnas calculadas | Solo crudo; totales/rachas/MVP/cierre derivados en `scoring/dominio` | Columnas `total_jornada`, `racha`, `es_mvp`, `cierre` | RF-06/14/15 + Const §5 + AGENTS: dos fuentes divergen; UI y `/normas` derivan del motor |
| D-02 | `entrenador` tabla propia con `slug` PK | `maider\|pater` + `fnb_uuid UNIQUE` | Mezclar con `jugador` + flag, o id aleatorio inventado | RF-02: evita Maider en slot jugador y tercer entrenador; uuid verificado da vínculo estable |
| D-03 | `username_normalizado` UNIQUE | `trim+lower()` en app + `CHECK(normalizado=lower(normalizado))` | `citext` o UNIQUE sobre display | RF-20/E-10 + spec-04: case-insensitive sin extensión; display preserva mayúsculas |
| D-04 | `posiciones_validas` NULL temporal | `char[] NULL` + CHECK `cardinality=2` cuando NOT NULL, tal cual | `NOT NULL` siempre o normalizar `A→E` | RF-01/RF-10: permite auto-alta FNB en Pendientes no elegible que bloquea cálculo; `["E","A"]` vale |
| D-05 | Alineación en 2 tablas | `alineacion` + `alineacion_seleccion` (5 filas) | 5 columnas `j1..j5` o `jsonb` | RF-12: FK por jugador, 5 distintos verificable, joins para vigencia/rachas; jsonb pierde integridad |
| D-06 | Acta solo `bool expulsado` | Conteos se resuelven con `esExpulsion()` spec-02 antes de guardar | Persistir `personal/tecnica/...` | RF-07/RF-09 + spec-02 RF-11: la BD guarda la decisión, no la evidencia; evita reinterpretar en SQL |
| D-07 | `hora_partido timestamptz`, cierre sin columna | `hora-3h` en ms en `dominio/cierre.ts`, `Europe/Madrid` solo parse/format | Columna `cierre` o `timestamp without tz` | RF-06: el cambio de hora recalcula sin invalidar ni resucitar; timestamptz evita bug DST |
| D-08 | RLS `DENY ALL` sin políticas `anon` | `ENABLE RLS` en todas, cero políticas para `anon`, solo `service_role` en servidor tras sesión+rol | Políticas abiertas o cliente `anon` en browser | RF-04 + AGENTS Supabase: exterior denegado; manager/admin se autorizan en backend |
| D-09 | Rate-limit 1 fila por `(alcance,sujeto)` | PK compuesta + ventana fija desde `primer_fallo_at` | Tabla de eventos o memoria volátil | RF-03 + spec-04 RF-05: persistente en serverless, reinicio determinista |
| D-10 | `origen_resultado` a nivel jornada | `manual\|fnb` en `jornada`, sin mixtos | Flag por jugador | RF-18 + spec-10 RF-10: el manual bloquea el auto salvo Re-importar explícito |
| D-11 | Papel como estado | `papel`: `0` excluido + rompe rachas, sin manual posterior | `−10` como ausencia o borrar J1 | RF-11/E-03: causa externa con gracia 24h; excepción consciente a manual garantizado |
| D-12 | Supabase solo vía servidor | `src/lib/supabase/cliente.ts` con `service_role`, nunca al cliente | Cliente `anon` en browser | RF-04: secretos solo `.env.local`, sesión httpOnly + rol validados en backend |
| D-13 | Zod solo en borde | `src/lib/supabase/esquemas.ts` + `dominio/esquemas.ts` (spec-02) para seed/Server Actions | Solo CHECKs o Zod dentro del motor | AGENTS: validación de esquema en servidor; el motor puro no conoce Zod ni SQL |

## 3. Archivos exactos a crear / modificar / no tocar

Respetando la estructura objetivo de AGENTS.md. No se crea `src/app/normas/*` (spec-05), ni `eu.json`, ni `src/proxy.ts` (spec-04).

### Crear

- `supabase/migrations/0001_nucleo_03.sql` — tablas + UNIQUE/CHECK/FK + `ENABLE ROW LEVEL SECURITY` sin políticas `anon` + índices `jugador(fnb_uuid)`, `jornada(fnb_match_id, hora_partido)`, `resultado_jugador(jornada_id)`. **Cubre RF-01–RF-10/RF-12/RF-20.**
- `supabase/migrations/0002_semilla_03.sql` — o `supabase/seed.sql` si se usa `db seed`: 12 jugadores + 2 entrenadores + J1 `papel` + J2 `calculada` (11+1). Admin + invitación NO en SQL, vía script con env. **Cubre RF-19.**
- `src/lib/supabase/tipos.ts` — `JugadorRow, EntrenadorRow, JornadaRow, AlineacionRow, AlineacionSeleccionRow, ResultadoJugadorRow, UsuarioRow, SesionRow, InvitacionRow, RateLimitRow` (mapeo 1:1, negocio en español). **Cubre RF-01–RF-07.**
- `src/lib/supabase/cliente.ts` — `crearClienteServidor()` con `service_role` (lanza sin env, jamás al cliente). **Cubre RF-04.**
- `src/lib/supabase/mapeo.ts` — puro sin IO: `aEntradaJugador()`, `normalizarUsername()`, `normalizarNombreFNB()`, `esVigenteEn()`, `truncarValoracion()`. **Cubre RF-01/RF-17/RF-20.**
- `src/lib/supabase/esquemas.ts` — Zod de borde: `esquemaJugadorSeed`, `esquemaGuardarAlineacion`, `esquemaActaManual` (ver §4). **Cubre RF-07/RF-09/RF-10/RF-12.**
- `src/lib/supabase/semilla.ts` — `datosSemilla()` puro con los 12 uuid + J1/J2 (lee `ADMIN_USERNAME/ADMIN_PASSWORD_HASH/CODIGO_INVITACION` con fallback dev). **Cubre RF-19.**
- `src/lib/supabase/queries.ts` — solo firmas tipadas (o `never` si 09/10 aún no existen); sin lógica de scoring. **Cubre RF-04/RF-05.**
- Tests junto al módulo: `mapeo/esquemas/semilla/rls.test.ts` (ver §7).
- `public/players/placeholder.webp`, `public/players/placeholder-pete.webp` — solo si spec-01 no los creó. No tocar `public/coaches/*.webp`.

No crear: `src/lib/scoring/*` (dueña 02), `src/lib/fnb/*` (dueña 10), Server Actions de auth/equipo/admin (dueñas 04/06/09).

### Modificar

- `package.json` — añadir `@supabase/supabase-js` + `zod` (si 02 no lo añadió).
- `es/strings.json` — añadir claves §6 sin renombrar las de 01/02.
- `vitest.config.ts` (de 01) — mantener umbral e incluir `src/lib/supabase/**`.
- `specs/02-motor-puntuacion-y-dominio/spec.md` — actualizar RF-21/E-24 con la excepción papel RF-11 en el mismo cambio.

### No tocar

- `src/lib/scoring/*`, `src/lib/fnb/*`, `src/app/*`, `README.md §0` (si contradice Maider/Páter, proponer aparte), `src/proxy.ts`.

## 4. Tipos de dominio en TypeScript strict y esquemas Zod

Convenciones AGENTS: `strict` + `noUncheckedIndexedAccess`, cero `any` (`unknown` + narrowing), `readonly`, `kebab-case`, negocio en español.

```ts
// src/lib/supabase/tipos.ts
import type { Posicion } from '@/src/lib/scoring/tipos';
export type Rol = 'manager' | 'admin';
export type EstadoSanitario = 'disponible' | 'lesionado';
export type EstadoActa = 'jugo' | 'lesionado' | 'no_convocado' | 'dnp';
export type EstadoJornada = 'pendiente' | 'calculada' | 'papel' | 'invalidada';
export interface JugadorRow {
  readonly id: string; readonly nombre: string; readonly nombreFnb: string;
  readonly dorsal: number | null;
  readonly posicionesValidas: readonly [Posicion, Posicion] | null;
  readonly nombrePete: string | null; readonly img: string; readonly imgPete: string;
  readonly descripcion: string; readonly fnbUuid: string | null;
  readonly estadoSanitario: EstadoSanitario; readonly activo: boolean;
  readonly fechaAlta: Date; readonly fechaBaja: Date | null;
}
export interface JornadaRow {
  readonly id: string; readonly numeroJornada: number;
  readonly numeroJornadaFnb: number | null; readonly rival: string;
  readonly esLocal: boolean; readonly campo: string | null;
  readonly municipio: string | null; readonly horaPartido: Date;
  readonly estado: EstadoJornada; readonly fnbMatchId: string | null;
  readonly fnbUniversallyId: string | null;
  readonly marcadorLocal: number | null; readonly marcadorVisitante: number | null;
  readonly origenResultado: 'manual' | 'fnb' | null;
  readonly lastCalendarSync: Date | null; readonly lastResultSync: Date | null;
}
export interface AlineacionRow { readonly id: string; readonly managerId: string;
  readonly jornadaId: string; readonly entrenador: 'maider' | 'pater';
  readonly capitanJugadorId: string; readonly instanteInicio: Date; }
export interface AlineacionSeleccionRow { readonly alineacionId: string;
  readonly jugadorId: string; readonly posicionAlineada: Posicion; }
export interface ResultadoJugadorRow { readonly jornadaId: string;
  readonly jugadorId: string; readonly valoracion: number;
  readonly estado: EstadoActa; readonly expulsado: boolean; }
export interface UsuarioRow { readonly id: string; readonly username: string;
  readonly usernameNormalizado: string; readonly passwordHash: string;
  readonly esTemporal: boolean; readonly onboardingPaso: number;
  readonly onboardingCompletadoAt: Date | null; readonly rol: Rol; }
```

```ts
// src/lib/supabase/esquemas.ts — único sitio con unknown (borde)
import { z } from 'zod';
export const esquemaPosicionesValidas = z.tuple([esquemaPosicion, esquemaPosicion]);
export const esquemaGuardarAlineacion = z.object({
  jornadaId: z.string().uuid(), jugadorIds: z.array(z.string().uuid()).length(5),
  posicionPorJugador: z.record(z.string().uuid(), esquemaPosicion),
  entrenador: z.enum(['maider', 'pater']), capitanId: z.string().uuid(),
  instanteInicio: z.date(),
}).superRefine((v, ctx) => { /* duplicados y capitán ∈ quinteto */ });
export const esquemaActaManual = z.array(z.object({
  jugadorId: z.string().uuid(), valoracion: z.number().int(),
  estado: z.enum(['jugo', 'lesionado', 'no_convocado', 'dnp']),
  expulsado: z.boolean(),
})).superRefine((filas, ctx) => {
  /* lesionado/no_convocado/dnp + expulsado = inválido; no-jugado => valoracion 0 */
});
```

Zod no entra en `scoring`: el motor recibe tipos ya estrechados con `expulsado` derivado por `esExpulsion()`.

## 5. Contratos de funciones puras / Server Actions / tablas Supabase

```ts
// puras, sin IO (src/lib/supabase/mapeo.ts)
normalizarUsername(u: unknown): string;          // trim + lower
normalizarNombreFNB(n: string): string;          // NFD sin tildes, lower, colapsa espacios
esVigenteEn(fechaAlta: Date, fechaBaja: Date | null, cierre: Date): boolean;
truncarValoracion(v: number): number;            // Math.trunc en ingesta FNB
resolverVinculoPorNombre(nombreActa: string, plantilla: readonly JugadorRow[]): 0 | 1 | number;
// 0 = sin coincidencia, 1 = auto-vincula y guarda uuid, N = pendiente manual
```

Server Actions: 0 nuevas en esta spec. Expone queries/mapeo para spec-04 (registro/login/onboarding/rate-limit/sesiones), spec-06 (guardar alineación con `validarCierre` + `validarQuinteto` spec-02), spec-09 (CRUD plantilla/jornada, acta manual, Re-importar, recálculo como revalidación) y spec-10 (Lazy Sync con throttle `24h/1h/+3h` y lock). Ninguna recalcula scoring en SQL.

Tablas afectadas: `usuario, sesion, invitacion_liga, rate_limit, jugador, entrenador, jornada, fnb_partidos_ignorados, alineacion, alineacion_seleccion, resultado_jugador`. Todas con `ENABLE ROW LEVEL SECURITY`, sin políticas para `anon`; mutaciones solo vía cliente servidor `service_role` tras validar sesión httpOnly y rol.

## 6. Claves i18n nuevas para `es/strings.json`

Reutiliza `errors.close.*`, `errors.calculo.*`, `errors.alineacion.*` de spec-02. Solo persistencia/semilla (textos los consumen 04/09); no crear `ui.*` ni `ui.normas.*` (dueñas 04–09/05):

- `errors.db.username_duplicado`, `errors.db.fnb_uuid_duplicado`
- `errors.db.posiciones_invalidas`, `errors.db.jugador_pendiente_bloquea`
- `errors.db.tercer_entrenador`, `errors.db.admin_no_juega`
- `errors.db.jornada_papel_sin_manual`, `errors.db.sin_hora`
- `errors.semilla.incompleta`

## 7. Estrategia de tests en Vitest

- Entorno `node`, factories `jugadorRow()/jornadaRow()`, cliente Supabase mockeado. Reloj inyectado (`instanteInicio`, `hora_partido`), sin BD real ni fetch.
- Casos obligatorios (DoD spec): unicidad `username` case-insensitive y `fnb_uuid` con dorsal repetible y `nombrePete` no único; 2 posiciones con `["E","A"]` tal cual y NULL que bloquea salvo papel; lesión/expulsión excluyentes; lesionado respetado con 0 min/ausencia y `jugo` con minutos; papel auto con `0` + excluida de todo + rompe, en gracia sigue `pendiente` con manual; ausencia normal con `−10` + rompe y alta/onboarding tardío respecto a `hora−3h` sin retroactivo; 1 alineación con instante de inicio y rechazo en el segundo exacto; cambio de hora sin resucitar/anular; manual que bloquea salvo Re-importar y corrección `fnb` que sí reimporta; mapeo solo por `uuid` con fallback por nombre (0/2+ a pendiente) y dorsal que nunca mapea; plantilla viva alta/baja sin reescribir histórico y tercer entrenador rechazado.
- Puerta: `npx tsc --noEmit` 0 errores, cero `any`, `npm run lint` 0 warnings, `npm test` verde + umbral, `npm run build` verde.

## 8. Trazabilidad requisito → plan

- RF-01 plantilla viva → tabla `jugador` + `esVigenteEn/mapeo` + `esquemaJugadorSeed` + tests vigencia/placeholder.
- RF-02 entrenadores → tabla `entrenador` + test tercer-entrenador.
- RF-03 auth persistida → `usuario/sesion/invitacion_liga/rate_limit` + `normalizarUsername`; formato/sesión/ventanas dueña spec-04.
- RF-04 RLS + admin no juega → RLS DENY + `cliente.ts` + test admin-rechazo.
- RF-05 jornada + FNB → `jornada` + `fnb_partidos_ignorados` + columnas throttle; comportamiento dueño spec-10.
- RF-06 cierre derivado → sin columna + `calcularCierre` spec-02 + test cambio-hora.
- RF-07 crudo → `resultado_jugador` + `esquemaActaManual` + test bloqueo-incompleto.
- RF-08 lesionado previo → `estado_sanitario` + tests respeto/minutos.
- RF-09 excluyentes → CHECK + Zod + test.
- RF-10 posiciones tal cual → CHECK + Zod + test `["E","A"]`.
- RF-11 papel → `estado='papel'` + gracia 24h + tests + update spec-02.
- RF-12 una alineación editable → `alineacion(+seleccion)` UNIQUE + `instante_inicio` + test segundo-exacto.
- RF-13 `−10` sin retroactivo → sin fila fantasma + `onboarding_completado_at < cierre` + tests.
- RF-14 racha derivada → sin contador + `calcularRachas` spec-02 + test papel-rompe.
- RF-15 sin totales → 0 columnas totales + test deriva-motor.
- RF-16 MVP solo calculado → sin flag + test sin-campo.
- RF-17 auto + manual + uuid → `fnb_uuid/nombre_fnb` + `resolverVinculoPorNombre` + tests.
- RF-18 manual bloquea → `origen_resultado` + tests Re-importar.
- RF-19 semilla → `semilla.ts` + migraciones + test J1-papel/J2-calculada.
- RF-20 unicidades → UNIQUEs + tests.
- RF-21 pendientes sin notis → NULL-posiciones + bandeja + test bloquea-cálculo.
