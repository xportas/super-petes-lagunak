# Plan técnico — 08 Resultados, Historial y Clasificación (§5 y §6)

Fuente: `specs/08-resultados-historial-y-clasificacion/spec.md` + `CONSTITUTION.md` + `AGENTS.md` + `README.md §0/§5/§6` + planes 01/02/03/04/05.
Alcance: solo diseño. No incluye código de producción.

Prerrequisitos: 01 (TS `strict`, Vitest, `traducir()` tipado), 02 (`calcularJornada`, `calcularRachas`, `ordenarJornadasCanonico`, `constantes.ts`, `ES_MVP/expulsión`), 03 (tablas `usuario/jornada/alineacion(-seleccion)/resultado_jugador/jugador/entrenador` + `origen_resultado` + estados + semilla J1 `papel`/J2 `calculada`), 04 (`src/proxy.ts`, `resolverDestino`, sesión `httpOnly`+rol), 05 (`mobile-shell`, `bottom-nav`, cookies `modo_pete/tema`, `/normas#orden`). Esta 08 no crea DDL/RLS, ni auth, ni motor, ni sync FNB.

## 1. Modelos de datos

Cero tablas nuevas, cero columnas calculadas. Solo view-models TS derivados al leer (`spec-03 RF-15`). Reusan `Posicion/Entrenador/EstadoJornada` de 02 y `*Row` de 03.

```ts
// src/lib/resultados/tipos.ts
import type { Posicion, Entrenador, EstadoJornada } from '@/src/lib/scoring/tipos';

export type IconoEstado = 'jugo' | 'lesionado' | 'no_convocado' | 'dnp';
// 'jugo' => ✅ (aunque BASE 0), resto => 🚑/❌ según spec

export interface LineaJugadorVista {
  readonly jugadorId: string;
  readonly posicionAlineada: Posicion;
  readonly esCapitan: boolean;
  readonly icono: IconoEstado;
  readonly expulsado: boolean;
  // cifras derivadas 1:1 de DesgloseJugador del motor, sin recalcular:
  readonly base: number;
  readonly trasEntrenador: number;
  readonly bonusPosicion: 0 | 5;
  readonly penalizacionRacha: number; // 0,-1,-2...
  readonly subtotal: number;
}

export interface DesgloseJornadaVista {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly horaPartido: Date;
  readonly entrenador: Entrenador; // etiqueta informativa, sin cifra agregada (RF-10)
  readonly lineas: readonly LineaJugadorVista[]; // 5, orden estable por jugadorId
  readonly esMvp: boolean;
  readonly bonusMvp: 0 | 3;
  readonly expulsiones: number;
  readonly penalizacionExpulsion: number; // 0,-5,-10...
  readonly total: number;
}

export type FilaHistorial =
  | { readonly kind: 'calculada'; readonly desglose: DesgloseJornadaVista; readonly puestoAcumulado: number }
  | { readonly kind: 'sin_envio'; readonly jornadaId: string; readonly numeroJornada: number; readonly horaPartido: Date; readonly total: -10; readonly puestoAcumulado: number };

export interface AvisoJornadaExcluida {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly motivo: 'invalidada';
}

export interface HistorialVista {
  readonly destacada: DesgloseJornadaVista | null; // última calculada elegible, null => Sin datos
  readonly filas: readonly FilaHistorial[]; // DESC hora_partido, numero_jornada
  readonly avisos: readonly AvisoJornadaExcluida[]; // invalidadas ocultas con aviso (RF-12)
}

export interface EntradaGeneral {
  readonly managerId: string;
  readonly username: string; // display, orden case-insensitive
  readonly acumulado: number;
  readonly puesto: number; // olímpico
}

export interface ClasificacionVista {
  readonly filas: readonly EntradaGeneral[]; // orden acumulado DESC, username ASC ci
  readonly hayColores: boolean; // false si 0 calculadas o todo a 0
  readonly miManagerId: string;
}

export type Medalla = 'oro' | 'plata' | 'bronce' | null;
```

Notas:

* `FilaHistorial` discriminada por `kind`: `sin_envio` nunca lleva `lineas` (RF-08). `papel/pendiente` nunca construyen fila (RF-05/RF-12).
* `puestoAcumulado` y `puesto` son olímpicos (`1,2,2,4`) con desempate alfabético `username` case-insensitive solo para orden, no para saltar puesto (RF-06/RF-15).
* Elegibilidad: `onboarding_completado_at < cierre` (`cierre=hora_partido-3h`, `spec-02`). Sin retroactivo en filas propias, pero el `0` del nuevo sí cuenta en puestos históricos ajenos y en General (inconsistencia congelada RF-13/E-10).

## 2. Decisiones justificadas

| # | Decisión | Elegida | Alternativa descartada | Justificación / RF |
|---|---|---|---|---|
| D-01 | Derivar todo al leer, cero persistencia | Reusar `calcularJornada` + `calcularRachas` + `agregarTemporada` (02) en Server Components | Vista materializada / triggers SQL con totales | Const §5 + AGENTS motor puro + 03 RF-15: dos fuentes divergen; recálculo silencioso RF-14 exige reglas vigentes |
| D-02 | Módulo `src/lib/resultados/` solo presentador | Puras `historial.ts/clasificacion.ts/colores.ts` que consumen motor, sin fórmulas propias | Lógica en `page.tsx` o SQL `RANK()` | Testeable en `node` sin BD; SQL duplicaría olímpica/rachas y rompería D-01. Cubre RF-05/06/14/15/17 |
| D-03 | Acordeón exclusivo con estado local | `'use client'` `historial-acordeon.tsx` con `abiertaId: string\|null`, tap-only | `<details>` múltiples abiertos o hover/CSS-only | RF-07/E-16 exige una sola abierta y colapso al retocar; nativo no garantiza exclusividad sin JS |
| D-04 | General no tocable | Filas `<li>` sin `<a>/onClick`, solo resaltado `aria-current` en mi fila | Tap a desglose ajeno o comparador | RF-16: ver quintetos ajenos = incumplimiento anti-piques |
| D-05 | Colores por nº puesto, no por puntos | `medallaPorPuesto(puesto)` + `enZonaRoja(acumulado, indice, N)` según corte exacto spec | Umbrales fijos de puntos o Top-3 por índice sin olímpica | RF-17/E-04: empate en corte (`tres 3º`, empate en fila N-2) debe teñir igual; por índice rompería olímpica |
| D-06 | Ocultar papel/pendiente, avisar solo invalidada | Filtro `estado==='calculada'` + `avisos[]` solo para `invalidada` ex-`calculada` | Mostrar papel como `0` o pendiente como `0 provisional` | RF-05/RF-12/E-06/E-07: papel `0` rompería medias; `0` provisional prohíbe 02 RF-17 |
| D-07 | Sin Server Actions nuevas | Solo lecturas; `Reintentar` = `error.tsx` con `reset()` | `revalidarClasificacion` / botón Recalcular aquí | Dueños 09/10; aquí recálculo = releer con reglas vigentes RF-14. Cero mutaciones |
| D-08 | Guardias reusadas, no propias | `src/proxy.ts` + `resolverDestino` (04); Admin: General sí, `/mi-resultado` denegado | Guardias locales en cada `page` | RF-02/RF-03: precedencia temporal→onboarding ya congelada en 04 |
| D-09 | Pete/tema solo en render | `nombre/img` vs `nombrePete/imgPete` por cookie (05), `Maider/Páter/username` invariantes | Columna `alias` o lógica Pete en cálculo | RF-20/E-17: Pete cosmético, reglas nunca cambian |
| D-10 | Zod: no añadir | Sin esquemas nuevos; 08 no acepta input | Esquema `jornadaId` query-param | Sin formularios ni params: validación en borde no aplica; añadir Zod muerto viola convención |

## 3. Archivos exactos a crear / modificar / no tocar

Respetando `AGENTS.md` (`kebab-case`, negocio español, infra inglés, Server Components por defecto).

### Crear

* `src/lib/resultados/tipos.ts` — tipos §1. **Cubre RF-05/06/14/15.**
* `src/lib/resultados/historial.ts` — puras: `construirHistorial(args): HistorialVista`, `puestoAcumuladoTras(...)`. Ordena ASC para calcular, devuelve DESC para UI. **Cubre RF-04/05/06/08/12/13.**
* `src/lib/resultados/clasificacion.ts` — puras: `construirGeneral(args): ClasificacionVista`, `ordenarGeneral()`, `numeracionOlimpica()`. Excluye `admin`. **Cubre RF-14/15.**
* `src/lib/resultados/colores.ts` — puras: `medallaPorPuesto(puesto): Medalla`, `esZonaRoja(acumulado, indiceFila, totalN): boolean`, `debeColorear(hayCalculada, todosCero, n): boolean`. **Cubre RF-17/E-02/03/04.**
* `src/lib/resultados/index.ts` — barrel.
* `src/lib/supabase/resultados.ts` — solo queries servidor con `service_role` (tras validar sesión+rol): `leerJornadasOrdenadas()`, `leerAlineacionDe(managerId, jornadaId)`, `leerActaDe(jornadaId)`, `leerManagersElegibles()`, `leerPlantillaVigenteEn(cierre)`. Sin scoring dentro. **Cubre RF-05/14/19.**
* `src/app/mi-resultado/page.tsx` — Server: guardias (04) → `leer*` → `construirHistorial` → render `Destacada + Historial`. Sin `cookies()` arriba salvo vía `Suspense` prefs (05). **Cubre RF-01/02/04/05.**
* `src/app/mi-resultado/destacada.tsx` — Server: bloque destacado + enlace `/normas#orden`. **Cubre RF-04/09/10/11/18.**
* `src/app/mi-resultado/historial-acordeon.tsx` — `'use client'`: lista DESC, tap ≥44px, una sola abierta (RF-07). Importa tipos, no calcula.
* `src/app/mi-resultado/fila-sin-envio.tsx` — Server: fila `-10` + nota expandible + enlace normas. **Cubre RF-08.**
* `src/app/mi-resultado/error.tsx` — Client: vista error total + `Reintentar` (`reset()`). **Cubre RF-19.**
* `src/app/clasificacion/page.tsx` — Server: guardias (04, admin permitido) → `construirGeneral` → lista no tocable + mi fila resaltada. **Cubre RF-01/03/14/15/16/17.**
* `src/app/clasificacion/error.tsx` — idem RF-19.
* Tests junto al módulo: `src/lib/resultados/historial.test.ts`, `clasificacion.test.ts`, `colores.test.ts` (ver §7).

No crear: `eu.json`, migraciones, `src/proxy.ts`, `src/lib/scoring/*`, `src/lib/dominio/*`, `src/lib/fnb/*`.

### Modificar

* `src/app/layout.tsx` (de 05) — añadir nav `Resultados/Clasificación` si falta; sin `await cookies()` arriba.
* `es/strings.json` — añadir claves §6 sin renombrar las de 01/02/03/04/05.
* `vitest.config.ts` — mantener umbrales 01/02/03/04/05; añadir 100% líneas+ramas en `src/lib/resultados/*.ts` (motor ya exige 100% en 02).
* `package.json` — cero deps nuevas (reusa `zod` de 02 solo en supabase borde si hiciera falta; aquí no se usa).

### No tocar

* `src/lib/scoring/*`, `src/lib/dominio/*` (solo importar), `src/lib/auth/*`, `src/lib/fnb/*`, `public/*`, `README.md §0`, `src/app/normas/*`.

## 4. Tipos TS strict y Zod

Convenciones: `strict` + `noUncheckedIndexedAccess`, cero `any` (`unknown` + narrowing donde aplique), `readonly`, `kebab-case`.

No hay esquemas Zod nuevos: 08 no tiene borde con `unknown` (sin formularios, sin query-params, sin Server Actions). Si `resultados.ts` recibe `managerId/jornadaId`, reutiliza `z.string().uuid()` de `supabase/esquemas.ts` (03) en el borde, nunca dentro de `historial.ts/clasificacion.ts/colores.ts` que reciben tipos ya estrechados.

```ts
// src/lib/resultados/historial.ts (contrato, no implementación)
import type { DesgloseJornadaVista, HistorialVista } from './tipos';
export function construirHistorial(args: {
  readonly managerId: string;
  readonly onboardingCompletadoAt: Date | null;
  readonly jornadas: readonly { id: string; numeroJornada: number; horaPartido: Date; estado: EstadoJornada }[];
  readonly alineacionesPorJornada: ReadonlyMap<string, { entrenador: Entrenador; quinteto: EntradaJornada } | null>;
  readonly actasPorJornada: ReadonlyMap<string, ActaCruda | null>; // null = dato ausente
}): HistorialVista | { error: 'DATO_AUSENTE' }; // dato ausente => fila oculta + aviso, resto visible
```

```ts
// src/lib/resultados/colores.ts
export function medallaPorPuesto(puesto: number): Medalla; // 1=>oro,2=>plata,3=>bronce
export function debeColorear(o: { hayCalculada: boolean; todosCero: boolean }): boolean;
export function esZonaRoja(o: { acumulado: number; umbralRojo: number; totalN: number }): boolean;
// umbralRojo = acumulado de la fila N-2; N>6 exigido por llamante; empate en N-2 incluye a todos con <= umbral
```

## 5. Contratos funciones puras / Server Actions / tablas Supabase

```ts
// puras (node, sin IO, reloj inyectado)
construirHistorial(args): HistorialVista; // RF-04..13. Orden canónico ASC interno, DESC en salida. -10 si alineación null y elegible. papel/pendiente => omitir. invalidada => omitir + aviso.
construirGeneral(args: { managers: readonly {id, username, onboardingCompletadoAt}[]; jornadasCalculadas: ...; resultadosPorManager: ... }): ClasificacionVista; // RF-14/15. Suma solo calculadas + -10 elegible. Excluye rol admin antes de llamar.
ordenarGeneral(filas): filas; // acumulado DESC, username ASC case-insensitive (localeCompare base)
numeracionOlimpica(ordenadas): con puesto; // empates comparten puesto, siguiente salta
medallaPorPuesto / esZonaRoja / debeColorear // RF-17
puestoAcumuladoTras(managerId, hastaJornada, todoHistorialASC): number; // RF-06, recalcula J2..J6 tras corrección J2
```

Server Actions: **0 nuevas**. Lecturas en Server Components cacheadas; escrituras ninguna. `Reintentar` es `error.tsx` client con `reset()`, no acción.

Tablas leídas (DDL/RLS dueña 03; `DENY ALL anon`, acceso solo servidor `service_role` tras validar sesión `httpOnly` + rol `manager|admin`):

* `usuario` (id, username, rol, onboarding_completado_at — para elegibilidad y exclusión admin),
* `jornada` (id, numero_jornada, hora_partido, estado, origen_resultado),
* `alineacion` + `alineacion_seleccion` (quinteto guardado + instante_inicio, para rachas y -10),
* `resultado_jugador` (valoración, estado, expulsado bool ya resuelto por `esExpulsion()` en 09),
* `jugador` + `entrenador` (nombres/img/Pete, posiciones para desglose).

Cero Storage, cero Realtime/cron/polling. FNB/manual solo como `origen_resultado` ya persistido (dueños 09/10).

## 6. Claves i18n nuevas para `es/strings.json`

Todo visible vía `traducir()`; prohibido literal en JSX; números como `{var}` solo donde vengan de `constantes.ts`. No crear `ui.normas.*` (05).

* `ui.resultados.titulo` — `"Mi resultado"`
* `ui.resultados.destacada_titulo` — `"Última jornada calculada"`
* `ui.resultados.historial_titulo` — `"Historial"`
* `ui.resultados.sin_datos` — `"Sin datos"`
* `ui.resultados.fila_puntos` — `"{puntos} pts ({puesto}º)"` (`{puntos:number}`, `{puesto:number}`)
* `ui.resultados.sin_envio` — `"Sin envío"`
* `ui.resultados.nota_sin_envio` — `"No enviaste quinteto a tiempo. Cuenta {penalizacion} y rompe rachas. Ver {enlace}."` (`{penalizacion}`=`PENALIZACION_SIN_QUINTETO`)
* `ui.resultados.aviso_excluida` — `"J{numero} excluida por dato incompleto. Se revisará."` (`{numero:number}`)
* `ui.resultados.ver_normas` — `"Ver normas"`
* `ui.resultados.total` — `"TOTAL: {total}"`
* `ui.resultados.mvp` — `"+{bonus} MVP"`
* `ui.resultados.expulsion` — `"{penalizacion} expulsión"` / plural vía clave separada `ui.resultados.expulsion_pl` (sin concatenar)
* `ui.resultados.posicion` / `ui.resultados.racha` / `ui.resultados.capitan` — etiquetas cortas sin cifras duras (`"+{bonus} pos"`, `"{penalizacion} racha"` con `{var}`)
* `ui.clasificacion.titulo` — `"Clasificación"`
* `ui.clasificacion.sin_datos` — `"Sin datos"`
* `ui.clasificacion.tu_fila` — `"Tú"` (aria-label, no sustituye `username`)
* `ui.comun.reintentar` — `"Reintentar"`
* `ui.comun.cargando` — `"Cargando…"`
* `errors.resultados.bd` — `"No se pudo cargar. Reintenta."`
* `errors.resultados.admin_sin_historial` — `"El admin no juega: sin historial."` (RF-03)
* Reuso sin duplicar: `errors.close.*`, `errors.calculo.*`, `ui.nav.*` (05).

## 7. Estrategia de tests en Vitest

* Entorno `node`; factories `jornadaRow({numero, hora, estado})`, `alineacionPara(manager, jornada)`, `actaPara(...)`; reloj inyectado (`ahora`, `cierre`); Supabase mockeada con fakes en memoria; nunca BD real ni fetch.
* Cobertura: 100% líneas+ramas en `src/lib/resultados/*.ts`; resto mantiene umbrales 01–05.
* Casos obligatorios (DoD spec-08):
  * vacío/papel/pendiente → `Sin datos`, General sin colores (E-01); todo a `0` → lista sin colores (E-02).
  * `−10` sin envío: fila con puesto, sin líneas, suma y rompe rachas (E-05); papel oculta+rompe (E-06); pendiente/hueco oculto sin `0` (E-07); invalidada oculta + aviso, resto visible (E-08).
  * Olímpica General e histórica + alfabético ci (RF-06/15); medallas por nº puesto; rojo solo si `N>6`, últimas 3 + empatados con fila `N-2` (E-03/04); sin rojo con ≤6; corrección J2 vista en J6 recalcula J2..J6 (E-09).
  * alta tardía: sin filas pasadas, entra ya con `0`, cuenta con `0` en históricos ajenos, adelanta a negativos (E-10/11); veterano negativo vs nuevo `0`.
  * desglose deriva de `calcularJornada`: orden fijo, cifra entrenador solo en líneas, `+0/−0/+0` explícitos (E-15), 2 expulsados señalados + `−10` con BASE intacta (E-13), capitán MVP +Maider/Páter sin multiplicar `+3` (E-14), `BASE 0 ✅` vs `0 🚑/❌` y MVP (E-20), baja actual no reescribe histórica (E-12).
  * acordeón: una sola abierta, tap colapsa (E-16); General no navegable, mi fila resaltada (RF-16); Pete: jugadores alternan, `Maider/Páter/username` invariantes (E-17); fallo BD → error total + Reintentar sin parciales (E-18); Admin: General sí, Historial denegado (E-19).
  * Anti-literal: test que falla si aparece `12 +5 −1`-like o `+5/−10/x1.5` fuera de `{var}` en `mi-resultado/clasificacion/*.tsx` (hereda patrón 05).
* Puerta: `npx tsc --noEmit` 0 errores, cero `any`, `npm run lint` 0 warnings, `npm test` verde + umbral, `npm run build` verde, 360–430px sin scroll-x y táctiles ≥44px (verificación `break-ui` en build, skill `mobile-native` obligatoria).

## 8. Trazabilidad requisito → plan

* RF-01 dos páginas → `mi-resultado/page` + `clasificacion/page` + nav 05.
* RF-02 guardias → reuso `proxy.ts/resolverDestino` (04), sin lógica nueva.
* RF-03 admin → `clasificacion` permite lectura; `mi-resultado` retorna `errors.resultados.admin_sin_historial`.
* RF-04 destacada → `construirHistorial.destacada` + `destacada.tsx`, `Sin datos` si null.
* RF-05 historial solo calculadas+`−10` DESC → `construirHistorial` + `ordenarJornadasCanonico` invertido en salida.
* RF-06 fila `Jx: N pts (Pº acumulado)` → `puestoAcumuladoTras` + `numeracionOlimpica`, recálculo silencioso.
* RF-07 acordeón exclusivo tap → `historial-acordeon.tsx` client.
* RF-08 `−10` sin desglose + nota → `FilaHistorial sin_envio` + `fila-sin-envio.tsx`.
* RF-09 desglose motor orden fijo → `DesgloseJornadaVista` 1:1 de `calcularJornada`, test anti-recálculo.
* RF-10 cifra entrenador solo en línea → `destacada.tsx` etiqueta sin cifra + `LineaJugadorVista.trasEntrenador`.
* RF-11 slot+capitán+iconos+ceros+expulsados → `LineaJugadorVista` + claves `ui.resultados.*`.
* RF-12 papel/pendiente ocultas, invalidada con aviso → filtro en `construirHistorial` + `avisos[]`.
* RF-13 sin retroactivo → predicado `onboardingCompletadoAt < cierre`.
* RF-14 acumulado solo calculadas+`−10` → `construirGeneral`.
* RF-15 orden+olímpica+admin fuera+nuevo ya `0` → `ordenarGeneral/numeracionOlimpica` + filtro rol.
* RF-16 no tocable + mi fila → `<li>` sin links + `aria-current`.
* RF-17 colores/umbrales → `colores.ts` + `debeColorear`.
* RF-18 enlace `/normas#orden` → `destacada/fila-sin-envio/avisos` lo incluyen.
* RF-19 fallo BD → `error.tsx` + `reset()`, sin parciales.
* RF-20 derivación/Pete/tema/móvil/i18n → D-01/D-09 + cookies 05 + `mobile-shell` + `traducir()` + skill `mobile-native` obligatoria antes de UI.
