# 04 — Auth y onboarding (§1)

## 1. Objetivo y contexto

**Objetivo:** fijar el QUÉ de identidad y primera entrada a la liga privada (colegas Lagunak Senior Masculino A) sin email ni proveedores externos, para que solo managers invitados jueguen y el primer quinteto nazca válido.

**Contexto:**

- `README.md §1` es la fuente funcional: liga cerrada con invitación, login `username + password`, reset manual informativo y onboarding de 2 pasos reanudable.
- `CONSTITUTION.md §4/§11` y `AGENTS.md` exigen: auth propia sin Supabase Auth ni email, `username` case-insensitive + hash + sesión httpOnly + rate-limit, RLS activado, `service_role` jamás en cliente, y fuera de alcance notificaciones y auto-reset.
- **Corrección que esta spec congela:** se elimina el paso "Elige tu nombre pete". `nombre`/`nombrePete` e `img`/`imgPete` pertenecen a `Jugador` (§0), no al manager. El manager solo tiene `username`.
- **Por qué invitación única de liga:** sin código, el registro abierto permitiría intrusos en liga privada y rankings falsos. Hay un único código de liga activo en BD, rotable por el Admin desde su panel, que se reparte por canal privado y no afecta a cuentas ya creadas al rotarse.
- **Por qué onboarding con Paso 2 ineludible:** si no hay próxima jornada abierta o el cierre ya pasó al registrarse, bloquear el alta dejaría usuarios fuera por causa del calendario. Se informa del cierre (Paso 2) siempre y el quinteto se pospone a Equipo, sin penalización `−10` injusta.
- **Persistencia exigida:** invitación vigente, sesiones revocables, flag de clave temporal, progreso de onboarding y registro de intentos/bloqueos viven en PostgreSQL (dueño `spec-03`), sin memoria volátil en serverless ni demonios, cumpliendo `CONSTITUTION.md §1/§3`.
- Esta spec define comportamiento y errores. Columnas y RLS son dueños de spec-03; cierre como validación es dueño de spec-02; `/normas#cierre` es dueño de spec-05; throttle FNB es dueño de spec-10.

## 2. Requisitos funcionales (EARS)

- **RF-01 — Registro cerrado con invitación única y precedencia anti-enumeración:**
  Cuando un visitante intente crear cuenta, el sistema deberá exigir `username + password + código de invitación de liga vigente`. El código es único y activo en BD, rotable por el Admin, y se valida con `trim` y comparación case-insensitive. El sistema deberá validar el código **antes** de comprobar si el `username` existe. Si el código falta o es inválido, entonces el sistema deberá rechazar el registro sin crear usuario ni sesión y sin revelar si el `username` existe.

- **RF-02 — Username único case-insensitive:**
  Cuando el sistema valide un `username`, deberá aplicar `trim` y unicidad case-insensitive preservando el display original. Si ya existe en cualquier capitalización o no cumple `3-20 [A-Za-z0-9_-]`, entonces deberá rechazar con error específico de formato o duplicado.

- **RF-03 — Password 8–72 sin eco:**
  Cuando el sistema valide una `password`, deberá exigir longitud entre 8 y 72 caracteres sin `trim` automático (los espacios cuentan donde estén), pero exigiendo al menos 1 carácter no-espacio (`trim(password).length >= 1`). Si no cumple, entonces deberá rechazar sin crear usuario ni sesión. El sistema nunca deberá devolver ni mostrar la password en claro.

- **RF-04 — Login anti-enumeración:**
  Cuando un usuario intente login, el sistema deberá normalizar `username` igual que en RF-02. Si fallan credenciales, entonces deberá responder con error genérico idéntico sin distinguir "usuario no existe" frente a "clave mal".

- **RF-05 — Rate-limit persistido en BD por alcance (ventana fija 15m por fila):**
  Cuando se acumulen 5 intentos fallidos dentro de una ventana fija de 15 min desde `primer_fallo_at`, el sistema deberá bloquear nuevos intentos durante 15 min (`bloqueado_hasta = ahora + 15 min`) con estado persistido en BD en una única fila por `(alcance, sujeto)`. Si llega un fallo cuando ya transcurrieron `> 15 min` desde `primer_fallo_at` sin haberse bloqueado (o tras expirar `bloqueado_hasta`), el contador se reiniciará a `intentos = 1` con nuevo `primer_fallo_at = ahora`. Un acierto antes del 5.º fallo deberá reiniciar/eliminar el contador. Los alcances son separados: (1) `login` agrupado por `username` normalizado; (2) `cambiar_password` agrupado por `usuario_id` autenticado al fallar la contraseña actual; (3) `registro` agrupado por IP únicamente cuando falla el código de invitación (extrayendo la IP en servidor del primer valor de `x-forwarded-for`, con fallback a `x-real-ip` y `'127.0.0.1'` en entorno local/test). Si el bloqueo está activo, entonces deberá rechazar incluso credenciales correctas hasta que expire (o hasta que el Admin limpie los alcances `login` y `cambiar_password` del usuario al asignarle clave temporal).

- **RF-06 — Sesión de 30 días renovable y guardas de rutas (vía `src/proxy.ts` en Next.js 16.4):**
  Cuando el login tenga éxito, el sistema deberá crear sesión persistente httpOnly de 30 días exactos renovables por actividad (*sliding expiration*, renovando en BD y cookie cuando la sesión activa supere 1h desde su última renovación; en Next.js 16.4 la actualización de la cookie en peticiones de lectura se ejecuta en `src/proxy.ts` —`export function proxy`, ya que `middleware.ts` está deprecado y los Server Components no pueden invocar `cookies().set()`— o en Server Actions), válida en varios dispositivos a la vez. Si el usuario cierra sesión, entonces el sistema deberá revocar solo esa sesión; si cambia la password, entonces deberá revocar todas las demás. Sin sesión, cualquier ruta privada deberá redirigir a `/login`, salvo `/login`, `/registro` y `/normas` (pública de lectura). Con sesión, al abrir `/login`, `/registro` o cualquier ruta privada, el servidor deberá evaluar en este orden: (1) si tiene clave temporal activa (RF-09) redirige a `/cambiar-password`; (2) si es `manager` con onboarding incompleto (RF-11) redirige a `/onboarding` en el paso pendiente; (3) en caso contrario permite la ruta o redirige `/login`, `/registro` y `/home` a `/` (`manager`) o `/admin` (`admin`).

- **RF-07 — Admin semilla exento y sin juego:**
  El sistema deberá proveer un usuario admin semilla con onboarding exento/completado que no puede crear quintetos ni aparecer en rankings ni top 3. Cuando el admin intente alinear, entonces el sistema deberá denegarlo. El Admin sí puede cambiar su propia contraseña en Ajustes (RF-10); si olvida su contraseña, entonces se restablece mediante semilla/script de BD, nunca por auto-reset.

- **RF-08 — Reset solo informativo con revocación inmediata:**
  Cuando el usuario pulse `Pedir reset al admin`, el sistema deberá mostrar solo mensaje informativo (que indique contactar al admin por fuera con su username) sin crear ticket, fila ni notificación en BD. Cuando el Admin asigne una clave temporal desde Usuarios (spec-09), entonces el sistema deberá revocar inmediatamente todas las sesiones activas de ese usuario.

- **RF-09 — Clave temporal blindada hasta completar el cambio en `/cambiar-password`:**
  Cuando un usuario autentique con clave temporal, la temporal deberá seguir siendo válida para reintentar login si se corta la conexión, y solo se invalidará cuando el usuario guarde con éxito su nueva contraseña o el Admin genere otra. Mientras la sesión provenga de clave temporal, el sistema deberá redirigir y confinar al usuario en `/cambiar-password`, bloqueando toda la app salvo guardar la nueva contraseña o cerrar sesión (permitiendo además abrir `/normas` pública); bloquea `/`, `/equipo`, `/mi-resultado`, `/clasificacion`, `/jugadores`, `/ajustes` y `/admin`. La nueva contraseña deberá ser distinta de la temporal. Al guardar la nueva contraseña, si el usuario aún tenía el onboarding pendiente, entonces deberá pasar inmediatamente a `/onboarding` en el paso pendiente (o a `/` si ya lo había completado).

- **RF-10 — Cambiar password distinta y con rate-limit:**
  Cuando un usuario con sesión válida cambie su password (desde `/ajustes` o desde `/cambiar-password`), el sistema deberá exigir la actual salvo que su sesión venga de temporal (RF-09). La nueva contraseña deberá cumplir RF-03 y ser distinta de la actual (o de la temporal en RF-09). Si la actual es incorrecta o la nueva incumple, entonces deberá rechazar sin revocar la sesión actual. Los fallos al introducir la contraseña actual deberán contabilizar en el rate-limit de RF-05.

- **RF-11 — Onboarding 2 pasos en `/onboarding` solo primera vez con Paso 2 ineludible:**
  Cuando un manager nuevo complete registro/login por primera vez, el sistema deberá mostrar en `/onboarding` los 2 pasos en orden: (1) crear primer quinteto + entrenador + capitán, (2) entender el cierre con enlace a `/normas#cierre`. El onboarding solo se marcará como completado cuando el usuario confirme el Paso 2, tras lo cual pasará a `/` (Home). Cuando ya lo haya completado, entonces nunca deberá volver a mostrarlo y cualquier acceso a `/onboarding` redirigirá a `/`.

- **RF-12 — Quinteto posponible y reanudable sin saltar el cierre:**
  Si no hay próxima jornada con cierre futuro abierto, o el cierre expira mientras el usuario está en el Paso 1, entonces el Paso 1 deberá mostrar estado informativo (*sin jornada abierta / cierre pasado, podrás alinear en Equipo*) con botón para continuar al Paso 2. Si el usuario abandona a mitad, entonces al volver deberá retomar el paso pendiente; si ya guardó el quinteto y recarga antes de terminar el Paso 2, entonces deberá retomar en el Paso 2 pudiendo volver al Paso 1 con su quinteto precargado mientras no pase el cierre. Si el usuario completa el onboarding cuando el cierre de la jornada en curso ya había pasado (por alta posterior al cierre o cierre expirado durante su Paso 1), entonces esa jornada no le computará `−10` ni `0`.

- **RF-13 — Quinteto onboarding con alineación completa (reutilizando `spec-06`):**
  Cuando el usuario cree su quinteto en el Paso 1 de onboarding habiendo jornada abierta (primera jornada cronológica `hora_partido ASC, numero_jornada ASC` en estado `pendiente` con `ahora < cierre`), el sistema deberá reutilizar el componente selector de `spec-06`, exigiendo solo jugadores elegibles (`activo = true` y con sus 2 `posicionesValidas` asignadas; los jugadores en bandeja `Pendientes` con posiciones nulas no aparecen en el selector, `spec-03 RF-01`) y aplicar las mismas validaciones de servidor que Equipo: 5 jugadores distintos, posición de alineación por cada slot (`B|E|A|AP|P`), 1 entrenador y 1 capitán entre los 5, con instante de inicio estrictamente anterior al cierre. Si falta algún elemento o el cierre pasa durante la edición, entonces el envío posterior deberá rechazarse con error de cierre sin guardar parcial.

- **RF-14 — Transversales móvil + Pete + tema + i18n:**
  Cuando se renderice cualquier pantalla de este flujo, el sistema deberá respetar solo-móvil 360–430 px a una mano, tap-to-select, objetivos ≥ 44 px, Modo Pete (`img↔imgPete`, `nombre↔nombrePete`) en el selector del Paso 1, tema claro/oscuro en todas las pantallas y cero strings hardcodeados (todo desde `es/strings.json` con claves `ui.auth.*`, `ui.onboarding.*`, `errors.auth.*`, `errors.close.*`).

## 3. Casos límite y manejo de errores

| # | Caso | Comportamiento exigido (QUÉ) | Por qué |
|---|---|---|---|
| E-01 | `username=" Arnau "` vs `"arnau"` vs `"ARNAU"` | Mismo usuario; segundo registro rechazado por duplicado | Login case-insensitive |
| E-02 | Caracteres fuera de `[A-Za-z0-9_-]`, < 3 o > 20, o solo espacios | Rechazo en registro con error de formato, sin contar para rate-limit de login | Formato se valida antes de autenticar |
| E-03 | Fallo de login (usuario inexistente / clave mal) | Error genérico idéntico, sin revelar cuál falló | Evita enumeración en liga privada |
| E-04 | 5.º fallo en ventana exacta de 15 min | Bloqueo 15 min persistido en BD por `username` (login), por usuario (cambio de clave) o por IP (código de invitación en registro); un acierto previo reinicia el contador; intentos durante bloqueo no lo reinician ni lo acortan | Castigo predecible sin bloquear el WiFi compartido ni depender de memoria volátil |
| E-05 | Sesión caducada a mitad de onboarding | Redirige a `/login` y al reautenticar aplica la precedencia RF-06 (`/cambiar-password` → `/onboarding` → `/` ó `/admin`) | Onboarding reanudable con precedencia estricta |
| E-06 | Cierre pasa mientras edita quinteto en Paso 1 | Envío rechazado con `errors.close.passed`; el Paso 1 muestra estado informativo con botón para continuar al Paso 2; el Paso 2 sigue siendo obligatorio antes de `/` y esa jornada no computa `−10` ni `0` | Cierre estricto en servidor sin saltar el cierre ni penalizar lo imposible |
| E-07 | Clave temporal tras asignar otra o tras guardar la nueva | Se trata como password inválida y cuenta para rate-limit; la nueva debe ser distinta de la temporal | La temporal muere al completarse el cambio |
| E-08 | Re-registro de `username` admin semilla en cualquier caso | Rechazo por duplicado | Semilla única y fuera de ranking |
| E-09 | Código de invitación rotado por admin | Registros nuevos exigen el nuevo; cuentas ya creadas no se ven afectadas | Rotación no expulsa a nadie |
| E-10 | Arte Keman / escudo ausente | Fondo neutro de pista; el flujo no se bloquea | El arte es externo y pendiente |
| E-11 | Doble envío de registro (doble tap) | Una sola cuenta; segundo intento responde duplicado sin duplicar fila | Tap móvil genera reintentos |
| E-12 | Registro con código inválido + `username` ya existente | Se devuelve error de invitación sin evaluar ni revelar el `username` | La invitación se valida antes para no enumerar usuarios |
| E-13 | Password de 7 o de 73, solo espacios, o nueva igual a actual/temporal | Rechazo por formato o por igualdad; nunca visible en respuestas ni logs | Bordes 8–72, no vacía funcional y no reutilizada |
| E-14 | Clave temporal asignada a usuario con onboarding pendiente | Precede el cambio de clave (RF-09); al completarlo retoma el paso pendiente de onboarding | Precedencia temporal → onboarding → home |
| E-15 | Acceso a `/login`, `/registro` o rutas privadas con/sin sesión | Sin sesión redirige a `/login` salvo `/login`, `/registro` y `/normas` pública; con sesión aplica precedencia RF-06 | Guardas verificables sin depender del cliente |

## 4. Fuera de alcance explícito

- Email, auto-reset, preguntas secretas, OAuth/social, magic-link, 2FA.
- Ticketing interno de resets, notificaciones push/email de "tu clave está lista", chat con admin.
- Selector de rol en registro, multi-liga, cambio de `username`, borrado de cuenta por el usuario.
- Edición de `nombrePete` de jugadores, dorsales y plantilla (dueño spec-03 / panel admin spec-09).
- Arte final Keman + escudo como entregable de esta spec.
- Motor §0, cálculo de rachas, validación de cierre y posiciones (spec-02); columnas/RLS/semilla (spec-03); `/normas` (spec-05); sync FNB (spec-10); fundación TS/Vitest/i18n (spec-01).

## 5. Criterios de finalización (Definition of Done)

- [ ] Registro con código inválido/ausente no crea usuario ni sesión y no revela si el `username` existe; con código válido y RF-02/RF-03 crea y entra a onboarding.
- [ ] `ARNau` autentica la cuenta `arnau`; duplicado `ArNaU` rechazado; formato inválido rechazado sin rate-limit de login.
- [ ] Password de 7 y de 73 rechazadas, de 8 aceptada; password solo-espacios rechazada; nueva igual a actual/temporal rechazada; nunca visible en respuestas ni logs.
- [ ] 5 fallos en 15 min bloquean 15 min por alcance (login por `username`, cambio por usuario, invitación por IP) incluso con credencial correcta posterior; error genérico idéntico en login; acierto previo reinicia contador.
- [ ] Sesión de 30 días exactos renovables por actividad; cerrar sesión revoca solo actual; cambiar password o asignar temporal revoca las demás; guardas de rutas con precedencia `/cambiar-password` → `/onboarding` → `/` (y `/home` redirigiendo a `/`) o `/admin`, con `/normas` pública.
- [ ] Asignar temporal revoca sesiones previas; login con temporal bloquea todo en `/cambiar-password` salvo cambiar clave/cerrar sesión/`/normas`; la temporal vale hasta completar el cambio y permite reintentar login si se corta; tras cambiarla retoma `/onboarding` si estaba pendiente o pasa a `/`.
- [ ] `Pedir reset` no crea filas ni notificaciones (verificable en BD).
- [ ] Admin semilla exento de onboarding, sin clasificación/top 3 ni quinteto, con cambio de clave propio y reset por semilla/BD.
- [ ] Onboarding aparece solo primera vez hasta confirmar el Paso 2; sin jornada abierta o cierre expirado muestra informativo con botón al Paso 2; con jornada abierta exige 5 activos + posición por slot + 1 + capitán; abandono retoma paso; envío tardío rechazado en servidor sin `−10` injusto.
- [ ] Cero literales UI en el flujo (todo por `es/strings.json`); 360–430 px sin scroll horizontal ni drag&drop; táctiles ≥ 44 px; Modo Pete y tema claro/oscuro respetados.
- [ ] `npx tsc --noEmit` 0 errores y cero `any`; `npm run lint` 0 warnings; `npm test` verde; `npm run build` verde.
