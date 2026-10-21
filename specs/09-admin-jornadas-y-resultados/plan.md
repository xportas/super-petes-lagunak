# Plan técnico spec-09 — Admin Jornadas y Resultados

Asume `spec-01` hecha (TS `strict`, Vitest, `es/strings.json` tipado, `src/lib/*`). Sin ella, bloqueado. No redefine motor/cierre/rachas (`spec-02`), ni DDL/seed (`spec-03`), ni throttle/parseo OWC (`spec-10`); solo los consume.

## 1. Modelos de datos (usa entidades `spec-03`)

Tablas afectadas, solo columnas de negocio relevantes:

* `jornada`: `id, numero_liga (auto correlativo editable), numero_fnb nullable, rival, local_visitante, campo nullable, municipio nullable, hora_partido timestamptz, estado pendiente|calculada|papel|invalidada, fnb_match_id nullable, fnb_universally_id nullable, marcador_local/visitante nullable, origen_resultado manual|fnb, last_calendar_sync, last_result_sync`. Sin columna `cierre`, sin totales. Cubre RF-01/02/03/11, E-01/02/04/05/06/12/14.
* `jugador`: `nombre, nombre_fnb, dorsal (repetible, nunca mapea), posiciones_validas [2] | NULL (solo Pendientes), nombrePete, img/imgPete (nombre en public/, valida existencia), descripcion, fnb_uuid unique nullable, estado_sanitario disponible|lesionado, activo bool, fecha_alta/fecha_baja`. Cubre RF-04/05/06, E-08/09/15.
* `resultado_acta (por jugador y jornada)`: PK `(jornada_id, jugador_id)`, `valoracion int (truncado en ingesta), estado jugo|lesionado|no_convocado|dnp, expulsado bool`. Sin MVP, sin flag FNB. Cubre RF-08/09/10, E-07/10.
* `fnb_partidos_ignorados`: PK `fnb_match_id, eliminado_at`. Solo para RF-02+E-03 (borrado no resucita por sync).
* `usuario/sesion/invitacion/rate_limit(alcance,sujeto)`: `username unique case-insensitive, password_hash, temporal_obligatoria bool, onboarding_*, sesiones revocables, codigo_invitacion vigente/rotable, rate_limit 1 fila por (alcance,sujeto) con intentos/primer_fallo_at/bloqueado_hasta`. Admin semilla oculto. Cubre RF-12/13/14, E-16.

Reglas transversales: RLS activado sin políticas `anon` (`DENY ALL`); todo acceso vía cliente servidor `service_role` tras verificar sesión `httpOnly` + `rol=admin` en backend. Cero totales/rachas/MVP persistidos (derivan al leer).

## 2. Decisiones justificadas

| ID | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D1 | `cierre` siempre derivado `hora_partido-3h Europe/Madrid`, nunca columna ni input | Persistir `cierre` o campo manual | Divergiría al cambiar hora; viola `spec-02 RF-16`, `spec-03 RF-06`, RF-03 |
| D2 | Validación pura en `src/lib/admin/*` + Server Actions finas que solo orquestan | Lógica en JSX / forms | Duplicaría motor, no testeable, viola Const.§5 |
| D3 | `origen_resultado` verificado en servidor (re-fetch acta o payload firmado en pre-relleno) | Flag `origen` enviado por cliente | Falsificable; rompería RF-10 (manual-bloquea-auto) |
| D4 | Plantilla vigente = `fecha_alta<=cierre AND (fecha_baja IS NULL OR >cierre)` UNION bajas con acta/alineación en esa jornada | Listar `activo=true` actual | Rompería histórico y bloquearía cálculo por dato ausente (RF-08) |
| D5 | Pre-relleno FNB dry-run, nunca `INSERT` hasta Confirmar | Guardado directo al sincronizar | Violaría RF-07+RF-10, riesgo de parcial (E-11) |
| D6 | Borrado físico jornada + insert en `ignorados` | Flag `desactivada` / soft-delete | Spec prohíbe estado desactivada; sin `ignorados` el sync recrea (RF-02) |
| D7 | `papel` terminal: `0` excluido+rompe, sin manual posterior, tras `ahora>=hora+24h` | Permitir manual en papel | Decisión usuario congelada Const.§11 / RF-11 / E-05 |
| D8 | Idempotencia servidor (`Idempotency-Key` + hash contenido) + botón disabled | Solo disabled cliente | Doble-tap móvil/reintento red duplica temporal/invitación (RF-15,E-16) |
| D9 | Zod en servidor en cada Action; cliente solo UX | Solo `required`/HTML | Seguridad + E-01/E-06 |
| D10 | `/admin?tab=` un solo `page.tsx` con 5 pestañas, `tap-to-select`, ≥44px, sin hover | 5 rutas `/admin/*` | RF-15 exige pestañas internas + móvil 360-430px |

## 3. Archivos exactos (respetando `AGENTS.md`)

Modificar:
* `es/strings.json` — añadir `ui.admin.*`, `errors.admin.*` (§6).
* `src/proxy.ts` — guarda `rol=admin` else redirect login; sliding cookie (RF-14).

Crear:
* `src/app/admin/page.tsx` — Server Component, lee `?tab=jornadas|jugadores|resultados|usuarios|invitacion`, Lazy Sync throttle antes de render (delega a `src/lib/fnb/`), render agregado solo (nunca quintetos ajenos).
* `src/app/admin/_components/tabs.tsx` (`'use client'`, tap-to-select), `jornada-form.tsx`, `jugador-form.tsx`, `acta-form.tsx` (con `0` forzado disabled), `pendientes-banner.tsx`, `usuarios-table.tsx`, `invitacion-panel.tsx`.
* `src/app/admin/actions.ts` — únicas mutaciones (ver §5).
* `src/lib/admin/validacion-jornada.ts`, `validacion-jugador.ts`, `plantilla-vigente.ts`, `validacion-acta.ts`, `origen-resultado.ts`, `papel.ts`, `idempotencia.ts` — puras, testeables.
* `src/lib/supabase/queries/jornadas.ts`, `jugadores.ts`, `actas.ts`, `usuarios.ts`, `ignorados.ts` — queries servidor con `service_role` (si `spec-03` ya los creó, reutilizar, no duplicar).
* `src/lib/fnb/pre-relleno.ts` — ya dueña `spec-10`; aquí solo consumir (resolver `?id=/?uuid=`, verificar `11659`, truncar a entero).
* Tests junto a módulo: `src/lib/admin/*.test.ts`, `src/app/admin/actions.test.ts` (con mocks).

No crear: `src/lib/scoring/*` (prohibido tocar motor), fotos fuera de `public/`, columnas de totales/MVP.

## 4. Tipos dominio TS `strict` + Zod

```ts
// src/lib/admin/tipos.ts
type Posicion = 'B'|'E'|'A'|'AP'|'P';
type EstadoJornada = 'pendiente'|'calculada'|'papel'|'invalidada';
type OrigenResultado = 'manual'|'fnb';
type EstadoActa = 'jugo'|'lesionado'|'no_convocado'|'dnp';
type TabAdmin = 'jornadas'|'jugadores'|'resultados'|'usuarios'|'invitacion';
type JornadaInput = { rival: string; horaPartido: string; localVisitante: 'local'|'visitante'; numeroLiga?: number; campo?: string; municipio?: string; marcadorLocal?: number; marcadorVisitante?: number };
type JugadorInput = { nombre: string; posicionesValidas: [Posicion,Posicion]; dorsal?: string; img?: string; imgPete?: string; nombrePete?: string; descripcion?: string; fnbUuid?: string; estadoSanitario: 'disponible'|'lesionado' };
type ActaFilaInput = { jugadorId: string; valoracion: number; estado: EstadoActa; expulsado: boolean };
```

Zod (servidor, en `actions.ts` o `src/lib/admin/esquemas.ts`):
* `jornadaSchema`: `rival min(1)`, `horaPartido` ISO parseable `Europe/Madrid`, `localVisitante` enum, `numeroLiga` int positivo opcional, rechaza cierre manual (no existe campo). Cubre RF-01/E-01.
* `jugadorSchema`: `nombre min(1)`, `posicionesValidas` tuple 2 enums `B|E|A|AP|P` (permite `["E","A"]`), `dorsal` string opcional, `img/imgPete` string opcional (existencia se valida contra `public/` en servidor, fallback placeholder sin bloquear), `fnbUuid` uuid opcional. Cubre RF-05.
* `actaSchema`: array por plantilla vigente; `valoracion` int (`.int()`, negativos ok), `expulsado` bool solo si `estado==='jugo'` (`refine` excluyente), si `estado!=='jugo'` exige `valoracion===0` (`0` forzado). Sin campo `mvp`. Cubre RF-08/09 E-10.
* `urlFnbSchema`: `pagina-partido/?id={int}` o `?uuid={uuid}`, else rechazo E-11.

Cero `any`: `unknown` + narrowing al parsear OWC.

## 5. Contratos

Puras (`src/lib/admin/*`, sin IO):
* `calcularCierre(horaPartido: Date): Date` — `hora-3h Europe/Madrid`. RF-03.
* `plantillaVigente(jugadores: Jugador[], cierre: Date, alineacionesJornada: {jugadorId}[], actaJugadores: {jugadorId, jugo: boolean}[]): Jugador[]` — RF-08.
* `validarActaCompleta(filas: ActaFilaInput[], vigentesIds: string[]): {ok:true}|{ok:false,error:ClaveI18n}` — sin parcial, bloquea si falta alguno. RF-08/11.
* `determinarOrigen(valoresEnviados: ActaFilaInput[], actaOficial: ActaFilaInput[]|null): OrigenResultado` — igual → `fnb`, distinto/manual → `manual`. RF-10.
* `esPapel(state: string, universallyId: string|null, horaPartido: Date, ahora: Date): boolean` — `state==="1" && null && ahora>=hora+24h`. E-05.
* `hashContenido(v: unknown): string` — idempotencia RF-15.

Server Actions (`src/app/admin/actions.ts`, todas verifican `rol=admin` primero, validan Zod, usan `service_role`, `revalidatePath('/admin')`, devuelven `{ok}|{error:ClaveI18n}` sin literales):
* `crearJornada(input, idempotencyKey)` / `actualizarJornada(id,input)` / `eliminarJornada(id)` → + insert `ignorados` si tenía `fnb_match_id` + recalcular afectado. RF-01/02.
* `sincronizarCalendario()` / `preRellenarActa(urlOId)` → dry-run, nunca guarda. RF-07.
* `guardarActa(jornadaId, filas, actaOficialRef)` → verifica origen servidor, set `origen_resultado`, marca `calculada|pendiente|invalidada`. RF-08/10/11.
* `reimportarDesdeFnb(jornadaId)` (con confirmación cliente) → fuerza `fnb` + recalcula. RF-10.
* `recalcularJornada(jornadaId)` → solo revalida y marca, no persiste totales. RF-11.
* `upsertJugador(input)` / `darBajaJugador(id)` (rechaza si `<5` activos elegibles) / `asignarPosicionesPendiente(id,[p1,p2])`. RF-04/05/06.
* `generarTemporal(userId)` → aleatoria, revoca sesiones, limpia `rate_limit(login, username)+(cambiar_password, id)`. RF-12.
* `rotarInvitacion()` → autogenera, muestra una vez. RF-13.

Supabase: lecturas cacheadas Server Components; escrituras solo Actions arriba; `papel` nunca acepta `guardarActa`.

## 6. Claves i18n nuevas (`es/strings.json`)

* `ui.admin.tabs.{jornadas,jugadores,resultados,usuarios,invitacion}`
* `ui.admin.jornadas.{nueva,editar,eliminar,rival,hora,local_visitante,numero_auto,guardar,reimportar,recalcular,sincronizar_calendario,sincronizar_acta,pegar_url}`
* `ui.admin.jugadores.{nuevo,baja,activar,pendientes,posicion_pendiente,sin_descripcion}`
* `ui.admin.resultados.{manual,prerelleno_revisar,origen_fnb,origen_manual,papel_aviso,confirmar}`
* `ui.admin.usuarios.{temporal_copiar,revocado,invitacion_rotar,mostrar_una_vez}`
* `errors.admin.{sin_rival_hora,menos_de_5,excluyente_lesion_expulsion,cero_forzado,incompleta_bloquea,url_invalida,no_lagunak,duplicada,fnb_caida,papel_sin_manual,no_admin,idempotente_reintento}`

Sin literales en JSX; números vía `{var}` desde constantes motor donde aplique.

## 7. Estrategia Vitest

Unitarias puras (100% en `src/lib/admin/*`):
* jornada: crear sin rival/hora → rechazo; nº auto correlativo; cambio hora recalcula cierre sin resucitar tardías.
* jugador: `<5` activos rechaza; `["E","A"]` vale; `lesionado+expulsado` rechaza; `0` forzado no-jugado; sin MVP en esquema.
* acta: falta 1 fila → `pendiente`/`invalidada`, nunca parcial; pendiente con hueco vs calculada que se invalida (nunca vuelve a `pendiente`).
* origen: idéntico a acta → `fnb`; 1 campo distinto → `manual`; `Re-importar` → `fnb`.
* papel: `hora+24h` con `state=1/null` → papel excluida+rompe, manual rechazado; dentro gracia → pendiente con manual ok.
* FNB: URL ajena/duplicada/caída → error sin guardar; truncado no-entero; `lesionado` previo respetado salvo minutos.
* guard admin + idempotencia doble-tap mismo hash → 1 efecto.

Integración (mocks Supabase/FNB): borrar con dependencias recalcula; pre-relleno no escribe hasta confirmar; temporal limpia rate-limit ambos alcances + revoca.

Puerta: `npx tsc --noEmit` 0, `lint` 0, `test` verde, `build` verde; verificación manual DoD spec (J2 manual con FNB caída, URL J2 pre-rellena 11 sin guardar, J1 papel `0`+rompe).

## 8. Trazabilidad RF → plan

RF-01→`jornadaSchema`+`crearJornada`; RF-02→`eliminarJornada`+`ignorados`; RF-03→`calcularCierre`; RF-04→`darBajaJugador`+`<5`; RF-05→`jugadorSchema`+sanitario; RF-06→`Pendientes`+bloqueo cálculo; RF-07→2 botones dry-run; RF-08→`plantillaVigente`+`actaSchema` 0 forzado; RF-09→sin campo MVP; RF-10→`determinarOrigen`+`reimportar`; RF-11→`recalcularJornada`+`validarActaCompleta`; RF-12→`generarTemporal`; RF-13→`rotarInvitacion`; RF-14→`proxy.ts`+agregado; RF-15→`?tab=`+idempotencia+i18n.
