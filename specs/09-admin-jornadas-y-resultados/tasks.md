# Tasks spec-09 — Admin Jornadas y Resultados

> Fuente: `spec.md` (RF-01–RF-15, E-01–E-16) + `plan.md`. Bloqueado sin `spec-01` (TS `strict`, Vitest, `es/strings.json` tipado). No redefine ni toca `src/lib/scoring/*` (dueño `spec-02`), ni DDL/seed (`spec-03`), ni throttle/parseo OWC (`spec-10`); solo los consume.

## Fase 0 — Tests primero (red) + tipos

- [x] **T-01 Tests puros `src/lib/admin/*.test.ts` en rojo**
  RF: RF-03, RF-08, RF-10, RF-11, RF-15 / E-05, E-06, E-12, E-16.
  Crear tests que fallen por módulo inexistente para: `calcularCierre = hora-3h Europe/Madrid`, `plantillaVigente`, `validarActaCompleta`, `determinarOrigen`, `esPapel(hora+24h, state=1, null)`, `hashContenido`, `["E","A"]` válido, `lesionado+expulsado` rechaza, `0` forzado no-jugado, falta 1 fila bloquea, idéntico→`fnb` / distinto→`manual`.
  Verifica: `npm test -- src/lib/admin`
  Hecho cuando: `npm test -- src/lib/admin` falla por `Cannot find module`, no por error de tipos; `src/lib/scoring/*` intacto.

- [x] **T-02 Tipos + Zod servidor `src/lib/admin/tipos.ts` + `esquemas.ts`**
  RF: RF-01, RF-05, RF-08, RF-09 / E-01, E-10.
  Tipos `strict` sin `any`: `Posicion`, `EstadoJornada`, `OrigenResultado`, `EstadoActa`, `JornadaInput`, `JugadorInput` (tuple 2 posiciones), `ActaFilaInput`. Zod solo servidor: `jornadaSchema` (rival min 1, hora ISO `Europe/Madrid`, enum local/visitante, sin campo cierre), `jugadorSchema` (tuple 2 enums, dorsal opcional, `fnbUuid` uuid opcional), `actaSchema` (`valoracion.int()` negativos ok, `expulsado` solo si `jugo`, no-jugo exige `0`, sin campo `mvp`), `urlFnbSchema` (`?id=` / `?uuid=`).
  Verifica: `npx tsc --noEmit && npm test -- src/lib/admin/esquemas.test.ts`
  Hecho cuando: `tsc` 0 errores, test rechaza `lesionado+expulsado`, `1.5` y esquema con `mvp`.

## Fase 1 — Puras testeables (sin IO)

- [x] **T-03 `validacion-jornada.ts` + `calcularCierre.ts`**
  RF: RF-01, RF-03 / E-01, E-02.
  Exige rival + hora + local/visitante, nº liga auto correlativo editable, nunca columna/input cierre. Cambio de hora recalcula cierre sin resucitar tardías ni anular válidas.
  Verifica: `npm test -- src/lib/admin/validacion-jornada.test.ts`
  Hecho cuando: crear sin rival/hora rechaza con clave i18n sin insert; test cambio hora conserva válidas.

- [x] **T-04 `validacion-jugador.ts`**
  RF: RF-05, RF-06 / E-09, E-15.
  Nombre + exactamente 2 posiciones, dorsal repetible (nunca mapea), `img/imgPete` valida existencia en `public/` con fallback placeholder sin bloquear, `descripcion` opcional, `fnb_uuid` opcional, sanitario `disponible|lesionado`. Pendiente = `activo=true + posiciones_validas=NULL`.
  Verifica: `npm test -- src/lib/admin/validacion-jugador.test.ts`
  Hecho cuando: `["E","A"]` pasa, 1 o 3 posiciones falla, img inexistente avisa sin bloquear.

- [x] **T-05 `plantilla-vigente.ts` + `validacion-acta.ts`**
  RF: RF-08, RF-09 / E-10.
  Vigente = `fecha_alta<=cierre AND (fecha_baja IS NULL OR >cierre)` UNION bajas con acta/alineación en esa jornada (preseleccionado `no_convocado BASE 0`); altas posteriores al cierre excluidas. `validarActaCompleta` bloquea si falta 1 vigente, sin parcial ni borrador.
  Verifica: `npm test -- src/lib/admin/plantilla-vigente.test.ts`
  Hecho cuando: alta posterior no aparece, baja alineada aparece con `0`; falta 1 fila → `{ok:false}`.

- [x] **T-06 `origen-resultado.ts` + `papel.ts` + `idempotencia.ts`**
  RF: RF-10, RF-11, RF-15 / E-05, E-12, E-16.
  `determinarOrigen(enviado, oficial)`: igual→`fnb`, distinto/manual→`manual`. `esPapel = state==="1" && universallyId==null && ahora>=hora+24h`. `hashContenido` estable para idempotencia.
  Verifica: `npm test -- src/lib/admin/origen-resultado.test.ts`
  Hecho cuando: 1 campo distinto cambia a `manual`; dentro de gracia sigue `pendiente` con manual ok; mismo contenido mismo hash.

## Fase 2 — Infra transversal

- [x] **T-07 i18n `es/strings.json`: `ui.admin.*` + `errors.admin.*`**
  RF: RF-15 (transversal todos).
  Añadir `ui.admin.tabs.{jornadas,jugadores,resultados,usuarios,invitacion}`, `ui.admin.jornadas.*`, `ui.admin.jugadores.*`, `ui.admin.resultados.*`, `ui.admin.usuarios.*` y `errors.admin.{sin_rival_hora,menos_de_5,excluyente_lesion_expulsion,cero_forzado,incompleta_bloquea,url_invalida,no_lagunak,duplicada,fnb_caida,papel_sin_manual,no_admin,idempotente_reintento}` según plan §6. Cero literales en JSX.
  Verifica: `npx tsc --noEmit && npm run lint`
  Hecho cuando: typecheck 0 errores y `grep -r '"[A-ZÁ]' src/app/admin` no devuelve literales visibles.

- [x] **T-08 `src/proxy.ts` guarda `rol=admin`**
  RF: RF-14 / E-13.
  Verifica sesión `httpOnly` + `rol=admin` en servidor, else redirect login; sliding cookie. Ninguna Action de esta spec confía en el cliente.
  Verifica: `npm test -- src/proxy.test.ts`
  Hecho cuando: sin sesión o `rol=manager` redirige a login y nunca sirve `/admin`.

- [x] **T-09 Queries `src/lib/supabase/queries/{jornadas,jugadores,actas,ignorados,usuarios}.ts`**
  RF: RF-01, RF-02, RF-04, RF-12 / E-03.
  Solo cliente servidor `service_role` tras guardar rol; RLS DENY `anon`. Incluye `fnb_partidos_ignorados(fnb_match_id, eliminado_at)`. Si `spec-03` ya los creó, reutilizar sin duplicar. Cero totales/rachas/MVP persistidos.
  Verifica: `npx tsc --noEmit && npm run lint`
  Hecho cuando: typecheck + lint verdes y 0 importes de estos queries desde código cliente.

## Fase 3 — Server Actions (únicas mutaciones)

- [x] **T-10 Actions crear/actualizar jornada `crearJornada / actualizarJornada`**
  RF: RF-01, RF-02 (solo edición), RF-03 / E-01, E-02, E-04, E-14.
  Verifican `rol=admin` primero, validan `jornadaSchema` con Zod en servidor, `revalidatePath('/admin')`, devuelven `{ok}|{error:ClaveI18n}`. Edición de rival/lugar/hora/nº/marcador permitida en futura, cerrada o calculada + recalcula afectado; cambio de hora recalcula cierre sin resucitar tardías. Sin estado `desactivada`. Segunda fase crea jornadas nuevas con nº liga correlativo y nº FNB aparte.
  Verifica: `npm test -- src/app/admin/actions.test.ts -t "jornada-crear-actualizar"`
  Hecho cuando: crear sin rival/hora rechaza sin guardar; editar hora recalcula cierre y conserva válidas; mocks en verde.

- [x] **T-11 Action eliminar jornada `eliminarJornada` + `ignorados`**
  RF: RF-02 / E-03.
  Borrado físico siempre aunque tenga alineaciones o resultados + recalcula todo lo afectado con reglas vigentes. Si tenía `fnb_match_id`, insert en `fnb_partidos_ignorados` para que `spec-10 RF-02` no la recree. Idempotente por `Idempotency-Key`.
  Verifica: `npm test -- src/app/admin/actions.test.ts -t "jornada-eliminar"`
  Hecho cuando: borrar con dependencias elimina, recalcula y el sync posterior con mocks no la recrea; doble envío mismo key = 1 efecto.

- [x] **T-12 Actions jugador `upsertJugador / darBajaJugador / asignarPosicionesPendiente`**
  RF: RF-04, RF-05, RF-06 / E-08, E-09, E-15.
  Baja lógica con `fecha_alta/baja`, nunca borrado físico; rechaza si deja `<5` elegibles (`activo=true` con 2 posiciones). Baja alineada en jornada abierta: alineaciones guardadas siguen válidas (`❌ BASE 0`, entra en acta como `no_convocado BASE 0`), pero reeditar quinteto exige sustituto activo. Pendiente visible en `/jugadores` como `Posición pendiente`, no elegible en `/equipo`/`onboarding`, bloquea cálculo hasta asignar 2 posiciones. `lesionado` previo respetado por sync salvo acta con minutos → `jugo`.
  Verifica: `npm test -- src/app/admin/actions.test.ts -t "jugador"`
  Hecho cuando: dejar 4 activos rechaza; Pendiente bloquea cálculo (`pendiente`/`invalidada`); test verde.

- [x] **T-13 `sincronizarCalendario()` + `preRellenarActa(url)` dry-run**
  RF: RF-07 / E-04, E-07, E-11.
  Consume `src/lib/fnb/` (dueña `spec-10`): calendario desde `idTeam 11659` omite `ignorados`, crea/actualiza futuras sin tocar resultados (`state=0` solo calendario+cierre). Acta resuelve `pagina-partido/?id=` / `?uuid=` + cruce `Match/getByTeamAllSeason/11659`, trunca a entero, solo pre-rellena para revisión, nunca `INSERT`. URL inválida / no-Lagunak / id duplicado / FNB caída → error sin parcial; manual sigue operativo salvo papel.
  Verifica: `npm test -- src/app/admin/actions.test.ts -t "fnb"`
  Hecho cuando: pegar URL J2 pre-rellena 11 filas sin escribir BD hasta confirmar; con FNB caída manual J2 sigue posible.

- [x] **T-14 `guardarActa(jornadaId, filas, actaOficialRef)` con origen verificado**
  RF: RF-08, RF-09, RF-10 / E-06, E-07, E-08, E-10.
  Lista plantilla vigente (T-05), exige por cada uno valoración entera + `jugo|lesionado|no_convocado|dnp` + `expulsado` solo si `jugo`; no-jugado fija `0` bloqueada; `lesionado|no_convocado|dnp + expulsado` rechaza; falta 1 → rechazo sin parcial. Servidor verifica contra acta oficial (re-fetch o payload firmado): sin cambios→`origen_resultado='fnb'`, con cambios/manual→`manual`. Sin campo MVP ni flag FNB; `+3` solo motor. Papel nunca acepta guardado. 5 faltas = expulsión `-5` BASE intacta (vía motor `spec-02`).
  Verifica: `npm test -- src/app/admin/actions.test.ts -t "acta-guardar"`
  Hecho cuando: pre-relleno sin cambios guarda `fnb`, con 1 cambio guarda `manual`; incompleta bloquea `pendiente` sin `0` provisional.

- [x] **T-15 `reimportarDesdeFnb(jornadaId)` explícito con confirmación**
  RF: RF-10 / E-12.
  Tercera acción separada de T-13: descarga acta, sobrescribe, devuelve `origen_resultado` a `'fnb'` y recalcula todo lo afectado aunque hubiera edición manual. Requiere confirmación en cliente + idempotencia servidor. Permite que auto-sync actualice futuras correcciones oficiales si origen es `fnb`; si es `manual` el auto-sync la salta.
  Verifica: `npm test -- src/app/admin/actions.test.ts -t "acta-reimportar"`
  Hecho cuando: tras edición manual, Re-importar restaura valores FNB, marca `fnb` y recalcula; reintento mismo key no duplica.

- [x] **T-16 `recalcularJornada(jornadaId)` solo revalida y marca**
  RF: RF-11 / E-06, E-12.
  Revalida acta cruda y marca `calculada|pendiente|invalidada`, sin persistir totales, puestos ni rachas. Si falta valoración/estado u hora en nunca-calculada → `pendiente` con error. Si ya era `calculada` y queda incompleta o incluye Pendiente → `invalidada` (nunca regresa a `pendiente`).
  Verifica: `npm test -- src/app/admin/actions.test.ts -t "recalcular"`
  Hecho cuando: hueco bloquea sin tocar previos; `calculada` rota pasa a `invalidada` con aviso para `spec-08`.

- [x] **T-17 `generarTemporal(userId)` + `rotarInvitacion()`**
  RF: RF-12, RF-13 / E-16.
  Lista `username`, estado (`temporal activa / onboarding pendiente / bloqueado rate-limit`) y fecha, oculta Admin semilla. Temporal aleatoria mostrada 1 vez, revoca sesiones, limpia `rate_limit(login, username_normalizado)+(cambiar_password, usuario_id)`, obliga cambio por distinta en `/cambiar-password`. Prohíbe borrar/desactivar managers. Invitación autogenerada rotable, visible 1 vez, solo exige a nuevos. Idempotencia: reintento no regenera.
  Verifica: `npm test -- src/app/admin/actions.test.ts -t "usuarios"`
  Hecho cuando: doble-tap genera 1 sola temporal/invitación; temporal limpia ambos alcances y revoca (mocks).

## Fase 4 — UI móvil (cargar skill `mobile-native` antes de codificar)

- [x] **T-18 Shell `/admin/page.tsx?tab=` + `tabs.tsx`**
  RF: RF-15.
  Un solo `page.tsx` Server Component con 5 pestañas internas `jornadas|jugadores|resultados|usuarios|invitacion`, `tap-to-select`, 360–430px, táctiles ≥44px, cero hover, claro/oscuro + Pete cosmético (`Maider/Páter` invariantes). Lazy Sync con throttle antes de render delegando a `src/lib/fnb/`. Solo agregado, nunca quintetos ajenos.
  Verifica: `npx tsc --noEmit && npm run lint && npm run build`
  Hecho cuando: build verde, 0 `use client` en `page.tsx`, tabs cambian por `?tab=` sin recarga completa.

- [x] **T-19 Forms `jornada-form, jugador-form, acta-form (0 forzado disabled), pendientes-banner, usuarios-table, invitacion-panel`**
  RF: RF-01, RF-04, RF-06, RF-08, RF-12, RF-13.
  Todo texto vía `es/strings.json`; botón disabled al primer tap; `acta-form` fija `0` disabled al elegir no-jugado; `pendientes-banner` avisa bloqueo de cálculo; confirmación explícita en Re-importar.
  Verifica: `npm run lint && npm test -- src/app/admin`
  Hecho cuando: lint 0 warnings, no-jugado envía `0` y servidor lo revalida; Pendiente muestra `Posición pendiente`.

- [x] **T-20 Guardias UI: solo agregado, Admin no juega**
  RF: RF-14 / E-13.
  Intento de crear quinteto como admin rechaza `no_admin`; rankings/tops excluyen Admin; vistas solo agregados.
  Verifica: `npm test -- src/app/admin/actions.test.ts -t "admin"` + `grep -r quinteto src/app/admin || true`
  Hecho cuando: grep no devuelve lecturas de quintetos/capitán ajenos y test guard rojo→verde.

## Fase 5 — Puerta de calidad

- [x] **T-21 Verde total + integración mocks Supabase/FNB**
  RF: todos (DoD tests).
  Borrar con dependencias recalcula, pre-relleno no escribe hasta confirmar, temporal limpia ambos alcances + revoca, URL ajena/duplicada rechazada, idempotencia doble-tap 1 efecto, papel excluida+rompe.
  Verifica: `npx tsc --noEmit && npm run lint && npm test && npm run build`
  Hecho cuando: `tsc` 0 errores cero `any`, `lint` 0 warnings, `test` verde, `build` verde en un solo pase.

- [x] **T-22 Verificación manual DoD spec §5**
  RF: RF-07, RF-08, RF-11 / E-05.
  Con FNB caída el manual completa J2; pegar URL J2 pre-rellena 11 valoraciones sin guardar hasta confirmar; J1 `55483` papel queda `0` excluido + rompe rachas sin manual; cambio de hora recalcula cierre sin invalidar válidas.
  Verifica: manual (marcar checklist con evidencias)
  Hecho cuando: los 4 escenarios DoD comprobados y anotados; `papel` sin vía manual posterior.
  Evidencias (mocks, 2026-10-22): `actions.test.ts` "fnb: con FNB caída el manual sigue posible" + "acta-guardar" cubre J2 manual con FNB caída; "fnb: pre-relleno con URL válida no escribe hasta confirmar" (`guardarActaLlamadas` sin cambios) cubre pre-relleno J2; `esPapel` + `guardarActa` rechaza `papel_sin_manual` cubre J1 `55483` excluida sin manual; "editar hora recalcula cierre y conserva válidas" + `conservarValidezTrasCambioHora` cubre cambio de hora.
