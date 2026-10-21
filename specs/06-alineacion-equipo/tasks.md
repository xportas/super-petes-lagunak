# tasks-06 — Alineación Equipo (`/equipo`)

> Fuente: `spec.md` + `plan.md` de esta carpeta. No implementa §0, solo lo consume desde `src/lib/scoring/` y `src/lib/dominio/`.
> Orden TDD: primero tests en rojo, luego código. Prerrequisitos externos: `spec-01` (Vitest/TS/i18n), `spec-02` (motor/dominio), `spec-03` (tablas), `spec-04` (sesión).

- [x] **T-01 — Test matriz `slot vs posicionesValidas` con `E==A` vía motor**
  Cubre: RF-01, RF-03 + DoD-2.
  Crear `src/app/equipo/_lib/preview-equipo.test.ts` en rojo: tabla 5 slots × pares `[B,E],[E,A],[A,AP],[AP,P],[B,P]`; `E<->A` intercambiables; `['E','A']` siempre `+5` en `E/A`.
  Verifica: `npm test -- preview-equipo` en rojo → luego verde.
  Hecho cuando: matriz completa pasa llamando a `scoring.esBonusPosicion()`, 0 lógica duplicada en test.

- [x] **T-02 — Test cierre `-3h Europe/Madrid` con segundo exacto**
  Cubre: RF-10 + DoD-7 + Constitución §7.
  Crear `src/app/equipo/actions.test.ts` (mock supabase + `vi.setSystemTime`): `hora_partido` con DST verano/invierno; `ahora < cierre` acepta; `ahora == cierre` y `>` rechazan `errors.close.passed` sin escribir; cambio `hora_partido` recalcula sin borrar guardados.
  Verifica: `npm test -- actions` en rojo.
  Hecho cuando: 4 casos (`<`, `==`, `>`, cambio hora) definidos y fallando por falta de `actions.ts`.

- [x] **T-03 — Test racha desde Dominio + ocultación por `BASE 0`**
  Cubre: RF-05, RF-06 + DoD-4.
  Ampliar `preview-equipo.test.ts`: racha `0→✅`, `1→−1`, `2→−2`, `3→−3`; `lesionado/inactivo` → `muestraMas5=false`, `penalizacion=null`, `baseCero`, `avisoRachaFutura=true`.
  Verifica: `npm test -- preview-equipo`.
  Hecho cuando: `previewSlot()` aún no existe y el test falla; prohibido calcular racha en UI queda fijado.

- [x] **T-04 — Claves i18n `ui.equipo.*` + `errors.*`**
  Cubre: RF-09, RF-10, RF-11, RF-12b.
  Modificar `es/strings.json`: añadir bloque §6 del plan (`titulo, jornada, cierre_en, cerrado, guardar, motivo.*, slot.*, selector.*, preview.*, aviso.lesion_ocupa, entrenador.*_info, ayuda.*`, `errors.close.passed, errors.equipo.*, errors.admin.no_juega`) con `{var}`, sin concatenar.
  Verifica: `node -e "JSON.parse(require('fs').readFileSync('es/strings.json'))"` + `grep -r "Guardar quinteto" src/app/equipo || echo OK`.
  Hecho cuando: JSON válido, 0 literales nuevos en código posterior usan estas claves.

- [x] **T-05 — Tipos + Zod `GuardarAlineacionSchema` + `validarDraftLocal` pura**
  Cubre: RF-09, RF-07, RF-08.
  Crear `src/app/equipo/_lib/validacion-equipo.ts`: `SlotPosSchema`, `GuardarAlineacionSchema` (5 uuid distintos, `entrenadorId: maider|pater`, `capitan in slots`) + `validarDraftLocal(draft)→{puedeGuardar, motivoKey}` espejo UX.
  Crear `validacion-equipo.test.ts`: duplicado, incompleto, sin entrenador, capitán fuera, `inactivo` en draft → motivo i18n.
  Verifica: `npm test -- validacion-equipo` en rojo → verde; `npx tsc --noEmit`.
  Hecho cuando: tests verdes, cero `any`.

- [x] **T-06 — Pura `previewSlot()` delegando a motor/dominio**
  Cubre: RF-03, RF-04, RF-05, RF-06.
  Crear `src/app/equipo/_lib/preview-equipo.ts`: firma `previewSlot(slot, jugador, rachaN): PreviewSlot`; `muestraMas5 = scoring.esBonusPosicion() && activo && disponible`; `lesionado/inactivo` fuerzan `BASE 0`.
  Verifica: `npm test -- preview-equipo` pasa a verde; `npx tsc --noEmit`.
  Hecho cuando: T-01+T-03 en verde sin recalcular a mano, sin `base est.` ni total.

- [x] **T-07 — Queries Supabase `alineaciones` (server-only)**
  Cubre: RF-10/10b + spec-03 RF-04/12.
  Crear `src/lib/supabase/queries/alineaciones.ts`: `getAlineacion(usuarioId,jornadaId)`, `upsertAlineacion(...)` con cliente `service_role`, `ORDER BY hora_partido ASC, numero_jornada ASC` para activa; RLS `DENY ALL anon`.
  Verifica: `npx tsc --noEmit`; mock test en T-08.
  Hecho cuando: solo servidor importa este módulo, ningún `service_role` llega a cliente.

- [x] **T-08 — Server Action `guardarAlineacion` con cierre + rol**
  Cubre: RF-09, RF-10, casos límite bypass/cierre exacto/doble-tap/red.
  Crear `src/app/equipo/actions.ts`: `'use server'`; instante `ahora=new Date()` al inicio; sesión httpOnly → `admin` rechaza `errors.admin.no_juega`; Zod parse → error sin escribir; re-check `activo+2 posiciones`, `capitan in slots`; `ahora>=cierre` rechaza; `upsert (usuario,jornada)` + `revalidatePath('/equipo')`.
  Verifica: `npm test -- actions` en verde (T-02 ahora pasa); `npx tsc --noEmit`.
  Hecho cuando: payload inválido/duplicado no persiste; doble-tap = 1 fila última gana; error red no pierde draft (cliente lo conserva).

- [x] **T-09 — `page.tsx` RSC: jornada activa + lectura bloqueada**
  Cubre: RF-10, RF-10b.
  Crear `src/app/equipo/page.tsx`: guardas (`/login`, `/cambiar-password`, `/onboarding`); `resolverJornadaActiva()` primera `pendiente`; si `ahora>=cierre && pendiente` → `readonly` + última válida + aviso `Cerrado` + link `/normas#cierre`; si `calculada|papel` → promueve siguiente `pendiente`; vacía sin envío → estado vacío cerrado (`−10` lo calcula dominio, aquí solo muestra vacío).
  Verifica: manual `npm run dev` + `npm test -- actions` sigue verde.
  Hecho cuando: J1..J14 precargadas e `invalidada` nunca es activa; tras cierre no hay edición.

- [x] **T-10 — `equipo-editor` cliente: draft sin borrador + Guardar bloqueado**
  Cubre: RF-09 + DoD-5/6.
  Crear `src/app/equipo/_components/equipo-editor.tsx` (`'use client'`): estado `Draft` inicializado desde última válida; salir sin guardar descarta; `validarDraftLocal` desactiva Guardar con `motivoKey` i18n; idempotencia doble-tap.
  Verifica: `npm test -- validacion-equipo`; manual: rellenar 3 slots → salir → vuelve a última válida.
  Hecho cuando: falta slot/`inactivo`/entrenador/capitán → Guardar off con motivo; 0 persistencia parcial.

- [x] **T-11 — Slots + selector tap-to-select + entrenador + capitán**
  Cubre: RF-01, RF-02, RF-07, RF-08 + DoD-1/5.
  Crear `slot-jugador.tsx`, `selector-jugadores.tsx` (bottom-sheet, filtros posición/estado, `ocupado→En {slot}` disabled, cambiar/vaciar), `selector-entrenador.tsx` (excluyente), marca capitán; vaciar/cambiar capitán limpia capitán. Prohibido drag&drop.
  Verifica: manual 360–430px solo taps; `npm run lint`.
  Hecho cuando: 5 slots fijos + entrenador + capitán; ocupado no elegible; `inactivo`/Pendientes no aparecen.

- [x] **T-12 — `preview-modificadores` sin base ni total**
  Cubre: RF-04 + DoD-3.
  Crear `preview-modificadores.tsx`: solo `📍 +5`, `⚠️ −N`/`✅`, `🚑/❌ BASE 0` + etiqueta `Maider/Páter` fija desde props `PreviewSlot`.
  Verifica: `grep -ri "base est\|total" src/app/equipo --include="*.tsx" | wc -l` = 0; `npm test -- preview-equipo`.
  Hecho cuando: ningún estado muestra número base ni total.

- [x] **T-13 — Lesionado alineable + baja `inactivo` sobrevenida**
  Cubre: RF-06 + DoD-4.
  En `slot-jugador` + `equipo-editor`: `lesionado` permite alinear, oculta `+5/−N`, muestra `🚑 BASE 0` + `aviso.lesion_ocupa`; `inactivo` muestra `❌ BASE 0`, conserva válida si no re-guardas, exige sustitución para re-guardar; `<5 sanos` no bloquea (completa con 🚑).
  Verifica: `npm test -- preview-equipo` + manual con Admin cambia estado tras guardar.
  Hecho cuando: guardado previo con baja sigue válido; re-guardar con `inactivo` rechaza servidor.

- [x] **T-14 — `icono-ayuda` tap-to-expand con anclas normas**
  Cubre: RF-11 + DoD-10.
  Crear `icono-ayuda.tsx`: tap (nunca hover) abre tooltip i18n + `<a href="/normas#...">`: `✅→#base`, `📍→#posicion`, `⚠️→#racha`, `🚑/❌→#base`, `⏱→#cierre`, `Maider/Páter→#entrenadores`.
  Verifica: manual móvil tap cada icono → ancla exacta.
  Hecho cuando: 0 `title`/hover, 0 literales fuera de `strings.json`.

- [x] **T-15 — Modo Pete + guardas rol + proxy**
  Cubre: RF-12a + roles.
  Slots/lista usan `imgPete/nombrePete` si ON, `img/nombre` si OFF; entrenadores invariantes; sin efecto en validación. Modificar `src/proxy.ts` si spec-04 no lo hizo: no-auth→`/login`, temporal→`/cambiar-password`, onboarding→`/onboarding`, `admin` en `/equipo`→`errors.admin.no_juega`.
  Verifica: toggle Pete manual; `npx tsc --noEmit`.
  Hecho cuando: conmuta visual sin alterar `+5/−N`/cierre; Admin bloqueado.

- [x] **T-16 — Móvil 360–430px + contraste + puerta calidad**
  Cubre: RF-12c + DoD-1/9/10.
  Ajustar layout 1 columna, targets ≥44px, 0 scroll-h, fondo pista con contraste AA; pasar `npx tsc --noEmit` 0 errores, `npm run lint` 0 warnings, `npm test` verde, `npm run build` verde.
  Verifica: `npx tsc --noEmit && npm run lint && npm test && npm run build`.
  Hecho cuando: puerta verde + checklist manual 360/430px taps, tooltips, Pete, Admin.
