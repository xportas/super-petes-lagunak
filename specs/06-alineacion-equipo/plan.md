# Plan técnico — spec-06 Alineación Equipo (`/equipo`)

> Depende de: `spec-01` (TS strict, Vitest, `es/strings.json`, `src/lib/i18n`), `spec-02` (motor `src/lib/scoring/` + dominio `src/lib/dominio/`), `spec-03` (tablas `jugador/entrenador/jornada/alineacion/usuario`), `spec-04` (sesión, `onboarding`, guardas), `spec-05` (anclas `/normas#cierre #base #posicion #racha #entrenadores`), `spec-09 RF-04/RF-05` (baja `inactivo`, `lesionado` pre-partido).

Principio rector: `/equipo` no calcula. Llama a `scoring/` para `+5` y a `dominio/` para `−N` y cierre. Prohibido duplicar §0 en UI, actions o SQL.

## 1. Modelos de datos (reutiliza spec-03, no crea tablas)

Tablas leídas/escritas — solo columnas usadas por esta spec:

* `jornada(id, numero_jornada, hora_partido timestamptz, estado: pendiente|calculada|papel|invalidada, rival, lugar)`: lectura ordenada `hora_partido ASC, numero_jornada ASC` para jornada activa; `cierre` siempre derivado, nunca persistido.
* `jugador(id, nombre, nombre_pete, img, img_pete, posiciones_validas[2]|NULL, estado_sanitario: disponible|lesionado, activo: bool, fecha_alta, fecha_baja, fnb_uuid)`: lectura plantilla. `inactivo` o `posiciones_validas NULL` (bandeja Pendientes) = no elegible para guardar.
* `entrenador(id: 'maider'|'pater', nombre, img)`: invariante Pete.
* `alineacion(usuario_id, jornada_id UNIQUE(usuario_id,jornada_id), slot_b, slot_e, slot_a, slot_ap, slot_p: jugador_id, entrenador_id, capitan_jugador_id, created_at, updated_at, instante_inicio_peticion)`: única escritura de esta spec, upsert idempotente.
* `usuario(id, username, rol: manager|admin, onboarding_completado_at) + sesión httpOnly`: solo validación.

Derivado UI (no persiste):

```ts
type SlotPos = 'B'|'E'|'A'|'AP'|'P';
type PreviewSlot = { muestraMas5: boolean; penalizacionRacha: number | null; // null = estreno->✅
  baseCero: 'ninguno'|'lesionado'|'inactivo'; avisoRachaFutura: boolean; };
type Draft = { slots: Record<SlotPos, string|null>; entrenador: 'maider'|'pater'|null; capitan: string|null; };
```

Cubre: RF-01 (5 slots fijos), RF-07 (entrenador excluyente), RF-08 (capitán entre 5), RF-12 (J1..J14 orden canónico).

## 2. Decisiones + alternativa descartada

1. **Draft solo en estado cliente, sin borrador servidor. Salir sin guardar = se pierde.** Justificación: RF-09 exige explícitamente no-borrador + reanuda desde última válida. Descartada: tabla `borrador` / `localStorage` — crea divergencia cierre y complejidad sync.
2. **Server Component resuelve jornada activa + plantilla + última válida; Client `equipo-editor` solo edita draft.** Justificación: Constitución §3 sin Realtime/polling, lecturas SSR cacheadas. Descartada: todo `'use client'` con fetch — pierde caché, expone `service_role`, duplica cierre.
3. **Preview solo `+5/−N` + etiqueta entrenador, sin `base est.` ni total.** Justificación: desviación consciente spec-06 §1 RF-04 sobre README §3. Descartada: mostrar estimación `12+5−1=16` — inventa BASE pre-partido y viola §0.
4. **Preview llama a `scoring.esBonusPosicion()` y `dominio.proximaPenalizacionRacha()`, nunca calcula en UI.** Justificación: AGENTS motor puro único. Descartada: `if (posValida) +5` en componente — divergencia garantizada.
5. **Cierre = `hora_partido − 3h`, validado en servidor con instante inicio petición, `ahora_servidor < cierre` estricto, zona `Europe/Madrid` solo para mostrar.** Almacén `timestamptz` UTC, resta 3h en ms, format con `timeZone:'Europe/Madrid'`. Justificación: Constitución §7 + spec-02 RF-16/E-18. Descartada: validar en cliente / usar instante fin / guardar `cierre` fijo en BD — manipulable, race, se desincroniza si Admin cambia hora.
6. **Tras cierre y `pendiente`: misma jornada en solo-lectura + `Cerrado - vuelve tras el partido` + link `#cierre`.** Solo al pasar a `calculada|papel` se promueve siguiente `pendiente`. Justificación: RF-10b literal. Descartada: saltar a siguiente futura inmediatamente o 404 — ocultaría última válida y rompería `−10`/racha.
7. **Upsert idempotente `(usuario_id,jornada_id)`; último válido gana; doble-tap = una escritura.** Justificación: caso límite red. Descartada: inserts múltiples + histórico borradores.
8. **Selector tap-to-select + bottom-sheet lista filtrable (posición válida + `disponible|lesionado`), ocupados deshabilitados. Cero drag&drop, cero libs DnD.** Justificación: Constitución §8 + RF-02/RF-12c 360–430px, ≥44px. Descartada: `react-dnd` / `<select>` nativo / grid 2 columnas.
9. **Alineación guardada con `inactivo` sobrevenido sigue válida si no re-guardas; para re-guardar debes sustituirlo.** `lesionado` sobrevenido muestra `🚑 BASE 0`. Justificación: RF-06 + spec-02 RF-14. Descartada: invalidar automáticamente al dar de baja — castigaría sin culpa y complicaría cálculo.
10. **Iconos propios `tap-to-expand` (popover + link ancla normas), sin lib tooltip/hover.** Justificación: RF-11 móvil sin hover. Descartada: `title`/hover/sonner.

## 3. Archivos exactos

Crear (nada fuera de esta lista sin aprobar):

```
src/app/equipo/page.tsx                                  # RSC: guardas, jornada activa, fetch, <EquipoEditor initial=... readonly=...>
src/app/equipo/actions.ts                               # 'use server' guardarAlineacion()
src/app/equipo/_components/equipo-editor.tsx            # 'use client' draft, validación bloqueo Guardar, idempotencia
src/app/equipo/_components/slot-jugador.tsx             # slot 44px + preview + 🚑/❌
src/app/equipo/_components/selector-jugadores.tsx       # bottom-sheet lista, filtros, ocupados
src/app/equipo/_components/selector-entrenador.tsx      # Maider|Páter excluyente
src/app/equipo/_components/preview-modificadores.tsx    # +5/−N/✅/BASE0 solo desde props motor/dominio
src/app/equipo/_components/icono-ayuda.tsx              # tap-to-expand + <a href=/normas#...>
src/app/equipo/_lib/preview-equipo.ts                   # pura: mapea scoring/dominio -> PreviewSlot (testeable sin React)
src/app/equipo/_lib/preview-equipo.test.ts              # Vitest matriz E==A + BASE0
src/app/equipo/_lib/validacion-equipo.ts                # pura: draft -> {ok, motivoKey} (sin BASE)
src/app/equipo/actions.test.ts                          # Vitest validación servidor + cierre (mock supabase/fecha)
es/strings.json                                         # MODIFICAR: añadir ui.equipo.* + errors.* (ver §6)
src/lib/supabase/queries/alineaciones.ts                # MODIFICAR/CREAR: getAlineacion(), upsertAlineacion() (service_role, tras sesión)
src/proxy.ts                                            # MODIFICAR: si spec-04 no lo hizo, redirect no-auth->/login, admin-> errors.admin.no_juega
```

Reutilizar sin duplicar (si spec-01/02 no existen, esta spec los exige como prerrequisito, no los reimplementa):

```
src/lib/scoring/*.ts        # esBonusPosicion(slot, posicionesValidas) — RF-03
src/lib/dominio/cierre.ts   # calcularCierre(hora_partido), estaCerrado(ahora, cierre)
src/lib/dominio/rachas.ts   # proximaPenalizacion(managerId, jugadorId, jornadaActiva)
src/lib/dominio/alineacion.ts # validarAlineacionCompleta() — RF-09 servidor
src/lib/i18n/*.ts           # t(key)
```

## 4. Tipos TS strict + Zod

```ts
// src/app/equipo/_lib/validacion-equipo.ts
import { z } from 'zod';
export const SlotPosSchema = z.enum(['B','E','A','AP','P']);
export const GuardarAlineacionSchema = z.object({
  jornadaId: z.string().uuid(),
  slots: z.object({ B:z.string().uuid(), E:z.string().uuid(), A:z.string().uuid(), AP:z.string().uuid(), P:z.string().uuid() }),
  entrenadorId: z.enum(['maider','pater']),
  capitanId: z.string().uuid(),
}).superRefine((v,ctx)=>{
  const ids = Object.values(v.slots);
  if (new Set(ids).size!==5) ctx.addIssue({code:'custom', message:'duplicado'});
  if (!ids.includes(v.capitanId)) ctx.addIssue({code:'custom', message:'capitan_fuera'});
});
export type GuardarAlineacionInput = z.infer<typeof GuardarAlineacionSchema>;
// JugadorElegible: { id, nombre, nombrePete, img, imgPete, posicionesValidas:[Pos,Pos]|null, estadoSanitario, activo }
```

`preview-equipo.ts` firma pura:

```ts
export function previewSlot(slot: SlotPos, j: JugadorElegible|null, rachaN: number|null): PreviewSlot;
// delega: scoring.esBonusPosicion(slot, j.posicionesValidas) && j.activo && j.estadoSanitario==='disponible'
// rachaN: 0->✅, >=1 -> −N, lesionado/inactivo -> null + avisoRachaFutura=true + baseCero
```

Cero `any`; `unknown` + narrowing en actions al leer `formData`/supabase.

## 5. Contratos

**Puras (testeables, sin I/O):**
* `esBonusPosicion(slot, posicionesValidas: [Pos,Pos]): boolean` — `E<->A` intercambiables, `['E','A']` siempre true en E/A (spec-02 RF-06). Cubre RF-01/RF-03. DoD-2.
* `proximaPenalizacionRacha(historico: boolean[], esEstreno): 0|−N` — `1ª=0, 2ª=−1…`, cuenta aunque BASE 0 (spec-02 RF-08/09). Cubre RF-05. DoD-4.
* `calcularCierre(hora_partido: Date): Date` = `−3h`; `esCierreSuperado(ahoraServidor, cierre) = ahoraServidor >= cierre`. Cubre RF-10. DoD-7.
* `resolverJornadaActiva(jornadas): Jornada|null` = primera `estado==='pendiente'` en `hora_partido ASC, numero_jornada ASC`. Cubre RF-10/10b.
* `validarDraftLocal(draft): {puedeGuardar:boolean; motivoKey?: string}` — espejo UX de RF-09, nunca sustituye servidor.

**Server Action `guardarAlineacion(input: unknown)`:**
1. `auth()` sesión httpOnly → no-auth redirect `/login`; `admin` → `{error:'errors.admin.no_juega'}`; onboarding incompleto → redirect.
2. `GuardarAlineacionSchema.parse(input)` → error i18n sin escribir (cubre bypass duplicado/incompleto).
3. Fetch `jornada + plantilla` con `service_role`; re-check `activo===true && posicionesValidas?.length===2` por cada id; `entrenador in {maider,pater}`; `capitan in slots`; `esBonus` no se persiste.
4. `ahora = new Date()` al inicio; `cierre=calcularCierre(hora_partido)`; si `ahora>=cierre` → `{error:'errors.close.passed'}` sin escribir.
5. `upsert alineacion on (usuario_id,jornada_id)` + `revalidatePath('/equipo')`. Retorna `{ok:true}`. Red mantiene selección en cliente + toast reintento.

**Supabase:** solo `alineacion` escribe; `jornada/jugador/entrenador` leen. RLS `DENY ALL anon`, todo vía server `service_role` tras sesión+rol (spec-03 RF-04).

## 6. Claves i18n nuevas (`es/strings.json`, cero hardcode)

```json
"ui.equipo.titulo":"Mi quinteto", "ui.equipo.jornada":"J{num} · {rival}",
"ui.equipo.cierre_en":"Cierre en {time}", "ui.equipo.cerrado":"Cerrado - vuelve tras el partido",
"ui.equipo.guardar":"Guardar quinteto", "ui.equipo.guardando":"Guardando…",
"ui.equipo.motivo.falta_slot":"Te falta {slot}", "ui.equipo.motivo.falta_entrenador":"Elige entrenador",
"ui.equipo.motivo.falta_capitan":"Elige capitán entre los 5", "ui.equipo.motivo.hay_inactivo":"{nombre} es baja: sustitúyelo",
"ui.equipo.motivo.cerrado":"Fuera de plazo",
"ui.equipo.slot.vacio":"Toca para elegir {slot}", "ui.equipo.slot.cambiar":"Cambiar", "ui.equipo.slot.vaciar":"Vaciar",
"ui.equipo.selector.titulo":"Elige {slot}", "ui.equipo.selector.filtro_todos":"Todos",
"ui.equipo.selector.ocupado":"En {slot}", "ui.equipo.selector.solo_disponibles":"Solo disponibles",
"ui.equipo.preview.mas5":"📍 +5", "ui.equipo.preview.racha":"⚠️ −{n}", "ui.equipo.preview.estreno":"✅",
"ui.equipo.preview.base0_lesion":"🚑 BASE 0", "ui.equipo.preview.base0_baja":"❌ BASE 0",
"ui.equipo.aviso.lesion_ocupa":"Ocupa slot y cuenta para racha futura",
"ui.equipo.entrenador.maider_info":"Maider: x1.5 solo BASE del capitán",
"ui.equipo.entrenador.pater_info":"Páter: suelo 1 +1 a los 5",
"ui.equipo.ayuda.base":"Ver base", "ui.equipo.ayuda.posicion":"Ver posición", "ui.equipo.ayuda.racha":"Ver racha",
"ui.equipo.ayuda.cierre":"Ver cierre", "ui.equipo.ayuda.entrenadores":"Ver entrenadores",
"errors.close.passed":"Cierre superado", "errors.equipo.duplicado":"Jugador repetido",
"errors.equipo.incompleto":"Alineación incompleta", "errors.equipo.capitan_fuera":"Capitán fuera del quinteto",
"errors.equipo.no_elegible":"Jugador no elegible", "errors.equipo.red":"Error de red, reintenta sin perder tu selección",
"errors.admin.no_juega":"El admin no juega"
```

Cubre RF-12b + RF-06/RF-09/RF-10/RF-11. Todo con `{var}`, sin concatenar.

## 7. Estrategia Vitest

Prerrequisito `spec-01`: `npm test` existe. Ficheros:

* `preview-equipo.test.ts` (puro, sin React): matriz 5 slots × pares `[B,E],[E,A],[A,AP],[AP,P],[B,P]` verificando `E==A` en ambos sentidos; `lesionado/inactivo` → `muestraMas5=false, penalizacion=null, baseCero` + `avisoRachaFutura`; `disponible` bien colocado → `+5`. Cubre RF-01/03/06, DoD-2/4.
* `validacion-equipo.test.ts`: vaciar slot capitán limpia capitán + `puedeGuardar=false`; duplicado/incompleto/sin entrenador/capitán fuera → motivoKey i18n. Cubre RF-08/09, DoD-5/6.
* `actions.test.ts` (mock supabase + `vi.setSystemTime` con `Europe/Madrid` DST): `ahora<cierre` guarda y re-guardar sustituye; `ahora==cierre` y `>` rechazan `errors.close.passed` sin escribir; cambio `hora_partido` recalcula y reabre/cierra sin borrar; payload inválido rechaza sin persistir; `inactivo` exige sustitución pero guardado previo sigue válido; `−10`/ruptura racha delegada a dominio (no se re-testea aquí). Cubre RF-09/10 + casos límite, DoD-6/7/8.
* E2E manual checklist (DoD-1/9/10): 360–430px taps ≥44px, 0 scroll-h, 0 drag; iconos abren tap + ancla exacta `/normas#...`; Pete conmuta `img/nombre` sin tocar validación; admin bloqueado.

Puerta: `npx tsc --noEmit` 0 errores, `lint` 0 warnings, `test` verde, `build` verde; cobertura 100% en `preview`+`validacion`+`cierre`.

## 8. Trazabilidad RF → plan

| RF | Implementación |
|---|---|
| RF-01 5 slots E==A | `page` slots fijos + `esBonusPosicion` + test matriz |
| RF-02 tap sin duplicados, solo activos 2 pos | `selector-jugadores` filtros + `ocupado` disabled + Zod servidor |
| RF-03 +5 vía motor, oculta si 🚑/❌ | `previewSlot` + `scoring`, test BASE0 |
| RF-04 sin base ni total | `preview-modificadores` solo +5/−N/etiqueta |
| RF-05 racha Dominio, ✅ estreno | `rachas.proximaPenalizacion`, prohibido calcular en UI |
| RF-06 lesionado alineable + baja ❌ | `baseCero` + aviso racha futura; `inactivo` bloquea re-guardar |
| RF-07 entrenador excluyente | `selector-entrenador` + Zod enum |
| RF-08 capitán entre 5 | limpieza auto al vaciar + validación |
| RF-09 bloqueo sin borrador + re-validación | `validarDraftLocal` + `GuardarAlineacionSchema` + upsert |
| RF-10/10b jornada activa + cierre servidor + lectura bloqueada | `resolverJornadaActiva` + `calcularCierre` + `readonly` |
| RF-11 iconos tap + ancla | `icono-ayuda` → `/normas#cierre #base #posicion #racha #entrenadores` |
| RF-12a Pete | `img/nombre` switch, entrenadores invariantes |
| RF-12b i18n | claves §6, 0 literales |
| RF-12c móvil 360–430 ≥44px AA | layout 1 columna, bottom-sheet, fondo pista contraste |
