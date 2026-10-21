# Tasks — 03 Modelo de datos y semilla

Fuente: `spec.md` + `plan.md` (D-01–D-13). Orden TDD: test primero, luego código.

- [ ] **T-01 — Tests motor/dominio spec-02 en verde (prerrequisito)**
  Cubre: RF-06, RF-07, RF-10, RF-12, RF-14 (consumidos, no redefinidos).
  Hacer: ejecutar la suite spec-02 sin modificarla (`redondeo/calcular-jugador/calcular-jornada/mvp/expulsion/posiciones/validar-quinteto/cierre/rachas`). Si está en rojo, detener 03 y arreglar 02 primero.
  Hecho cuando: la suite spec-02 está 100% en verde y sirve como oráculo para vigencia/cierre/racha/papel de esta spec.
  Verifica: `npm test -- src/lib/scoring src/lib/dominio`

- [ ] **T-02 — Tests mapeo puro en rojo**
  Cubre: RF-01, RF-10, RF-17, RF-20 / E-09, E-10, E-11, E-12.
  Hacer: `src/lib/supabase/mapeo.test.ts` con `normalizarUsername(' Arnau ')->'arnau'`, `normalizarNombreFNB('IÑIGO ORTEGA')` sin tildes/lower, `esVigenteEn(fechaAlta/fechaBaja, cierre)` bordes `<=`/`>`, `truncarValoracion`, `resolverVinculoPorNombre` (1 coincidencia auto-vincula, 0/2+ a pendiente, dorsal nunca mapea), `["E","A"]` vale tal cual, `Pete/pete` duplicado.
  Hecho cuando: suite en rojo por `tipos.ts`/`mapeo.ts` inexistentes.
  Verifica: `npm test -- src/lib/supabase/mapeo.test.ts` en rojo.

- [ ] **T-03 — Implementar tipos + mapeo puro**
  Cubre: RF-01, RF-02, RF-03, RF-05, RF-07, RF-10, RF-20.
  Hacer: `src/lib/supabase/tipos.ts` (`JugadorRow, EntrenadorRow, JornadaRow, AlineacionRow, AlineacionSeleccionRow, ResultadoJugadorRow, UsuarioRow, SesionRow, InvitacionRow, RateLimitRow`, `readonly`, `Date`, cero `any`, `Posicion` re-exportada de scoring) + `src/lib/supabase/mapeo.ts` (las 5 puras de T-02, sin IO ni SQL).
  Hecho cuando: T-02 en verde + `npx tsc --noEmit` sin errores de tipos.
  Verifica: `npm test -- src/lib/supabase/mapeo.test.ts`, `npx tsc --noEmit`

- [ ] **T-04 — Tests Zod borde en rojo**
  Cubre: RF-07, RF-09, RF-10, RF-12 / E-08, E-09.
  Hacer: `src/lib/supabase/esquemas.test.ts` con `esquemaGuardarAlineacion` (5 distintos, capitán ∈ quinteto, instanteInicio requerido), `esquemaActaManual` (`lesionado/no_convocado/dnp + expulsado` rechaza, no-jugado exige valoración `0`, valoración no-entera rechaza), `esquemaJugadorSeed` (`0/1/3+` posiciones rechaza).
  Hecho cuando: en rojo por `esquemas.ts` inexistente.
  Verifica: `npm test -- src/lib/supabase/esquemas.test.ts` en rojo.

- [ ] **T-05 — Implementar esquemas Zod**
  Cubre: RF-07, RF-09, RF-10, RF-12.
  Hacer: `src/lib/supabase/esquemas.ts` reutilizando `esquemaPosicion` de spec-02; `superRefine` para duplicados/capitán y excluyentes lesión/expulsión. Único sitio con `unknown`. Sin lógica de scoring.
  Hecho cuando: T-04 en verde.
  Verifica: `npm test -- src/lib/supabase/esquemas.test.ts`

- [ ] **T-06 — Tests reglas derivadas (cierre/racha/papel/−10/lesionado) en rojo**
  Cubre: RF-06, RF-08, RF-11, RF-13, RF-14, RF-21 / E-02, E-03, E-05, E-06, E-18.
  Hacer: `src/lib/supabase/reglas.test.ts` con reloj inyectado: cierre `= hora−3h`, instante `== cierre` rechaza, cambio de hora no resucita/anula; lesionado previo con `0 min`/ausencia se respeta y con minutos pasa a `jugo`; papel tras `hora+24h` (`state=1`, `universallyid=null`) `0` excluida + rompe, en gracia sigue `pendiente` con manual; sin quinteto de activo (`onboarding_completado_at < cierre`) `−10` sin fila + rompe, alta tardía sin retroactivo; NULL posiciones bloquea salvo papel; sin contador de racha persistido.
  Hecho cuando: en rojo (helpers inexistentes o motor no conectado).
  Verifica: `npm test -- src/lib/supabase/reglas.test.ts` en rojo.

- [ ] **T-07 — Migración núcleo 0001 (tablas + RLS DENY)**
  Cubre: RF-01, RF-02, RF-03, RF-04, RF-05, RF-07, RF-09, RF-10, RF-12, RF-20.
  Hacer: `supabase/migrations/0001_nucleo_03.sql` con `usuario/sesion/invitacion_liga/rate_limit(PK alcance,sujeto)/jugador/entrenador/jornada/fnb_partidos_ignorados/alineacion(+UNIQUE manager,jornada)/alineacion_seleccion/resultado_jugador`, UNIQUE `username_normalizado` + `fnb_uuid` + `fnb_match_id`, CHECK `cardinality(posiciones)=2` si NOT NULL y `lesionado/dnp/no_convocado+expulsado` excluyentes, `timestamptz` para horas, `ENABLE ROW LEVEL SECURITY` en todas sin políticas `anon`, índices `jugador(fnb_uuid)`, `jornada(fnb_match_id,hora_partido)`. Prohibido `total/racha/mvp/cierre` como columna.
  Hecho cuando: el fichero contiene `ENABLE ROW LEVEL SECURITY` por tabla, cero columnas `total|racha|mvp|cierre` y `package.json` aún no necesita cambios de runtime.
  Verifica: `grep -c "ENABLE ROW LEVEL SECURITY" supabase/migrations/0001_nucleo_03.sql`, `grep -ri "total_jornada\|es_mvp\|racha\|cierre" supabase/migrations/ || echo OK-sin-totales`

- [ ] **T-08 — Cliente servidor + RLS/admin-no-juega**
  Cubre: RF-04 / E-17.
  Hacer: `src/lib/supabase/cliente.ts` (`crearClienteServidor()` con `service_role`, lanza sin env, jamás al cliente) + `src/lib/supabase/queries.ts` (solo firmas tipadas) + `src/lib/supabase/rls.test.ts` (mock: `anon` denegado, `service_role` tras sesión+rol, manager solo lee plantilla/jornadas y escribe su alineación, admin escribe todo pero alinear/rankear rechaza).
  Hecho cuando: T-08 tests en verde y `grep -r "service_role" src/app` vacío (secreto nunca al cliente).
  Verifica: `npm test -- src/lib/supabase/rls.test.ts`, `npx tsc --noEmit`

- [ ] **T-09 — Tests semilla en rojo**
  Cubre: RF-19 / E-01.
  Hacer: `src/lib/supabase/semilla.test.ts` con 12 uuid §3.4 `fnb-api-reference.md`, `fecha_alta='2026-09-01T00:00:00+02:00'`, 2 posiciones provisionales, `img` a placeholders, Maider/Páter con uuid, admin único sin managers ficticios, J1 `55483 papel` + J2 `55488 calculada` (11 valoraciones `1,6,12,7,2,0,8,1,-1,13,-1` + VITAL `no_convocado`), sin `eu.json` ni lógica FNB.
  Hecho cuando: en rojo por `semilla.ts`/migración 0002 inexistentes.
  Verifica: `npm test -- src/lib/supabase/semilla.test.ts` en rojo.

- [ ] **T-10 — Implementar semilla + i18n persistencia**
  Cubre: RF-01, RF-02, RF-19.
  Hacer: `src/lib/supabase/semilla.ts` (`datosSemilla()` puro, env `ADMIN_USERNAME/ADMIN_PASSWORD_HASH/CODIGO_INVITACION` con fallback dev) + `supabase/migrations/0002_semilla_03.sql` (12 jugadores + 2 entrenadores + J1/J2) + `es/strings.json` solo `errors.db.*` (`username_duplicado, fnb_uuid_duplicado, posiciones_invalidas, jugador_pendiente_bloquea, tercer_entrenador, admin_no_juega, jornada_papel_sin_manual, sin_hora`) + `errors.semilla.incompleta`, sin renombrar claves 01/02 ni crear `ui.*`.
  Hecho cuando: T-09 en verde y J2 100% calculable desde el seed (T-06 helpers lo confirman).
  Verifica: `npm test -- src/lib/supabase/semilla.test.ts`, `npx tsc --noEmit`

- [ ] **T-11 — Mapeo uuid/fallback + origen manual/bloqueo**
  Cubre: RF-05, RF-17, RF-18 / E-11, E-13, E-14, E-15, E-16.
  Hacer: tests + cableado en `mapeo.ts`/`queries.ts`: `uuid` primero, fallback nombre normalizado guarda `uuid` al vuelo, dorsal nunca mapea; `origen_resultado` a nivel jornada (`manual` salta auto, corrección `fnb` sí reimporta, Re-importar explícito recalcula); `fnb_partidos_ignorados` no se recrea; `last_calendar_sync/last_result_sync` throttle `24h/1h/+3h`; segunda fase aditiva con `numero_jornada` correlativo + `numero_jornada_fnb` aparte.
  Hecho cuando: nuevos casos en verde sin tocar `src/lib/fnb/*` (dueña spec-10).
  Verifica: `npm test -- src/lib/supabase/mapeo.test.ts src/lib/supabase/reglas.test.ts`

- [ ] **T-12 — Excepción papel + sin totales/MVP + puerta final**
  Cubre: RF-11, RF-15, RF-16 / E-04, E-07 + DoD spec §5.
  Hacer: actualizar `specs/02-motor-puntuacion-y-dominio/spec.md` RF-21/E-24 con excepción papel en el mismo cambio; verificar `grep` sin `total|mvp|flag_mvp` en migraciones ni `MVP` en `esquemaActaManual`; pasar puerta completa.
  Hecho cuando: `npx tsc --noEmit` 0 errores, cero `any`, `npm run lint` 0 warnings, `npm test` verde, `npm run build` verde; manual: FNB caída/J1 papel no bloquea (`0` + excluida + rompe), J2 importa por `uuid` sin duplicar.
  Verifica: `npx tsc --noEmit && npm run lint && npm test && npm run build`
