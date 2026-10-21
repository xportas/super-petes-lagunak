# Plan técnico — 02 Motor de puntuación y dominio (§0)

Fuente: `specs/02-motor-puntuacion-y-dominio/spec.md` + `CONSTITUTION.md` + `AGENTS.md` + `README.md §0`.
Alcance: solo diseño. No incluye código de producción. La lógica real la implementará la fase de build de esta spec.

Prerrequisito: spec-01 aplicada (TS `strict`, Vitest, `es/strings.json` mínimo, placeholders `never` en `src/lib/`). Esta 02 sustituye los placeholders de `scoring`/`dominio` por diseño real.

Aclaración vinculante de sesión: `esExpulsion` se calcula desde conteos de faltas. La FNB y el Admin aportan conteos crudos, nunca un flag de expulsión ya decidido. Si la FNB trae flag de expulsión o de MVP, se ignora.

## 1. Modelos de datos

Solo tipos puros de dominio. Cero SQL, cero migraciones, cero RLS en esta spec (dueña spec-03). Los tipos son los DTOs que el motor y el dominio consumen; spec-03 los mapeará a sus tablas.

```ts
// src/lib/scoring/tipos.ts
export type Posicion = 'B' | 'E' | 'A' | 'AP' | 'P';
export type Entrenador = 'maider' | 'pater';
export type EstadoJugadorActa = 'jugo' | 'lesionado' | 'no_convocado' | 'dnp';
export type EstadoJornada = 'pendiente' | 'calculada' | 'papel' | 'invalidada';
export type JugadorId = string;
export type ManagerId = string;

export interface ConteosFaltas {
  readonly descalificacion: number;   // descalificante (> 0 = expulsado)
  readonly pelea: number;             // scuffle (> 0 = expulsado)
  readonly antideportivas: number;
  readonly tecnicas: number;          // técnicas al jugador
  readonly tecnicaEntrenador: number; // coachTechnical, suma al >= 2
  readonly personales: number;        // 5 faltas personales = expulsión
}

export interface EntradaJugador {
  readonly jugadorId: JugadorId;
  readonly valoracionFNB: number | null | undefined; // null/undefined = dato ausente (RF-17)
  readonly estado: EstadoJugadorActa;
  readonly expulsado: boolean; // siempre derivado de esExpulsion(conteos), nunca leído de FNB/Admin
  readonly posicionesValidas: readonly [Posicion, Posicion] | null | undefined;
  readonly posicionAlineada: Posicion;
  readonly esCapitan: boolean;
}

export interface EntradaJornada {
  readonly entrenador: Entrenador;
  readonly quinteto: readonly EntradaJugador[]; // tupla de 5, validada antes
  readonly penalizacionRachaPorJugador: Readonly<Record<JugadorId, number>>;
  readonly plantillaBaseMax: {
    readonly maxBase: number | null; // máxima BASE entre plantilla que jugó; null si nadie jugó
    readonly capitanEsMaximo: boolean;
    readonly jugoAlguno: boolean;
  };
}

export interface DesgloseJugador {
  readonly jugadorId: JugadorId;
  readonly base: number;
  readonly trasEntrenador: number;
  readonly bonusPosicion: 0 | 5;
  readonly penalizacionRacha: number; // 0, -1, -2, ...
  readonly subtotal: number;
}

export interface ResultadoJornada {
  readonly porJugador: readonly DesgloseJugador[];
  readonly esMvp: boolean;
  readonly bonusMvp: 0 | 3;
  readonly expulsiones: number;
  readonly penalizacionExpulsion: number; // 0, -5, -10, ...
  readonly total: number; // puede ser negativo
}

export type ErrorCalculo =
  | { readonly codigo: 'DATO_AUSENTE'; readonly jugadorId?: JugadorId }
  | { readonly codigo: 'POSICIONES_INVALIDAS'; readonly jugadorId: JugadorId }
  | { readonly codigo: 'LESION_EXPULSION_EXCLUYENTES'; readonly jugadorId: JugadorId };
```

```ts
// src/lib/dominio/tipos.ts
export interface QuintetoInput {
  readonly jugadorIds: readonly [string, string, string, string, string];
  readonly posicionPorJugador: Readonly<Record<string, Posicion>>;
  readonly entrenador: Entrenador;
  readonly capitanId: string;
}
export interface AlineacionGuardada {
  readonly managerId: ManagerId;
  readonly jornadaId: string;
  readonly quinteto: QuintetoInput;
  readonly instanteInicio: Date;
}
export interface JornadaOrdenable {
  readonly jornadaId: string;
  readonly numeroJornada: number;
  readonly horaPartido: Date;
  readonly estado: EstadoJornada;
}
export interface EventoAparicion {
  readonly jugadorId: string;
  readonly jornadaId: string;
  readonly horaPartido: Date;
  readonly numeroJornada: number;
  readonly estadoJornada: EstadoJornada; // solo cuentan cerradas: calculada|invalidada
  readonly alineado: boolean;            // en quinteto guardado válido
  readonly quintetoValido: boolean;      // false = sin envío válido (rompe)
}
```

## 2. Decisiones justificadas

| # | Decisión | Elegida | Alternativa descartada | Justificación |
|---|---|---|---|---|
| D-01 | Pureza total | `scoring` y `dominio` sin IO, sin `Date.now()`, sin fetch/BD | Leer Supabase/FNB dentro del motor | Constitución §5 + AGENTS: funciones puras; testeable y reutilizable en Equipo/Admin/`/normas` |
| D-02 | Constantes únicas | `src/lib/scoring/constantes.ts` con todos los números | Literales repartidos | AGENTS: `/normas` inyecta `{var}` desde constantes; cambiar regla = 1 sitio + test que falla primero |
| D-03 | Half-up explícito | `Math.floor(x + 0.5)` sobre `BASE * 1.5` | `Math.round` implícito o `Decimal.js` | Intención visible para negativos (`13→19.5→20`, `-1→-1.5→-1`); único decimal posible es `.5` porque la FNB entra entera; librería decimal sobredimensiona |
| D-04 | Ramas excluyentes tipadas | `Entrenador = 'maider' \| 'pater'`, `if/else` sin doble aplicación | Flags `esMaider + esPater` o pipeline `x1.5 → max` | Spec congela exclusión Maider/Páter; dos flags permitirían estado imposible |
| D-05 | BASE 0 forzada en motor | Motor coacciona `lesionado/no_convocado/dnp → 0` aunque la entrada traiga valoración | Confiar en que BD/FNB ya trae `0` | RF-01 lo exige al calcular; defensa contra manual/FNB inconsistente |
| D-06 | E==A sin normalizar guardado | `sonMismaCasilla(a,b)` solo para el `+5`; la alineación guarda la letra elegida tal cual | Normalizar `A→E` al guardar | RF-10/RF-15 spec-03: guardar tal cual, `["E","A"]` válida como pareja |
| D-07 | Racha derivada, no contador | `calcularRachas(historialOrdenado)` puro, orden `hora_partido ASC, numero_jornada ASC` | Columna `racha` en BD | spec-03 RF-14: sin contadores persistidos; papel rompe sin escribir |
| D-08 | MVP sobre BASE forzada de los que jugaron | Elegibles = `estado === 'jugo'` de toda la plantilla vigente; compara BASE, no `trasEntrenador` | Comparar subtotales con bonus o incluir BASE 0 forzada | RF-10 + E-10/E-11: evita `+3` a DNP y evita que Maider/Páter distorsione el máximo |
| D-09 | Expulsión desde conteos, nunca flag externo | `esExpulsion(conteos: ConteosFaltas) => boolean`; FNB/Admin aportan conteos crudos | Aceptar `expulsado: boolean` de FNB/Admin o flag MVP FNB | RF-11 + spec-03 RF-07 + spec-10 RF-07: regla única (`descalificacion>0 \|\| pelea>0 \|\| antideportivas+tecnicas+tecnicaEntrenador>=2 \|\| personales>=5`, incluye 5 faltas); el acta persiste `bool` ya resuelto, la FNB no decide |
| D-10 | Cierre inyectable en UTC | `calcularCierre(hora) = new Date(hora.getTime() - 3h)`; `validarCierre({horaPartido, instanteInicio})`; `Europe/Madrid` solo en parse/format | `Date.now()` dentro o `luxon/date-fns-tz` | RF-16/E-18 exigen instante de inicio + rechazo en el segundo exacto; resta en ms independiente de zona; sin dependencia nueva |
| D-11 | Zod solo en borde | `src/lib/dominio/esquemas.ts` parsea `unknown → QuintetoInput/ActaInput`; motor recibe tipos estrechados | `unknown` dentro del motor o validación manual con `if` | Convención AGENTS (zod en servidor); motor puro no conoce zod |
| D-12 | Error como valor, no throw parcial | `Ok \| { error: ErrorCalculo }`; dato ausente nunca `0` provisional | `throw` o `null` silencioso | RF-17/E-16: prohíbe parcial; el llamante (spec-09) decide `pendiente/invalidada` |
| D-13 | Agregador en scoring | `agregarTemporada()` puro, excluye `pendiente/papel/invalidada` | Agregación en SQL o en componentes | RF-18: medias/tops/puestos derivan del mismo motor, sin recalcular a mano |
| D-14 | i18n fuera del motor | Motor devuelve `codigo`; textos solo en `es/strings.json` | Literales en errores del motor | Constitución §9 + spec-02 §4: cero hardcode; spec-01 reserva `errors.*` |

## 3. Archivos exactos a crear / modificar / no tocar

### Crear

- `src/lib/scoring/constantes.ts` — `BONUS_POSICION=5`, `PENALIZACION_SIN_QUINTETO=-10`, `BONUS_MVP=3`, `PENALIZACION_POR_EXPULSADO=5`, `FACTOR_CAPITAN_NUM=3/DEN=2`, `HORAS_CIERRE=3`, `GRACIA_PAPEL_HORAS=24`.
- `src/lib/scoring/tipos.ts` — tipos §1 (scoring).
- `src/lib/scoring/redondeo.ts` — `redondearHalfUp(n: number): number`.
- `src/lib/scoring/expulsion.ts` — `esExpulsion(conteos: ConteosFaltas): boolean` (D-09).
- `src/lib/scoring/mvp.ts` — `esMvpCapitan({capitanJugo, baseCapitan, maxBaseJugo}): boolean`.
- `src/lib/scoring/calcular-jugador.ts` — `calcularJugador(entrada, rachaN, entrenador)` en orden RF-13.
- `src/lib/scoring/calcular-jornada.ts` — `calcularJornada(entrada | {sinQuinteto:true})`, suma RF-12, `-10` RF-19, `0` papel RF-21.
- `src/lib/scoring/agregador-temporada.ts` — rachas vigentes, acumulados, puestos `Pº`, Top 3 managers/jugadores última `calculada`, media 1 decimal solo `jugo`.
- `src/lib/scoring/index.ts` — barrel.
- `src/lib/dominio/tipos.ts` — `QuintetoInput`, `AlineacionGuardada`, `JornadaOrdenable`, `EventoAparicion`.
- `src/lib/dominio/posiciones.ts` — `sonMismaCasilla`, `validarPosicionesValidas`, `tieneBonusPosicion`.
- `src/lib/dominio/esquemas.ts` — esquemas Zod (ver §4).
- `src/lib/dominio/validar-quinteto.ts` — 5 distintos + activo/2 posiciones + entrenador único + capitán del quinteto + posición válida + elegibilidad separada.
- `src/lib/dominio/cierre.ts` — `calcularCierre`, `validarCierre`, `ordenarJornadasCanonico`.
- `src/lib/dominio/rachas.ts` — `penalizacionPara(n) = -(n-1)`, `calcularRachas(historial)`.
- `src/lib/dominio/index.ts` — barrel.
- Tests junto al módulo (`*.test.ts`): `redondeo/calcular-jugador/calcular-jornada/mvp/expulsion/agregador-temporada/posiciones/validar-quinteto/cierre/rachas.test.ts`.

No crear: `eu.json`, `src/proxy.ts` (spec-04), migraciones SQL, `src/app/normas/*` (spec-05), clientes Supabase/FNB.

### Modificar

- `package.json` — añadir `zod` (única dep nueva).
- `vitest.config.ts` (de spec-01) — mantener umbral global y añadir 100% líneas+ramas en `src/lib/scoring/**` y `src/lib/dominio/{posiciones,rachas,cierre,validar-quinteto}.ts`.
- `es/strings.json` — añadir claves §6 sin renombrar las 3 de spec-01.
- Eliminar/sustituir placeholders `never` de spec-01 en `src/lib/scoring/contratos.ts` y `src/lib/dominio/contratos.ts` por la implementación real.

### No tocar

- `src/lib/supabase/*`, `src/lib/fnb/*`, `src/app/*`, `public/`, `README.md §0` (si se detecta contradicción Maider/Páter, proponer corrección aparte).

## 4. Tipos de dominio en TypeScript strict y esquemas Zod

Convenciones: `strict` + `noUncheckedIndexedAccess`, cero `any` (`unknown` + narrowing), `readonly` en entradas, archivos `kebab-case`, negocio en español (`Quinteto`, `valoracionFNB`).

```ts
// src/lib/scoring/constantes.ts
export const BONUS_POSICION = 5 as const;
export const PENALIZACION_SIN_QUINTETO = -10 as const;
export const BONUS_MVP = 3 as const;
export const PENALIZACION_POR_EXPULSADO = 5 as const;
export const FACTOR_CAPITAN_NUM = 3 as const;
export const FACTOR_CAPITAN_DEN = 2 as const;
export const HORAS_CIERRE = 3 as const;
export const GRACIA_PAPEL_HORAS = 24 as const;
```

```ts
// src/lib/dominio/esquemas.ts — único sitio con unknown (borde)
import { z } from 'zod';
export const esquemaPosicion = z.enum(['B', 'E', 'A', 'AP', 'P']);
export const esquemaPosicionesValidas = z.tuple([esquemaPosicion, esquemaPosicion]);
export const esquemaEntrenador = z.enum(['maider', 'pater']);
export const esquemaConteosFaltas = z.object({
  descalificacion: z.number().int().min(0),
  pelea: z.number().int().min(0),
  antideportivas: z.number().int().min(0),
  tecnicas: z.number().int().min(0),
  tecnicaEntrenador: z.number().int().min(0),
  personales: z.number().int().min(0),
});
export const esquemaQuintetoInput = z.object({
  jugadorIds: z.array(z.string().min(1)).length(5),
  posicionPorJugador: z.record(z.string(), esquemaPosicion),
  entrenador: esquemaEntrenador,
  capitanId: z.string().min(1),
}).superRefine((v, ctx) => {
  // duplicados y capitán ∈ quinteto; el resto de negocio en validar-quinteto.ts con plantilla
});
export const esquemaActaJugador = z.object({
  valoracionFNB: z.number().int(),
  estado: z.enum(['jugo', 'lesionado', 'no_convocado', 'dnp']),
  conteos: esquemaConteosFaltas,
}).superRefine((v, ctx) => {
  // no se acepta expulsado como input: se deriva con esExpulsion(v.conteos)
});
```

Zod no entra en `scoring`: el motor recibe `EntradaJugador` ya estrechada con `expulsado: boolean` derivado.

## 5. Contratos de funciones puras / Server Actions / tablas Supabase

```ts
// scoring (puras)
redondearHalfUp(n: number): number;
esExpulsion(conteos: ConteosFaltas): boolean;
tieneBonusPosicion(alineada: Posicion, validas: readonly [Posicion, Posicion], base: number): boolean;
calcularJugador(e: EntradaJugador, rachaN: number, entrenador: Entrenador): DesgloseJugador | { error: ErrorCalculo };
calcularJornada(e: EntradaJornada | { sinQuinteto: true }): ResultadoJornada | { error: ErrorCalculo };
esMvpCapitan(o: { capitanJugo: boolean; baseCapitan: number; maxBaseJugo: number | null }): boolean;
agregarTemporada(jornadas: readonly JornadaOrdenable[], actas: ..., alineaciones: ...): AgregadoTemporada;

// dominio (puras, sin IO)
validarQuinteto(input: unknown, plantilla: ReadonlyMap<string, { activo: boolean; posicionesValidas: readonly [Posicion, Posicion] | null }>): { ok: true; valor: QuintetoInput } | { ok: false; errores: string[] };
calcularCierre(horaPartido: Date): Date;
validarCierre(horaPartido: Date | null, instanteInicio: Date): { abierto: true; cierre: Date } | { abierto: false; codigo: 'PASADO' | 'SIN_HORA' };
ordenarJornadasCanonico(j: readonly JornadaOrdenable[]): JornadaOrdenable[];
calcularRachas(historial: readonly EventoAparicion[]): ReadonlyMap<string, number>;
```

Orden fijo en `calcularJugador` (RF-13): `BASE → x1.5 Maider solo capitán (redondeo) ó suelo+1 Páter → +5 posición (salvo BASE 0) → −N racha (salvo BASE 0)`; a nivel jornada `+3 MVP → −5 por expulsado`. `expulsado` entra como `bool` ya resuelto por `esExpulsion`; su `BASE` sigue intacta.

Server Actions: 0 nuevas. Esta spec no muta. Expone validación/cálculo para spec-06 (Equipo) y spec-09 (Admin: formulario manual aporta conteos + `esExpulsion`, botón Recalcular re-ejecuta `calcularJornada` con reglas vigentes RF-20).

Tablas Supabase: 0 afectadas. Sin migraciones, sin RLS, sin `service_role`. Los contratos aceptan DTOs que spec-03 mapeará a `jugador/entrenador/jornada/alineacion/resultado-por-jugador` (`fnb_uuid`, `fnb_match_id`, `origen_resultado`, estados).

## 6. Claves i18n nuevas para `es/strings.json`

Solo códigos que esta capa devuelve; los textos los consumen specs 06/08/09. No crear `ui.normas.*` (dueña spec-05).

- `errors.close.missing_time`, `errors.close.invalid_time`
- `errors.calculo.dato_ausente`, `errors.calculo.posiciones_invalidas`, `errors.calculo.lesion_expulsion_excluyentes`
- `errors.alineacion.duplicados`, `.sin_capitan`, `.capitan_fuera`, `.sin_posicion`, `.posicion_invalida`, `.entrenador_invalido`, `.entrenador_en_quinteto`, `.jugador_en_slot_entrenador`, `.jugador_inactivo`, `.jugador_pendiente`
- `errors.jornada.papel_sin_manual`, `errors.jornada.sin_quinteto`

## 7. Estrategia de tests en Vitest

- Entorno `node`, factories `entradaJugador({base, estado, ...})`, tests tabla-driven por RF/E. Reloj inyectado (`instanteInicio` param), sin mocks de BD/fetch.
- Cobertura: 100% líneas+ramas en `src/lib/scoring/**` y `dominio/{posiciones,rachas,cierre,validar-quinteto}.ts`; resto mantiene umbral spec-01.
- Casos obligatorios (DoD spec): BASE negativa y `0`; capitán `13→20`, `-1→-1`; Páter `0→2`, `-5→2`; bloqueo `+5/−N` con BASE 0; rachas 1ª–5ª y siguientes, ruptura por no alinear, sin quinteto `-10` + reinicio, cuenta aunque lesionado, J1 y alta como 1ª, papel rompe; MVP simple sobre BASE forzada, empate, exige jugar, con Maider (no multiplica `+3`), con Páter, expulsado MVP (`+3` y `-5`); expulsión simple, doble `-10`, BASE intacta, 5 personales como expulsión vía conteos, lesión/expulsión excluyentes; total negativo preservado; `["E","A"]` en E y A; validación E-17 completa; cierre `-3h Europe/Madrid` con instante de inicio, rechazo en el segundo exacto, cambio de hora sin invalidar; dato ausente bloquea salvo papel tras gracia; recálculo idempotente; papel `0` excluida + rompe; agregador con orden canónico, exclusión `pendiente/papel/invalidada`, media 1 decimal solo `jugo`, Top 3 última `calculada`.
- Puerta: `npx tsc --noEmit` 0 errores, cero `any`, `npm run lint` 0 warnings, `npm test` verde + umbral, `npm run build` verde.

## 8. Trazabilidad requisito → plan

- RF-01 → §1 `EntradaJugador` + §5 `calcularJugador` + `redondeo/calcular-jugador.test`
- RF-02/03 → §4 `esquemaQuintetoInput` + §5 `validarQuinteto` + `validar-quinteto.test`
- RF-04 → §1 constantes + §5 `calcularJugador/redondearHalfUp` + `redondeo.test`
- RF-05 → §5 `calcularJugador` + `calcular-jugador.test`
- RF-06/15 → §5 `dominio/posiciones` + `posiciones.test`
- RF-07 → §5 `calcularJugador` (bloqueo BASE 0) + `calcular-jugador.test`
- RF-08/09 → §5 `dominio/rachas + agregadorTemporada` + `rachas/agregador-temporada.test`
- RF-10 → §5 `mvp.esMvpCapitan` + `mvp.test`
- RF-11 → §2 D-09 + §4 `esquemaConteosFaltas` + §5 `esExpulsion` + `expulsion.test` (conteos, incluye 5 faltas; flag externo ignorado)
- RF-12/13 → §5 `calcularJornada` + `calcular-jornada.test`
- RF-14 → §4 esquemas + §5 `validarQuinteto` + `validar-quinteto.test`
- RF-16 → §5 `cierre.calcularCierre/validarCierre` + `cierre.test`
- RF-17 → §1 `valoracionFNB: null` + §5 `ErrorCalculo.DATO_AUSENTE` + `calcular-jornada.test`
- RF-18 → §5 `agregadorTemporada` + `agregador-temporada.test`
- RF-19 → §5 `calcularJornada({sinQuinteto:true}) + calcularRachas` + tests
- RF-20 → §5 recálculo puro (sin persistir totales) + `calcular-jornada.test`
- RF-21 → §1 `EstadoJornada='papel'` + §5 `calcularJornada/agregador` + tests papel
