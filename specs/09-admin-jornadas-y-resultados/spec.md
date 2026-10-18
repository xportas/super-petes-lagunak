# 09 — Admin Jornadas y Resultados (§8)

## 1. Objetivo y contexto

**Objetivo:** fijar el QUÉ del panel Admin que crea jornadas/partidos, mantiene plantilla viva, carga resultados por triple vía (calendario FNB + acta FNB + manual) y gestiona accesos e invitación, sin jugar ni rankear, garantizando que la liga nunca se bloquee salvo excepción papel decidida por el usuario.

**Contexto:**
- `README.md §8` pide partidos/jornadas con cierre auto `-3h`, CRUD jugadores, triple vía resultados, usuarios + reset y recalcular jornada.
- `CONSTITUTION.md §2/§3/§4/§7/§11` y `AGENTS.md` exigen: Postgres solo relacional con fotos en `public/`, sin Realtime/cron/demonios, auth propia sin email, cierre estricto en servidor `Europe/Madrid`, motor puro sin duplicar lógica, Admin semilla excluido del ranking, manual garantizado.
- `spec-02` gobierna cálculo, validación, rachas, cierre, dato ausente y recálculo como regla. `spec-03` gobierna entidades, baja lógica, `-10`, papel, `origen_resultado` y RLS. `spec-10` gobierna sync OWC, throttle, mapeo por `fnb_uuid` y pre-relleno revisable. Esta spec solo consume esas reglas, sin redefinirlas.
- **Por qué todo editable + borrado siempre:** la FNB cambia horas y publica actas tarde; bloquear edición tras cierre dejaría errores eternos. Borrar recalcula todo lo afectado.
- **Por qué cierre nunca manual:** una sola fórmula evita discusiones de jornada.
- **Por qué manual bloquea auto:** evita que el Lazy Sync de `spec-10` pise en segundo plano una corrección del Admin.
- **Por qué sin campo MVP:** el `+3` es salida del motor sobre máxima BASE habiendo jugado; un campo manual duplicaría la verdad.
- **Excepción papel decidida por el usuario (ya recogida en fuentes):** J1 `55483` (`state=1`, `universallyid=null`) queda en `0` excluido de todo + rompe rachas, sin carga manual posterior. Recogido en `CONSTITUTION.md §11`, `README.md §8`, `spec-03 RF-11` y `spec-10 RF-09`.

**Decisiones cerradas con el usuario que esta spec congela:** todo editable + borrado siempre con recálculo; alta mínima rival+hora+local/visitante con nº auto; cierre siempre derivado; baja lógica con histórico intacto y bloqueo `<5` activos; valoración entera + estado excluyente con `0` forzado; sin campo MVP; manual bloquea auto salvo Re-importar (auto sí actualiza corrección `fnb`); recalcular solo revalida y marca; usuarios solo listar + temporal autogenerada (Admin oculto, limpia rate-limit); código invitación rotable autogenerado incluido; Admin bloqueo total y ve solo agregado; papel tras gracia 1 día con cero definitivo sin manual; 5 faltas es expulsión; error sin parcial; `/admin` con pestañas; idempotencia + botón disabled.

## 2. Requisitos funcionales (EARS)

### Jornadas / Partidos
- **RF-01 — Crear jornada mínima con nº auto:**
  Cuando el Admin cree una jornada, el sistema deberá exigir rival, `hora_partido` en `Europe/Madrid` y condición local/visitante, y generar nº `Jx` auto correlativo editable. Campo/municipio son opcionales. Si falta rival, hora u local/visitante, entonces deberá rechazar sin guardar.
- **RF-02 — Todo editable + borrado siempre con recálculo:**
  Cuando el Admin edite rival, lugar, fecha/hora, nº o marcador de cualquier jornada (futura, cerrada o calculada), o la elimine aunque tenga alineaciones o resultados, el sistema deberá guardar/eliminar y recalcular todo lo afectado con reglas vigentes. Si cambia la hora, entonces el cierre se recalcula sin resucitar envíos tardíos ni anular válidos. No existe estado "desactivada".
- **RF-03 — Cierre siempre derivado:**
  Cuando se necesite el cierre, el sistema deberá derivarlo siempre como `hora_partido − 3h` en `Europe/Madrid`. El panel nunca deberá ofrecer campo de cierre manual.

### Jugadores (plantilla viva)
- **RF-04 — Baja lógica con mínimo 5 activos:**
  Cuando el Admin dé de alta, edite o dé de baja un jugador, el sistema deberá usar flag activo/inactivo con fechas, nunca borrado físico. El histórico de actas y alineaciones pasadas deberá quedar intacto. Si la operación dejaría menos de 5 activos, entonces deberá rechazarla. Si da de baja a un jugador ya alineado en jornada abierta, entonces las alineaciones guardadas seguirán válidas y se mostrarán con marca de baja.
- **RF-05 — Validación de jugador + estado sanitario previo:**
  Cuando guarde un jugador, el sistema deberá exigir nombre, exactamente 2 posiciones tal cual (`B|E|A|AP|P`, `["E","A"]` vale), dorsal informativo repetible, `img/imgPete` como nombre de archivo en `public/` (valida existencia, si falta usa placeholder sin bloquear), descripción faltosa opcional (`Sin descripción`) y `fnb_uuid` opcional. Cuando marque estado sanitario actual (`disponible/lesionado`) en la ficha, el sistema deberá exponerlo a Equipo/Home y el sync dovrà respetarlo como `lesionado` previo.
- **RF-06 — Bandeja de pendientes que bloquea cálculo:**
  Cuando el sync vincule un jugador nuevo sin 2 posiciones/fotos, el sistema deberá dejarlo en bandeja `Pendientes` del panel. Si una jornada tiene en acta a un jugador pendiente sin 2 posiciones, entonces deberá quedar como pendiente no calculada hasta completarlas.

### Resultados triple vía
- **RF-07 — Dos botones FNB separados, pre-relleno sin auto-guardado:**
  Cuando el Admin pulse `Sincronizar calendario FNB`, el sistema deberá crear/actualizar jornadas futuras desde `idTeam 11659` sin tocar resultados. Cuando pegue `URL pagina-partido/?id={idMatch}` o pulse `Sincronizar acta`, el sistema deberá descargar ese partido y solo pre-rellenar el formulario para revisión, nunca guardar directo. Si la URL es inválida, no es de `LAGUNAK A 11659`, el `fnb_match_id` ya pertenece a otra jornada, o la FNB no responde, entonces deberá mostrar error sin guardar nada parcial.
- **RF-08 — Formulario manual por plantilla vigente con 0 forzado:**
  Cuando el Admin complete a mano, el sistema deberá listar la plantilla vigente en la fecha de esa jornada (activos entonces + bajas que jugaron entonces; altas posteriores no aparecen) y permitir por cada uno valoración entera (negativos permitidos) + estado `jugo|lesionado|no_convocado|dnp` + flag `expulsado` solo si `jugo`. Al elegir no-jugado, la valoración se fijará a `0` bloqueada. Si marca `lesionado|no_convocado|dnp` + `expulsado`, entonces deberá rechazar por excluyentes. Si falta valoración/estado de alguno vigente, entonces deberá rechazar el guardado sin borrador parcial. El manual está garantizado siempre salvo jornada ya marcada `papel` definitiva (excepción §1).
- **RF-09 — Sin campo MVP:**
  El formulario manual no deberá tener campo MVP ni persistir flag FNB. Cuando se cierre la jornada, el `+3` lo calculará exclusivamente el motor §0 sobre máxima BASE habiendo jugado.
- **RF-10 — Manual bloquea auto salvo Re-importar explícito:**
  Cuando el Admin guarde a mano, el sistema deberá marcar `origen_resultado='manual'` a nivel jornada y el auto-sync deberá saltarla. Si la FNB corrige un acta de jornada ya calculada con `origen_resultado='fnb'`, entonces el auto-sync sí deberá reimportarla y recalcular. Cuando pulse explícito `Re-importar desde FNB` (acción separada de RF-07, con confirmación), entonces sí deberá reimportar y recalcular todo lo afectado aunque hubiera edición manual.

### Recalcular
- **RF-11 — Recalcular solo revalida y marca:**
  Cuando el Admin pulse `Recalcular jornada`, el sistema deberá revalidar el acta cruda y marcar la jornada como `calculada` o `pendiente`, sin persistir totales, puestos ni rachas (todo se deriva al leer desde motor/dominio). Si falta valoración/estado en jornada normal o falta hora, entonces bloqueará con error sin total ni parcial, nunca `0` provisional. Si una jornada ya `calculada` queda incompleta tras corrección, entonces pasará a `pendiente` con aviso (visible en `spec-08`).

### Usuarios + invitación
- **RF-12 — Listar + temporal autogenerada:**
  Cuando el Admin liste usuarios, el sistema deberá mostrar `username`, estado (`temporal activa / onboarding pendiente / bloqueado rate-limit`) y fecha, ocultando al Admin semilla (cambia su clave en Ajustes por `spec-04`). Cuando genere reset, el sistema deberá autogenerar clave temporal aleatoria, mostrarla una vez para copiar por canal privado, revocar inmediatamente todas las sesiones del manager y limpiar su bloqueo de rate-limit. La temporal obliga a cambio por distinta en Ajustes y vale hasta completar el cambio. El panel no deberá permitir borrar ni desactivar managers.
- **RF-13 — Código de invitación rotable autogenerado:**
  Cuando el Admin rote la invitación, el sistema deberá autogenerar el nuevo código, mostrarlo una vez para copiar y exigirlo solo a registros nuevos, sin afectar cuentas ya creadas. El código vigente deberá ser consultable desde el panel.

### Guardias y transversales
- **RF-14 — Solo rol admin, sin juego, solo agregado:**
  Cuando se solicite cualquier acción de esta spec, el sistema deberá verificar rol `admin` en servidor. Si no es admin o no hay sesión, entonces denegará o redirigirá a login. El Admin nunca podrá crear quinteto ni aparecer en rankings/tops, y solo verá agregados, nunca quintetos/capitán/entrenador ajenos.
- **RF-15 — Panel móvil con pestañas, idempotente e i18n:**
  Cuando se renderice `/admin` (pestañas Jornadas/Jugadores/Resultados/Usuarios/Invitación, con enlaces de lectura a `/clasificacion`, `/jugadores`, `/normas` y cambio de clave propia en Ajustes), el sistema deberá cumplir móvil 360–430px, tap-to-select, táctiles ≥44×44px, cero hover, tema claro/oscuro y Modo Pete cosmético (`Maider/Páter` invariantes). Todo texto desde `es/strings.json` sin literales. Al primer tap, el botón se desactivará y el servidor aplicará idempotencia (mismo contenido no duplica; temporal/invitación no se regenera en reintento).

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | Crear sin rival/hora/local-visitante | Rechazo sin guardar | Sin hora no hay cierre (spec-02 E-19) |
| E-02 | Cambiar hora tras cierre | Recalcula cierre, conserva válidas, no resucita tardías | Cierre deriva de hora vigente |
| E-03 | Eliminar con dependencias | Permite borrar y recalcula todo lo afectado | Decisión usuario todo-editable |
| E-04 | Partido futuro `state=0` | Solo calendario + cierre, no pide acta ni calcula | Aún no hay nada que importar |
| E-05 | Partido sin acta tras gracia 1 día (J1 `55483`) | Guarda marcador, marca `papel`: `0` activos entonces, excluida de acumulado/media/evolución/tops, rompe rachas, sin carga manual posterior; dentro de la gracia sigue pendiente con manual permitido | Excepción usuario causa externa con gracia ante actas tardías |
| E-06 | Jornada normal sin acta o incompleta | Error bloqueante + `pendiente`, oculta de Historial/General hasta completar | Prohibido `0` provisional |
| E-07 | Valoración no entera FNB | Trunca a entero | spec-10 RF-06 |
| E-08 | `lesionado` previo ante sync | Se respeta con cero minutos o ausencia; si el acta trae minutos pasa a `jugo` | Acta con minutos demuestra que jugó |
| E-09 | Jugador nuevo sin `fnb_uuid` / sin posiciones | Vincula solo por nombre normalizado, guarda `uuid`, queda en Pendientes y bloquea cálculo hasta completar 2 posiciones; con cero o 2+ coincidencias no auto-vincula | Sin 2 posiciones no hay `+5` válido |
| E-10 | 5 faltas personales | Es expulsión (`−5`) con BASE intacta, según spec-02 RF-11 | Decisión usuario con actualización conjunta |
| E-11 | URL inválida / no Lagunak / id duplicado / FNB caída | Error visible + reintento, sin parcial guardado; manual sigue operativo salvo papel | Liga no se bloquea |
| E-12 | Recalcular con hueco | Bloquea, no toca previos; si invalida calculada pasa a pendiente con aviso | Sin dato no hay cálculo |
| E-13 | Admin intenta alinear | Rechazo no-juega | Admin semilla no juega |
| E-14 | Segunda fase / cambio grupo | Jornadas nuevas sin borrar histórico, con numeración de liga correlativa y número FNB aparte | Temporada multi-competición |
| E-15 | Dejar `<5` activos / baja con quintetos guardados | Rechaza `<5`; baja mantiene alineaciones válidas con marca | Sin 5 no hay juego |
| E-16 | Temporal sobre rate-limit / doble tap | Asignar temporal limpia bloqueo; botón disabled + idempotencia evita duplicados | Móvil genera reintentos |

## 4. Fuera de alcance explícito

- DDL, tipos SQL, migraciones, clientes Supabase, `service_role` como secreto y Server Actions/SSR como mecanismo (solo se exige QUÉ + RLS activado).
- Pantallas manager (Home, Equipo, Ficha, Mi Resultado, Clasificación, Ajustes, `/normas`): dueñas specs 04–08.
- Motor §0, rachas como cálculo y cierre como validación (spec-02); throttle/parseo OWC (spec-10); fundación TS/Vitest/i18n (specs-00/01).
- Desactivar/borrar managers, cambiar roles, multi-admin, borrado de cuenta por usuario.
- Notificaciones, email, auto-reset, chat, escritorio, app nativa, Realtime, cron, polling agresivo, Puppeteer/Playwright.
- Mapa de tiros, play-by-play, fotos traídas de FNB (viven en `public/`), comparadores, exportar.
- Textos literales fuera de `es/strings.json`.

## 5. Criterios de finalización (Definition of Done)

- [ ] Existe spec congelada con RF-01–RF-15 y E-01–E-16, coherente con decisiones de sesión.
- [ ] `CONSTITUTION §11` y `README §8` recogen la excepción papel (cero definitivo sin manual); `spec-03 RF-11` y `spec-10 RF-09` coherentes.
- [ ] Panel exige rol admin en servidor; Admin no alinea ni rankea; ve solo agregado.
- [ ] Jornada mínima rival+hora+local/visitante con nº auto; cierre siempre `hora−3h`; borrado siempre con recálculo; sin estado desactivada.
- [ ] Jugadores con baja lógica, bloqueo `<5`, 2 posiciones, dorsal repetible, archivo `public/` validado, estado sanitario previo y bandeja Pendientes que bloquea cálculo.
- [ ] Dos botones FNB (calendario vs acta pre-relleno); manual por plantilla vigente con `0` forzado; sin campo MVP; manual bloquea auto salvo Re-importar con confirmación.
- [ ] Recalcular solo revalida y marca, bloquea si incompleto, invalida a pendiente con aviso.
- [ ] Usuarios con temporal autogenerada + revocación + limpieza rate-limit, Admin oculto; invitación autogenerada rotable.
- [ ] Tests Vitest en verde: crear/editar/borrar con dependencias, cierre derivado, baja lógica y `<5`, excluyentes lesión/expulsión, `0` forzado, sin MVP manual, manual-bloquea-auto, pre-relleno sin guardar, recalcular bloqueante, papel excluida, URL ajena/duplicada rechazada, guard admin, idempotencia doble tap.
- [ ] `npx tsc --noEmit` 0 errores y cero `any`; `npm run lint` 0 warnings; `npm test` verde; `npm run build` verde.
- [ ] Verificación manual: con FNB caída el manual completa J2; pegar URL J2 pre-rellena 11 valoraciones sin guardar hasta confirmar; J1 papel queda `0` excluida + rompe sin manual; cambio hora recalcula cierre sin invalidar válidas.
