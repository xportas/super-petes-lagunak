# Plan técnico — 02 Motor de puntuación y dominio (§0)

Fuente: `specs/02-motor-puntuacion-y-dominio/spec.md` + `CONSTITUTION.md` + `AGENTS.md` + `README.md §0`.
No incluye código de producción. Solo diseño para que un agente lo ejecute después.

Precondición: asume hecha `01-fundacion-ts-vitest-src`
(TS `strict`, Vitest con cobertura, `src/lib/*` con contratos placeholder,
`es/strings.json` mínimo, `tsconfig` con alias `@/*`). Esta 02 rellena
`scoring/` + `dominio/` con lógica real. No crea config ni BD.

## 1. Archivos exactos a crear / modificar / eliminar

### Eliminar (reemplazo de placeholders de `spec-01`)

- `src/lib/scoring/contratos.ts` y `src/lib/scoring/contratos.test.ts`
- `src/lib/dominio/contratos.ts` y `src/lib/dominio/contratos.test.ts`

### Crear

- `src/lib/scoring/constantes.ts` — única fuente de números del §0.
  Cubre RF-04–RF-12, RF-19, RF-21. La futura `/normas` (spec-05) inyectará `{var}` desde aquí.
- `src/lib/scoring/calculo.ts` — motor puro §0:
  `forzarBASE, aplicarEntrenador, bonusPosicion, penalizacionRacha, esMVP,
  calcularJugador, calcularJornada, recalcularJornada`.
  Cubre RF-01, RF-04–RF-13, RF-17–RF-21.
- `src/lib/scoring/agregador-temporada.ts` — agregación pura multi-jornada (`hora_partido ASC, numero_jornada ASC`):
  `calcularTemporadaLiga, calcularMediaJugador, resolverTop3Managers, resolverTop3Jugadores`.
  Cubre RF-08, RF-09, RF-18, RF-19, RF-21.
- `src/lib/dominio/cierre.ts` — `calcularCierre, estaCerrado, ordenarJornadasCronologicamente`.
  Cubre RF-16.
- `src/lib/dominio/rachas.ts` — `siguienteRacha, penalizacionPorRacha, derivarRachasManager`.
  Cubre RF-08, RF-09, RF-19, RF-21.
- `src/lib/dominio/validacion-alineacion.ts` — schema Zod + `validarAlineacion`.
  Cubre RF-02, RF-03, RF-14, RF-15.
- Tests junto al módulo (colocación exigida por `AGENTS.md`):
  - `src/lib/scoring/calculo.test.ts` — RF-01, RF-04–RF-08, RF-10–RF-13
  - `src/lib/scoring/jornada.test.ts` — integración orden RF-13 + total RF-12 + RF-19 + RF-21 + agregador de temporada (`RF-18`)
  - `src/lib/scoring/constantes.test.ts` — snapshot anti-divergencia `/normas`
  - `src/lib/dominio/rachas.test.ts` — RF-08, RF-09, RF-19, RF-21 (incluyendo jornada `invalidada` y orden por `hora_partido ASC`)
  - `src/lib/dominio/validacion-alineacion.test.ts` — RF-02, RF-03, RF-14, RF-15 (incluyendo rechazo de `inactivo` o posiciones pendientes al guardar)
  - `src/lib/dominio/cierre.test.ts` — RF-16

### Modificar

- `package.json` — instalar `zod` como dependencia de producción.
- `vitest.config.ts` — actualizar umbrales de cobertura al **100%** en `src/lib/scoring/**` y `src/lib/dominio/**` (`CONSTITUTION.md §6`).
- `src/lib/scoring/tipos.ts` y `src/lib/scoring/index.ts` — sustituir marcas opacas de `spec-01` por tipos y reexportaciones reales del motor.
- `src/lib/dominio/tipos.ts` y `src/lib/dominio/index.ts` — sustituir marcas opacas de `spec-01` por tipos y reexportaciones reales de dominio.
- `es/strings.json` — añadir claves `errors.*` de §5 (`errors.calculo.*`, `errors.alineacion.*`, `errors.close.*`).
  No tocar `ui.normas.*` (lo crea la spec-05). Cubre E-16–E-19 sin hardcode.

### No crear ni modificar en esta spec

- `tsconfig.json`, `src/lib/i18n/*`, `src/lib/supabase/*`, `src/lib/fnb/*` — dueños specs 01/03/10. No se tocan salvo que `lint/build/test` lo exija para pasar en verde.
- Sin SQL, sin migraciones, sin RLS, sin Server Actions, sin páginas.
  El botón "recalcular" es spec-09; aquí solo la regla pura RF-20.

## 2. Modelos de datos y tipos de dominio (TypeScript `strict`, cero `any`)

Dominio en español, infraestructura en inglés, archivos en `kebab-case`.
Todo `unknown` + narrowing en bordes; ningún `any` explícito ni implícito.

```ts
// scoring / dominio — esbozo de diseño, no implementación final
type Posicion = 'B' | 'E' | 'A' | 'AP' | 'P'; // RF-15
type EntrenadorId = 'maider' | 'pater'; // minúsculas sin tilde en código; display vía i18n. RF-02/RF-03
type EstadoSanitario = 'disponible' | 'lesionado'; // estado pre-partido en ficha/equipo (spec-03 RF-01)
type EstadoJuego = 'jugo' | 'lesionado' | 'no_convocado' | 'dnp'; // estado en acta de jornada, RF-01/RF-10
type EstadoJornada = 'pendiente' | 'calculada' | 'papel' | 'invalidada'; // RF-09/RF-18/RF-21
type EntradaJugador = {
  jugadorId: string;
  valoracionFNB: number | undefined; // undefined = dato ausente -> error RF-17, nunca 0 provisional
  estado: EstadoJuego;
  expulsado: boolean; // separado; invariante: estado !== 'jugo' && expulsado = inválido (E-22)
  posicionAlineacion: Posicion; // RF-14
  posicionesValidas: readonly [Posicion, Posicion]; // exactamente 2, RF-15
};
type EntradaJornada =
  | {
      tipo: 'normal';
      entrenador: EntrenadorId; // exactamente uno, RF-03
      quinteto: readonly [EntradaJugador, EntradaJugador, EntradaJugador, EntradaJugador, EntradaJugador]; // 5 distintos, RF-14
      capitanId: string; // uno de los 5, RF-14
      plantillaJugaronBASE: ReadonlyMap<string, number>; // BASE solo de jugadores de plantilla con estado === 'jugo', RF-10
      rachasPrevias: ReadonlyMap<string, number>; // n consecutivas previas por jugador, RF-08/RF-09
    }
  | {
      tipo: 'sin-quinteto';
      rachasPrevias: ReadonlyMap<string, number>; // RF-19
    }
  | {
      tipo: 'papel';
      rachasPrevias: ReadonlyMap<string, number>; // RF-21 / E-24
    };
type DesgloseJugador = {
  jugadorId: string;
  base: number; // forzada: DNP/lesionado/no-convocado -> 0, RF-01
  trasEntrenador: number; // x1.5 Maider ó suelo+1 Páter, excluyentes, RF-04/RF-05/RF-13
  bonusPosicion: 0 | 5; // RF-06, bloqueado si BASE 0, RF-07
  penalizacionRacha: number; // 0, -1, -2... bloqueada si BASE 0, RF-07/RF-08
  totalJugador: number;
};
type ResultadoJornada = {
  tipo: 'normal' | 'sin-quinteto' | 'papel';
  porJugador: readonly DesgloseJugador[];
  mvpAplica: boolean;
  numExpulsados: number;
  total: number; // normal: suma RF-12; sin-quinteto: -10; papel: 0 (excluida de agregados)
  rachasSiguientes: ReadonlyMap<string, number>;
}; // Dato ausente o inválido -> throw ErrorConClaveI18n (sin parciales, RF-17 / D-06)
```

### Esquemas Zod (solo en borde, no dentro del bucle de cálculo)

- `posicionSchema = z.enum(['B','E','A','AP','P'])` — RF-15.
- `posicionesValidasSchema = z.tuple([posicionSchema, posicionSchema])` — exactamente 2 (E-21). `["E","A"]` se acepta; la equivalencia se resuelve normalizando, no rechazando.
- `valoracionFNBSchema = z.number().int()` — FNB siempre entera (E-02). `undefined` = ausente -> error, no `0`.
- `entradaJugadorSchema` + `refine(estado !== noJugo || !expulsado)` — lesión/DNP y expulsión excluyentes (E-22).
- `alineacionSchema = { quinteto: z.array(...).length(5), entrenador: z.enum(['maider','pater']), capitanId: z.string() }`
  + `refine(5 ids distintos)` + `refine(capitan en quinteto)` + `refine(elegibilidad: entrenador solo en slot entrenador)` (RF-02/RF-03/RF-14, E-17).
- `horaPartidoSchema = z.string().datetime()` — sin hora o inválida -> cierre incalculable (E-19).

## 3. Contratos (funciones puras / Server Actions / Supabase)

### Funciones puras (únicas con lógica en esta spec)

1. `forzarBASE(valoracion: number | undefined, estado: EstadoJuego): number`
   `dnp | lesionado | no_convocado` -> `0`; si `estado === 'jugo'`, valoración tal cual (negativo permitido).
   `undefined` -> throw `errors.calculo.dato-ausente`, sin parciales. RF-01, RF-17, E-01/E-16.
2. `aplicarEntrenador(base: number, esCapitan: boolean, entrenador: EntrenadorId): number`
   Maider + capitán -> `redondeoHalfUp(base * 1.5)`; Maider + no-capitán -> `base`.
   Páter -> `max(base, 1) + 1` a cada uno de los 5 incluso con `0` (`0->2`, `-5->2`).
   Ramas excluyentes. RF-04, RF-05, RF-13, E-02/E-04.
3. `redondeoHalfUp(n: number): number` = `Math.floor(n + 0.5)` (`13->19.5->20`, `-1->-1.5->-1`). RF-04.
4. `normalizarPosicion(p: Posicion): 'B' | 'EA' | 'AP' | 'P'` (`E|A->EA`).
   `bonusPosicion = +5` si normalizada alineada ∈ normalizadas válidas y `base !== 0`. RF-06, RF-07, E-06.
5. `penalizacionPorRacha(nConsecutivas: number, base: number): number`
   `-(n-1)` (`1ª:0, 2ª:-1, 3ª:-2...`), `0` si `base === 0`. RF-07, RF-08, E-07.
6. `siguienteRacha(previa: number, alineado: boolean, esJornadaPapel = false): number`
   Si `esJornadaPapel === true` o no alineado o sin envío -> `0` (rompe racha de todos);
   alineado en jornada normal (aunque BASE 0) -> `previa + 1`.
   J1 y alta mid-season -> `1`. RF-09, RF-19, RF-21, E-05/E-08/E-09/E-24.
7. `esMVP(capitanBASE: number, capitanJugo: boolean, plantillaJugaronBASE: ReadonlyMap<string, number>): boolean`
   Exige `capitanJugo === true` y `plantillaJugaronBASE.size > 0`; máxima BASE entre los jugadores de plantilla que jugaron (incluso si el máximo es `0` o negativo); empate habilita a todos; los no jugados (`BASE 0` forzada) no entran en `plantillaJugaronBASE`. RF-10, E-10/E-11.
8. `calcularJugador(e: EntradaJugador, nRacha: number, entrenador: EntrenadorId): DesgloseJugador`
   Orden: `BASE -> x1.5 ó suelo+1 -> +5 (salvo 0) -> -N (salvo 0)`. RF-13.
9. `calcularJornada(e: EntradaJornada): ResultadoJornada`
   Rama `normal`: suma 5 totales + `+3` si `esMVP` (después del x1.5, nunca multiplicado) `-5` por expulsado; total negativo preservado; dato ausente -> throw con `claveI18n`.
   Rama `sin-quinteto`: `{ tipo: 'sin-quinteto', porJugador: [], mvpAplica: false, numExpulsados: 0, total: -10 }` + reset rachas a `0`.
   Rama `papel`: `{ tipo: 'papel', porJugador: [], mvpAplica: false, numExpulsados: 0, total: 0 }` + reset rachas de todos a `0` (excluida de acumulados/medias/tops).
   RF-10–RF-13, RF-17–RF-19, RF-21, E-12–E-16/E-20/E-24.
10. `recalcularJornada(entradaCorregida: EntradaJornada): ResultadoJornada`
    Misma que `calcularJornada` con datos corregidos; recálculo total, sin parches. RF-20, E-23.
11. `validarAlineacion(input: unknown): EntradaJornada` (Zod + refines §2). RF-02/RF-03/RF-14/RF-15.
12. `calcularCierre(horaPartido: string, timeZone = 'Europe/Madrid'): Date`
    `estaCerrado(inicioPeticion: Date, cierre: Date): boolean` = `inicioPeticion >= cierre`.
    Solo acepta `inicioPeticion < cierre` estricto; cambio posterior de hora no invalida lo guardado. RF-16, E-18/E-19.

### Server Actions

**0 afectadas.** Esta spec no muta nada. La validación en servidor la consumirán
las specs 06 (guardar alineación) y 09 (recálculo admin).

### Tablas Supabase

**0 creadas ni migradas** (dueño spec-03). Se fijan los campos que el motor necesitará:
`jugadores(posiciones_validas[2], estado)`, `jornadas(hora_partido timestamptz)`,
`alineaciones(quinteto[5], entrenador, capitan)`, `actas(valoracion_fnb int, expulsado bool)`.

## 4. Decisiones justificadas (elegida + alternativa descartada)

| # | Decisión | Elegida | Descartada | Por qué (RF/E) |
|---|---|---|---|---|
| D-01 | Granularidad | `calcularJugador` + `calcularJornada` + `validar` + `racha` + `cierre` separadas | `calcularTodo()` monolítico | El orden RF-13 exige testear cada rama aislada (E-02/E-04/E-12); monolito impide 100% por concepto |
| D-02 | Redondeo | `redondeoHalfUp` propia tras x1.5 | `Math.round` directo / `Decimal.js` | `Math.round` coincide en JS pero oculta intención y varía entre lenguajes; librería decimal sobredimensionada para un único `.5` (E-02, RF-04) |
| D-03 | E==A | canon `normalizarPosicion` | `if` E/A repetido en cada comparación | Un canon evita divergencia y hace `["E","A"]` trivialmente válido (RF-06/RF-15, E-06) |
| D-04 | BASE 0 vs ausente | `0` = no jugó (bloquea bonus, deja Páter y racha futura); `undefined` = error | `null`/`0` provisional para huecos | Prohibido tratar el hueco como `0` (RF-17, E-16); `0` preserva identidad Páter (`0->2`) y coste de racha (RF-07/RF-09) |
| D-05 | Racha como entrada | `rachasPrevias: Map` + `siguienteRacha` pura | contador mutable en BD dentro del motor | Motor puro sin BD (Constitución §5); J1/alta/ruptura/sin-quinteto triviales como datos (RF-09, E-07–E-09) |
| D-06 | Errores | throw con `{ claveI18n }`, sin total ni parcial | `Result<T,E>` / retornar `0` | Spec prohíbe parciales (RF-17/E-16); `Result` obligaría a toda la 09 a desempaquetar; throw con clave mantiene cero-hardcode |
| D-07 | Zod en borde | solo validación alineación / acta / hora | Zod dentro del bucle de cálculo | Núcleo ya tipado estrecho; doble validación es coste y ruido (AGENTS: zod en Server Actions, no en puras) |
| D-08 | Constantes | `constantes.ts` única fuente | literales por función | `/normas` inyectará `{var}` desde aquí (spec-05); literales divergen (AGENTS motor §0) |
| D-09 | Cierre con zona | instante + `Europe/Madrid`, `<` estricto sobre inicio de petición | aritmética UTC ingenua / `<=` | Exige zona explícita y rechazo en el segundo exacto (RF-16, E-18); UTC falla en DST |

## 5. Claves i18n nuevas (`es/strings.json`)

Solo `errors.*`. Tensión conocida: spec §4 declara el contenido i18n fuera de alcance,
pero sin estas claves el motor haría throw con literales. `ui.normas.*` queda para spec-05.

- `errors.calculo.dato-ausente` — RF-17, E-16 (variable opcional `{jugador}`).
- `errors.alineacion.duplicados` / `sin-capitan` / `capitan-fuera` / `sin-posicion` /
  `entrenador-invalido` / `entrenador-en-quinteto` / `elegibilidad` /
  `posiciones-invalidas` / `jugador-inactivo` / `lesion-expulsion-excluyentes` — RF-02/RF-03/RF-14/RF-15, E-17/E-21/E-22.
- `errors.close.passed` / `errors.close.missing_time` / `errors.close.invalid_time` — RF-16, E-18/E-19 (unificado bajo `errors.close.*` con `spec-01`, `spec-04` y `spec-06`).

Texto plano, sin HTML, sin plurales, frases completas (prohibida concatenación).

## 6. Estrategia de tests en Vitest

Infra y umbrales los pone la 01; aquí la matriz exigible. Objetivo: 100% en cálculo §0,
validación de posiciones y rachas (Constitución §6 + DoD spec).

- `calculo.test.ts`: BASE negativa/`0`; Maider `13->20`, `-1->-1.5->-1`;
  Páter `0->2`, `-5->2`; bloqueo `+5/-N` con BASE 0; no-capitán sin x1.5;
  Páter sin x1.5. RF-01/RF-04/RF-05/RF-07, E-01–E-05.
- `rachas.test.ts`: `0,-1,-2,-3,-4…` sin tope; ruptura por no alinear;
  sin quinteto `-10` + reset; jornada `papel` `0` + reset de rachas de todos; lesionado cuenta para futura; J1/alta = 1ª.
  RF-08/RF-09/RF-19/RF-21, E-07–E-09/E-24.
- `jornada.test.ts`: MVP simple entre quienes jugaron, empate habilita a todos,
  MVP exige jugar (máxima `0` o negativa habiendo jugado sí da `+3`; no jugados con `0` forzado no bloquean; 0 jugados -> sin `+3`), MVP+Maider (`+3` sin multiplicar), MVP+Páter,
  expulsado MVP (`+3` y `-5`), expulsión simple/doble (`-10`) con BASE intacta,
  lesión/expulsión excluyentes, total negativo preservado, orden RF-13,
  dato ausente bloquea con throw, sin quinteto `-10` + reset, papel `0` excluida + reset, recálculo total tras corrección.
  RF-10–RF-13/RF-17/RF-19–RF-21, E-10–E-16/E-20/E-22–E-24.
- `validacion-alineacion.test.ts`: 5 distintos + entrenador + capitán del quinteto
  con posición; elegibilidad separada; 2 posiciones por jugador; `["E","A"]` válido;
  E/A intercambiables `+5`. RF-02/RF-03/RF-06/RF-14/RF-15, E-06/E-17/E-21.
- `cierre.test.ts`: `-3h` exactas `Europe/Madrid` con instante de inicio;
  rechazo en el segundo exacto; cambio de hora no invalida; sin hora bloquea.
  RF-16, E-18/E-19.
- `constantes.test.ts`: snapshot de `5, N, 3, 5, 1.5, 3h, -10` como red para `/normas`.

Orden TDD por cambio de regla: (1) test que falla, (2) motor, (3) `README §0`. Mismo cambio.

## 7. Trazabilidad requisito -> parte

- RF-01 BASE/lesión -> `forzarBASE` + `calculo.test.ts`.
- RF-02/RF-03 entrenadores -> `validacion-alineacion.ts` + test validación.
- RF-04 Maider -> `aplicarEntrenador` + `redondeoHalfUp` + `constantes.ts`.
- RF-05 Páter -> `aplicarEntrenador` + `constantes.ts`.
- RF-06/RF-07 posición y bloqueo -> `normalizarPosicion` + `calcularJugador`.
- RF-08/RF-09 rachas -> `rachas.ts` + `rachas.test.ts`.
- RF-10 MVP -> `esMVP` + `jornada.test.ts`.
- RF-11/RF-12 expulsión y total -> `calcularJornada` + `jornada.test.ts`.
- RF-13 orden -> `calcularJugador`/`calcularJornada` + `jornada.test.ts`.
- RF-14/RF-15 alineación y posiciones -> `validacion-alineacion.ts` + Zod §2.
- RF-16 cierre -> `cierre.ts` + `cierre.test.ts`.
- RF-17 dato ausente -> `forzarBASE` throw + `errors.calculo.dato-ausente`.
- RF-18 desglose -> `DesgloseJugador`/`ResultadoJornada` (dato, nunca recálculo manual).
- RF-19 sin quinteto -> `calcularJornada` rama `sin-quinteto` (`-10`) + `siguienteRacha` reset.
- RF-20 recálculo -> `recalcularJornada` pura (el botón es spec-09).
- RF-21 jornada papel -> `calcularJornada` rama `papel` (`0` excluida) + `siguienteRacha` reset a `0`.

## 8. Puerta de calidad y orden de ejecución

1. Verificar que la 01 está en verde (`tsc`, `lint`, `test`, `build`).
2. Añadir `constantes.ts` + su test snapshot.
3. `rachas.ts` + `cierre.ts` + tests (sin dependencias del motor).
4. `validacion-alineacion.ts` + tests Zod.
5. `calculo.ts` (`forzarBASE` -> `aplicarEntrenador` -> `calcularJugador` -> `calcularJornada`).
6. `es/strings.json` solo `errors.*`.
7. Puerta `AGENTS.md`: `npx tsc --noEmit` 0 errores, cero `any`,
   `npm run lint` 0 warnings, `npm test` verde con 100% en scoring/rachas/posiciones,
   `npm run build` verde.
