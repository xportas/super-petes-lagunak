# Plan técnico — 10 Sincronización FNB vía API OWC

Fuente: `specs/10-scraping-fnb/spec.md` + `specs/10-scraping-fnb/fnb-api-reference.md` + `CONSTITUTION.md §3/§5/§11` + `AGENTS.md` + `README.md §0/§8` + planes 02/03 + spec 09.
Alcance: solo diseño. No incluye código de producción. La lógica real la implementará la fase de build de esta spec.

Prerrequisitos: spec-01 aplicada (TS `strict`, Vitest, `es/strings.json` mínimo, `zod`), spec-02 aplicada (`src/lib/scoring/constantes.ts`, `esExpulsion`, `calcularCierre`, tipos `Posicion/EstadoJornada`), spec-03 aplicada (tablas `jugador/entrenador/jornada/fnb_partidos_ignorados/resultado_jugador`, columnas `fnb_uuid`, `fnb_match_id`, `fnb_universally_id`, `origen_resultado`, `last_calendar_sync/last_result_sync`, semilla 12 uuid + J1/J2). Esta 10 no crea tablas ni UI; solo `src/lib/fnb/` puro + fetch + orquestación Lazy Sync consumible por Server Components (Home/calendario) y Server Actions de 09 (Admin).

## 1. Modelos de datos

Cero SQL/DDL en esta spec (dueña 03). Solo tipos de borde FNB y DTO normalizado que 03/09 persisten.

```ts
// src/lib/fnb/tipos.ts — crudo OWC (lo que viene por cable)
export interface MatchFnbCrudo {
  readonly idMatch: string;
  readonly universallyid: string | null;
  readonly numMatchDay: string;
  readonly matchDay: string; // "YYYY-MM-DD HH:mm:ss", hora local Europe/Madrid
  readonly state: string; // "1" = finalizado
  readonly idLocalTeam: string;
  readonly nameLocalTeam: string;
  readonly idVisitorTeam: string;
  readonly nameVisitorTeam: string;
  readonly nameField: string | null;
  readonly adressField: string | null;
  readonly nameTown: string | null;
  readonly localScore: string | null;
  readonly visitorScore: string | null;
}

export interface ActaJugadorFnbCrudo {
  readonly uuid: string;
  readonly name: string;
  readonly dorsal: string;
  readonly timePlayed: number;
  readonly valoracion: number;
  readonly conteos: ConteosFaltas; // tipo de spec-02
}

export interface JornadaNormalizada {
  readonly fnbMatchId: string;
  readonly fnbUniversallyId: string | null;
  readonly numeroJornadaFnb: number | null;
  readonly horaPartido: Date;
  readonly esLocal: boolean;
  readonly rival: string;
  readonly campo: string | null;
  readonly municipio: string | null;
  readonly finalizado: boolean;
  readonly marcadorLocal: number | null;
  readonly marcadorVisitante: number | null;
}

export interface ActaJugadorNormalizada {
  readonly fnbUuid: string;
  readonly nombreActa: string;
  readonly dorsal: string;
  readonly minutos: number;
  readonly valoracionTruncada: number; // Math.trunc en ingesta
  readonly estadoPropuesto: 'jugo' | 'no_convocado' | 'dnp';
  readonly expulsado: boolean; // ya resuelto con esExpulsion() spec-02
}

export interface ActaNormalizada {
  readonly fnbMatchId: string;
  readonly fnbUniversallyId: string;
  readonly porJugador: readonly ActaJugadorNormalizada[];
}

export type VeredictoSync =
  | { readonly accion: 'nada' }
  | { readonly accion: 'calendario' }
  | { readonly accion: 'importar-acta'; readonly acta: ActaNormalizada }
  | { readonly accion: 'papel'; readonly marcadorLocal: number; readonly marcadorVisitante: number };
```

Reglas de mapeo congeladas (spec RF-06–RF-08, referencia §3.3):
- `BASE = Math.trunc(data.valoration)` en ingesta, antes de persistir o pasar al motor 02.
- `timePlayed > 0 → jugo`; presente con `0 → dnp`; ausente del acta → `no_convocado`.
- `lesionado` previo del Admin se respeta con 0 minutos o ausencia; con minutos pasa a `jugo` con `BASE` real.
- Expulsión vía `esExpulsion()` spec-02 (incluye `personal >= 5`); MVP FNB siempre ignorado; dorsal nunca mapea; entrenadores nunca se sincronizan; acumulados `team-stats` fuera de uso.

## 2. Decisiones justificadas

| # | Decisión | Elegida | Alternativa descartada | Justificación |
|---|---|---|---|---|
| D-01 | Solo JSON OWC, fetch en servidor | `cliente-esb.ts` + `cliente-msstats.ts` con `fetch` + header `federation: fnb`; ESB Base64→JSON | Parsear HTML `fnbaloncesto.com` o headless (Puppeteer/Playwright) | RF-01 + referencia §1: HTML es contenedor vacío que cambia sin aviso. Sin headless por Const §3 |
| D-02 | `src/lib/fnb/` sin IO de BD | Funciones puras + funciones con `fetch` inyectable; la BD la tocan 03/09 vía repos/queries | SQL o Supabase dentro de `fnb/` | Const §5 + AGENTS: no duplicar scoring; testeable sin BD/red; RLS/`service_role` dueños de 03 |
| D-03 | Constantes FNB locales, reglas en `scoring/constantes.ts` | `ID_TEAM=11659`, bases URL, ventanas `24h/1h/+3h` en `fnb/constantes.ts`; reutiliza `HORAS_CIERRE=3`, `GRACIA_PAPEL_HORAS=24` de scoring | Redefinir `3h/24h` en fnb | AGENTS: una sola fuente de números; `/normas` inyecta desde scoring vía `{var}` |
| D-04 | `matchDay` como `Europe/Madrid` sin librería | Parseo manual `YYYY-MM-DD HH:mm:ss` → `Date` con offset de Madrid + `calcularCierre` spec-02 | `luxon/date-fns-tz` | RF-03/E-12: zona solo en parse/format; resta `hora-3h` en ms independiente de DST; sin dep nueva |
| D-05 | Zod solo en borde OWC + URL | `esquemas.ts` valida `Match`, `fitxaPartit`, `getJsonWithMatchStats`, `pagina-partido/?id\|?uuid` | `unknown` propagado o validación manual con `if` | AGENTS: zod en servidor; el motor recibe tipos estrechados |
| D-06 | Mapeo `fnb_uuid` primero, fallback nombre normalizado | `normalizarNombreFNB()` NFD sin tildes + lower + colapsa espacios; `0` o `2+` coincidencias → pendiente manual; guarda `uuid` al vuelo si `1` | Mapear por dorsal o auto-crear por nombre exacto | RF-05/E-09 + spec-03 RF-17: dorsal informativo y repetible; evita vincular al equivocado |
| D-07 | Auto-alta vinculada sin posiciones bloquea cálculo | Crea `activo=true, posiciones_validas=NULL` visible en `/jugadores` con `Posición pendiente`, no elegible en `/equipo`, jornada a `pendiente`/`invalidada` | Asignar posiciones por defecto o calcular con `0` provisional | RF-06/E-08 + spec-02 RF-15 + spec-03 RF-01: sin 2 posiciones no hay `+5` válido; prohibido `0` provisional |
| D-08 | Pre-relleno sin guardar, verificación por re-fetch | `preRellenarActaDesdeUrl()` devuelve `ActaNormalizada` al formulario 09 sin escribir BD; al guardar, el servidor re-descarga el acta y compara valor a valor para fijar `origen_resultado` | Firmar payload con HMAC o confiar en flag cliente | RF-10/RF-11: evita secreto nuevo; el acta es pública; sin parcial guardado ante URL inválida/ajena/FNB caída |
| D-09 | Throttle con `last_*_sync` + lock por transacción | `sincronizarSiToca()` comprueba `24h/1h/+3h` y hace `SELECT … FOR UPDATE` sobre fila `jornada`; resto sirve BD; sin `revalidatePath` en SSR | Cron/worker/Realtime o polling agresivo | Const §3 + RF-04/E-19: sin demonios; evita doble escritura en lecturas concurrentes |
| D-10 | Segunda fase aditiva con doble numeración | `numero_jornada` correlativo propio UNIQUE + `numero_jornada_fnb` nullable; respeta `fnb_partidos_ignorados` | Sobrescribir `numero_jornada` con `numMatchDay` FNB o borrar histórico | RF-02/E-16 + spec-03 RF-05 + spec-09 RF-02: evita colisión si FNB reinicia en `1`; borrados Admin no resucitan |
| D-11 | Papel solo tras `hora+24h` con `state=1` y `universallyid=null` | Guarda marcador, estado `papel`, `0` excluido + rompe rachas, sin manual posterior; antes sigue `pendiente` con manual | Declarar papel al instante o `−10` como ausencia | RF-09/E-03/E-04 + spec-02 RF-21 + spec-03 RF-11: gracia ante acta tardía; causa externa no castiga con `−10` |
| D-12 | Manual bloquea auto, corrección `fnb` sí actualiza | Auto salta `origen_resultado='manual'`; sí reimporta si `origen='fnb'` corregida; solo `Re-importar` explícito con confirmación pisa manual | Timestamp o diff por campo | RF-10/RF-12/E-14 + spec-03 RF-18: corrección Admin prevalece; dato oficial corregido prevalece salvo manual |
| D-13 | i18n solo `errors.fnb.*` | Códigos que consume UI 09; cero `ui.*`, cero `ui.normas.*` | Literales en `fnb/` o claves `ui.admin.*` aquí | Spec-10 §4 + Const §9: textos de pantallas los definen 04–09; 05 dueña de `ui.normas.*` |

## 3. Archivos exactos a crear / modificar / no tocar

Respetando la estructura objetivo de `AGENTS.md`. No se crea `src/app/normas/*` (spec-05), ni `eu.json`, ni `src/proxy.ts` (spec-04).

### Crear

- `src/lib/fnb/constantes.ts` — `ID_TEAM='11659'`, `ESB_BASE`, `MSSTATS_BASE`, `VENTANA_CALENDARIO_MS=24h`, `VENTANA_RESULTADOS_MS=1h`, `VENTANA_CIERRE_RESULTADOS_MS=3h`. Reexporta `HORAS_CIERRE`, `GRACIA_PAPEL_HORAS` desde scoring, no los redefine. **Cubre RF-02/RF-04/RF-09.**
- `src/lib/fnb/tipos.ts` — tipos §1 (crudo OWC + normalizado). **Cubre RF-02/RF-03/RF-06.**
- `src/lib/fnb/esquemas.ts` — Zod de borde: `esquemaMatchFnb`, `esquemaFitxaPartit`, `esquemaMsStats`, `esquemaUrlFnb` (`?id=` vs `?uuid=`). Ver §4. **Cubre RF-01/RF-03/RF-11.**
- `src/lib/fnb/cliente-esb.ts` — `fetchEsb<T>(path, fetchFn)` Base64→`{result, messageData}`, errores `FNB_HTTP/FNB_ESB_ERROR`. **Cubre RF-01/RF-04.**
- `src/lib/fnb/cliente-msstats.ts` — `fetchMsStats<T>(path, fetchFn)` JSON directo. **Cubre RF-01.**
- `src/lib/fnb/normalizar.ts` — `normalizarNombreFNB()`, `parsearHoraMadrid()`, `truncarValoracion()` (`Math.trunc`). **Cubre RF-05/RF-06.**
- `src/lib/fnb/parseo-calendario.ts` — `normalizarJornada(m)` + `detectarSegundaFase()` + `fusionarCalendario()`. **Cubre RF-02/RF-03/RF-13.**
- `src/lib/fnb/parseo-acta.ts` — `normalizarActa(msStats, teamId)` filtra `teamIdExtern===11659`, aplica trunc/minutos/`esExpulsion()`, ignora MVP. **Cubre RF-06/RF-07/RF-08.**
- `src/lib/fnb/sync-calendario.ts` — `decidirSyncCalendario()` (24h) + fusión aditiva con doble numeración y respeto a ignorados. **Cubre RF-02/RF-04.**
- `src/lib/fnb/sync-resultados.ts` — `decidirSyncResultado()` (`hora+3h<=ahora` + `1h` + `pendiente` o `origen fnb`) + `resolverEstadoConLesionado()` + `decidirPapel()` + `debeSaltarManual()`. **Cubre RF-04/RF-06/RF-09/RF-10/RF-12/RF-13.**
- `src/lib/fnb/index.ts` — barrel.
- Tests junto al módulo: `normalizar/parseo-calendario/parseo-acta/sync-calendario/sync-resultados/clientes.test.ts` + `fixtures/j2-55488.json`, `fixtures/j1-55483.json` (recortes de referencia, no HTML). Ver §7.

No crear: `src/lib/scoring/*` (dueña 02), `src/lib/supabase/*` y migraciones (dueña 03), Server Actions de admin o páginas (dueñas 07/09).

### Modificar

- `es/strings.json` — añadir solo claves §6, sin renombrar las de 01/02/03.
- `vitest.config.ts` (de 01) — incluir `src/lib/fnb/**` en cobertura; mantener 100% de 02 en scoring/dominio, exigir ≥90% líneas en `fnb/`.
- `specs/10-scraping-fnb/fnb-api-reference.md` — ya cubre J2 con 5 faltas como expulsión, acumulados fuera de uso y dorsal nunca mapea; si la FNB cambia, actualizar en el mismo cambio sin improvisar en código.

No añadir dependencias (`fetch` nativo + `Buffer` + `zod` de 02 + `supabase-js` de 03).

### No tocar

- `src/lib/scoring/*`, `src/lib/dominio/*` — solo importar (`esExpulsion`, `calcularCierre`, constantes). Si se detecta contradicción de expulsión/MVP, proponer corrección aparte.
- `src/lib/supabase/*`, `supabase/migrations/*` — dueña 03.
- `src/app/*` incl. `/admin`, `/` Home — dueñas 07/09 (botones, pre-relleno UI, Server Actions). Esta 10 expone funciones para que 09 las llame.
- `src/proxy.ts`, `public/*`, `README.md §0`, `eu.json`, `src/app/normas/*`.

## 4. Tipos de dominio en TypeScript strict y esquemas Zod

Convenciones AGENTS: `strict` + `noUncheckedIndexedAccess`, cero `any` (`unknown` + narrowing), `readonly`, `kebab-case`, negocio en español (`valoracionFNB`, `horaPartido`).

```ts
// src/lib/fnb/esquemas.ts — único sitio con unknown (borde)
import { z } from 'zod';

export const esquemaMatchFnb = z.object({
  idMatch: z.string(),
  universallyid: z.string().nullable(),
  numMatchDay: z.string(),
  matchDay: z.string(),
  state: z.string(),
  idLocalTeam: z.string(),
  nameLocalTeam: z.string(),
  idVisitorTeam: z.string(),
  nameVisitorTeam: z.string(),
  nameField: z.string().nullable(),
  adressField: z.string().nullable(),
  nameTown: z.string().nullable(),
  localScore: z.string().nullable(),
  visitorScore: z.string().nullable(),
});

export const esquemaFitxaPartit = z.object({
  match: esquemaMatchFnb,
});

export const esquemaMsStatsPlayer = z.object({
  uuid: z.string(),
  name: z.string(),
  dorsal: z.string(),
  timePlayed: z.number(),
  data: z.object({
    valoration: z.number(),
    personal: z.number().int().min(0),
    unsportsmanslike: z.number().int().min(0),
    disqualification: z.number().int().min(0),
    scuffle: z.number().int().min(0),
    technique: z.number().int().min(0),
    coachTechnical: z.number().int().min(0),
    benchTechnical: z.number().int().min(0).optional(),
  }),
});

export const esquemaMsStats = z.object({
  teams: z.array(z.object({
    teamIdExtern: z.number(),
    players: z.array(esquemaMsStatsPlayer),
  })),
});

export const esquemaUrlFnb = z.union([
  z.object({ idMatch: z.string().min(1) }),
  z.object({ uuid: z.string().min(1) }),
]);
```

Zod no entra en `scoring`: `parseo-acta.ts` convierte conteos → `ConteosFaltas` spec-02 y llama `esExpulsion()`; la BD persiste `bool` ya resuelto.

## 5. Contratos de funciones puras / Server Actions / tablas Supabase

```ts
// puras, sin IO
normalizarNombreFNB(n: string): string;
parsearHoraMadrid(s: string): Date | null; // null → E-12 / spec-02 E-19 (cierre incalculable)
truncarValoracion(v: number): number; // Math.trunc en ingesta
normalizarJornada(m: MatchFnbCrudo): JornadaNormalizada | { error: 'SIN_HORA' };
normalizarActa(raw: unknown, teamId: '11659'): ActaNormalizada | { error: string };
decidirSyncCalendario(o: { lastCalendarSync: Date | null; ahora: Date }): boolean; // 24h
decidirSyncResultado(o: { horaPartido: Date; estado: EstadoJornada; origen: 'manual' | 'fnb' | null; lastResultSync: Date | null; ahora: Date }): boolean; // hora+3h<=ahora + 1h + pendiente|origen-fnb
decidirPapel(o: { state: string; universallyid: string | null; horaPartido: Date; ahora: Date }): 'pendiente' | 'papel'; // papel si state=1 + null + ahora>=hora+24h
debeSaltarManual(origen: 'manual' | 'fnb' | null, esReimporte: boolean): boolean;
resolverVinculo(nombreActa: string, plantilla: readonly { id: string; nombreFnb: string; fnbUuid: string | null }[]): { tipo: 'uuid' } | { tipo: 'nombre-unico'; id: string } | { tipo: 'pendiente' };
resolverEstadoConLesionado(o: { estadoPropuesto: 'jugo' | 'no_convocado' | 'dnp'; lesionadoPrevio: boolean; minutos: number }): 'jugo' | 'lesionado' | 'no_convocado' | 'dnp';

// con fetch inyectable (testeables, sin BD)
fetchEsb<T>(path: string, fetchFn?: typeof fetch): Promise<T>;
fetchMsStats<T>(path: string, fetchFn?: typeof fetch): Promise<T>;
descargarCalendario(fetchFn?: typeof fetch): Promise<MatchFnbCrudo[]>;
descargarActaPorId(idMatch: string, fetchFn?: typeof fetch): Promise<ActaNormalizada | { error: string }>;
descargarActaPorUuid(uuid: string, fetchFn?: typeof fetch): Promise<ActaNormalizada | { error: string }>;
preRellenarActaDesdeUrl(url: string, fetchFn?: typeof fetch): Promise<ActaNormalizada | { error: string }>; // nunca escribe BD
```

Server Actions: 0 nuevas en esta spec. Expone las anteriores para que spec-09 implemente `Sincronizar calendario FNB`, `Sincronizar acta / pegar URL` (solo pre-rellena, RF-11) y `Re-importar desde FNB` con confirmación (RF-10), más Lazy Sync en Server Components de Home/calendario (RF-04). Ninguna recalcula scoring: delegan a `calcularJornada` spec-02 y marcan `calculada/pendiente/invalidada/papel` según 09-RF-11. Sin `revalidatePath` durante SSR (RF-04).

Tablas Supabase afectadas (solo lectura/escritura vía 03/09, sin DDL aquí): `jornada` (`fnb_match_id/universally_id/origen_resultado/last_calendar_sync/last_result_sync/marcador/estado`), `jugador` (`fnb_uuid/nombre_fnb/posiciones_validas/estado_sanitario/activo/fecha_alta/baja`), `resultado_jugador` (`valoracion/estado/expulsado`), `fnb_partidos_ignorados`. Excluidas: `entrenador` (nunca sync), totales/MVP/rachas (derivados del motor al leer).

## 6. Claves i18n nuevas para `es/strings.json`

Solo códigos `errors.fnb.*` que consume la UI de 09. No crear `ui.*` ni `ui.normas.*` (dueñas 04–09/05).

- `errors.fnb.no_responde`
- `errors.fnb.clave_rotada`
- `errors.fnb.url_invalida`
- `errors.fnb.no_pertenece`
- `errors.fnb.id_duplicado`
- `errors.fnb.sin_acta_en_gracia`
- `errors.fnb.nombre_pendiente`
- `errors.fnb.manual_bloquea`
- `errors.fnb.hora_ininterpretable`

## 7. Estrategia de tests en Vitest

- Entorno `node`, `fetch` mockeado con fixtures J1 `55483` (sin acta, `universallyid=null`) y J2 `55488` (11 valoraciones `1,6,12,7,2,0,8,1,-1,13,-1` + VITAL ausente). Reloj inyectado (`ahora` param), sin red ni BD real.
- Casos obligatorios (DoD spec-10): parseo de calendario (J1 en gracia vs papel tras `24h`, J2 con acta); mapeo por `uuid` + fallback solo por nombre con `0/2+` a pendiente y dorsal nunca mapea; `BASE`/estado desde acta (`jugo` solo con minutos vs `no_convocado` ausente vs `dnp` 0/0 vs lesionado previo respetado y lesionado que juega); expulsión con 5 faltas incluida vía `esExpulsion()`; MVP FNB ignorado; throttle (`24h/1h/+3h`) con lock concurrente (una ejecuta, resto sirve BD); no-sobrescritura manual con auto-actualización de corrección `fnb` y `Re-importar` que sí pisa manual; segunda fase aditiva sin colisión con doble numeración y respeto a borrados; entrenadores no sincronizados; acumulados no usados.
- Puerta: `npx tsc --noEmit` 0 errores, cero `any`, `npm run lint` 0 warnings, `npm test` verde + umbral §3, `npm run build` verde + verificación manual: con FNB caída la jornada se completa a mano y la liga no se bloquea; con J2 `55488` pegar la URL pre-rellena sin guardar hasta confirmación; J1 `55483` queda pendiente `1 día` y luego papel `0` excluida + rompe rachas sin manual.

## 8. Trazabilidad requisito → plan

- RF-01 → `cliente-esb/msstats.ts` + `esquemas.ts` + test no-HTML. E-13.
- RF-02 → `sync-calendario.ts` + `parseo-calendario.ts` + doble numeración + `fnb_partidos_ignorados` (03) + test 2ª fase/borrados. E-11/E-16.
- RF-03 → `parseo-calendario.ts` + `parsearHoraMadrid` + test E-12/E-19 spec-02.
- RF-04 → `decidirSync*` + lock transaccional + test throttle/lock `24h/1h/+3h`. E-01/E-02/E-13/E-17/E-19.
- RF-05 → `normalizar.ts` + `resolverVinculo` + test `0/2+` a pendiente, dorsal nunca. E-09.
- RF-06 → `parseo-acta.ts` + trunc + `resolverEstadoConLesionado` + test jugo/dnp/no_convocado/lesionado + plantilla vigente 03. E-05/E-06/E-07/E-08/E-18.
- RF-07 → `esExpulsion()` 02 (incluye 5 faltas) + test. E-10.
- RF-08 → ignorar MVP FNB, solo motor §0 + test.
- RF-09 → `decidirPapel` + test gracia/papel J1. E-03/E-04.
- RF-10 → re-fetch al guardar + `debeSaltarManual` + `origen_resultado` 03 + test manual/corrección/Re-importar. E-14/E-15.
- RF-11 → `descargarActaPorId/Uuid` + `preRellenarActaDesdeUrl` sin escritura + test URL inválida/ajena/duplicada/caída. E-02.
- RF-12 → delega a formulario manual 09; test FNB caída con manual operativo salvo papel.
- RF-13 → solo calendario/cierre sin acta ni cálculo + test aplazado.
