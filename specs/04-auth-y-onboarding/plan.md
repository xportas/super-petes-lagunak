# Plan técnico — 04 Auth y onboarding (§1)

Fuente: `specs/04-auth-y-onboarding/spec.md` + `CONSTITUTION.md` + `AGENTS.md` + `specs/01/02/03`.
Alcance: solo diseño. No incluye código de producción. La lógica real la implementará la fase de build de esta spec.

Prerrequisitos: `spec-01` aplicada (TS `strict`, Vitest, `es/strings.json` mínimo, placeholders `never` en `src/lib/`), `spec-02` aplicada (`validarQuinteto`, `calcularCierre`/`validarCierre`, `ordenarJornadasCanonico`), `spec-03` aplicada (tablas `usuario/sesion/invitacion/rate_limit/alineacion`). Esta spec no crea DDL ni RLS (dueña `spec-03`), no implementa selector (dueño `spec-06`), ni `/normas#cierre` (dueño `spec-05`).

## 1. Modelos de datos

Solo tipos TS de dominio. Cero SQL, cero migraciones, cero RLS en esta spec (dueña spec-03). Los tipos son los DTOs que auth/onboarding consumen; spec-03 los mapea a sus tablas.

```ts
// src/lib/auth/tipos.ts
export type Rol = 'manager' | 'admin';
export type AlcanceRateLimit = 'login' | 'cambiar_password' | 'registro';
export type PasoOnboarding = 1 | 2 | 'completado';

export interface UsuarioAuth {
  readonly id: string; // uuid
  readonly usernameDisplay: string;   // preserva capitalización
  readonly usernameNorm: string;      // trim + lower, único
  readonly hashPassword: string;      // nunca sale al cliente
  readonly rol: Rol;
  readonly esTemporal: boolean;       // clave temporal activa (RF-09)
  readonly onboardingPaso: PasoOnboarding;
  readonly onboardingCompletadoAt: Date | null;
  readonly creadoAt: Date;
}

export interface Sesion {
  readonly id: string;
  readonly usuarioId: string;
  readonly tokenHash: string;         // sha256(token), nunca token en claro en BD
  readonly creadaAt: Date;
  readonly expiraAt: Date;            // +30d exactos
  readonly ultimaRenovacionAt: Date;  // sliding: si >1h, renueva (RF-06)
  readonly revocadaAt: Date | null;
  readonly creadaDesdeTemporal: boolean; // si nació de login con temporal (RF-09)
}

export interface InvitacionLiga {
  readonly id: string;
  readonly codigoNorm: string;  // trim + lower, único entre activas
  readonly activa: boolean;     // solo una activa; rotar = desactivar + crear
  readonly creadaAt: Date;
}

// 1 fila por (alcance, sujeto). Ventana fija 15m desde primer_fallo_at.
export interface FilaRateLimit {
  readonly alcance: AlcanceRateLimit;
  readonly sujeto: string; // login: usernameNorm | cambiar: usuarioId | registro: ip
  readonly intentos: number;
  readonly primerFalloAt: Date;
  readonly bloqueadoHasta: Date | null;
}

export type DestinoGuardia =
  | { readonly a: '/login' } | { readonly a: '/cambiar-password' }
  | { readonly a: '/onboarding'; readonly paso: 1 | 2 }
  | { readonly a: '/' } | { readonly a: '/admin' }
  | { readonly a: 'permitir' };
```

Notas:

- Onboarding vive como campos en `usuario` (`onboardingPaso`, `onboardingCompletadoAt`), no tabla propia — relación 1:1, una lectura basta. El quinteto del Paso 1 vive en `alineacion` (spec-03 RF-12), no aquí; onboarding solo lee/precarga (RF-12/13).
- `esTemporal` + `creadaDesdeTemporal` modelan RF-09 sin tabla extra. La temporal muere solo al guardar nueva o al generar otra (nunca por timeout de sesión).
- Sujeto de rate-limit separado por alcance tal cual RF-05. IP solo para `registro` con fallo de código.

## 2. Decisiones justificadas

| # | Decisión | Elegida | Alternativa descartada | Justificación / RF |
|---|---|---|---|---|
| D-01 | Hash | `argon2id` (lib `argon2`, `memoryCost 19456, timeCost 2, parallelism 1`), runtime `nodejs` en actions de auth | `bcryptjs` puro-JS o `scrypt` manual | `CONSTITUTION.md §4` permite ambos; OWASP prefiere Argon2id ante GPU. `bcrypt` se descarta por menor resistencia con mismo coste. `argon2` exige `runtime='nodejs'` — se fija en las routes de auth. Cubre RF-02/03/10 |
| D-02 | Sesión | Token opaco `32B crypto.randomBytes` + `sha256` en BD, cookie con token en claro | JWT firmada stateless | Revocación inmediata (RF-06 cerrar una, RF-08/10 revocar todas) imposible con JWT sin denylist. Opaca permite `revocadaAt` + sliding en BD. Cubre RF-06/08/09/10 |
| D-03 | Cookie | `httpOnly, Secure (prod), SameSite=Lax, Path=/, Max-Age=30d`, nombre `spl_sesion`, valor `id.token` | Cookie no-httpOnly o `localStorage` | `CONSTITUTION.md §4`: XSS no debe robar sesión. `service_role` jamás a cliente. Cubre RF-06 |
| D-04 | Guardas + sliding | `src/proxy.ts` `export function proxy` renueva cookie+BD si `>1h` desde `ultimaRenovacionAt`; layouts/pages revalidan precedencia | `middleware.ts` o solo checks en Server Components | En Next 16.4 `middleware.ts` deprecado; Server Components no pueden `set-cookie` en lectura. `proxy` es el único punto de lectura que puede renovar. Cubre RF-06/E-05 |
| D-05 | Rate-limit | Persistido en BD, 1 fila por `(alcance,sujeto)`, ventana fija 15m, `bloqueado_hasta=ahora+15m` al 5º fallo | Memoria, Upstash, o ventana deslizante | Serverless sin memoria volátil (`CONSTITUTION.md §3`); ventana fija es la que congela la spec (predecible, E-04). Intentos durante bloqueo no reinician ni acortan. Cubre RF-05/E-04 |
| D-06 | Orden validación registro | `código invitación → formato username → formato password → duplicado` | Comprobar duplicado primero | RF-01/E-12 anti-enumeración: con código inválido no se revela si el username existe. Formato antes de BD evita contar para rate-limit de login (E-02) |
| D-07 | Invitación | Una sola fila `activa=true`; rotar = `update activa=false + insert nueva`; cuentas existentes inmunes | Múltiples códigos vigentes o código por usuario | Spec exige código único de liga rotable sin expulsar (E-09, RF-01/09). Una activa simplifica validación case-insensitive |
| D-08 | Username | Normalizar `trim + toLowerCase` para unicidad/lookup; guardar `display` con `trim` original | Guardar solo lower o solo original | RF-02/E-01/E-08: `Arnau==arnau`, display preservado, `3-20 [A-Za-z0-9_-]` sobre el `trim` |
| D-09 | Password | Sin `trim` (espacios cuentan), longitud `8-72` sobre string crudo + `trim(p).length>=1` | `trim` antes de medir | RF-03/E-13 literal: `7/73` y solo-espacios rechazan, `8` acepta. Nunca se devuelve ni loguea |
| D-10 | IP registro | `x-forwarded-for.split(',')[0].trim() ?? x-real-ip ?? '127.0.0.1'` extraída en servidor | `request.ip` o IP de cliente | Único punto fiable tras proxies en Next; fallback local/test per RF-05. Solo se usa cuando falla el código (no se fingerprinta al usuario válido) |
| D-11 | Onboarding Paso 1 | Reutiliza `validarQuinteto` + `validarCierre` de spec-02 y selector de spec-06; sin lógica propia | Duplicar validación en auth | `AGENTS.md`: motor/dominio en funciones puras, prohibido reinterpretar. Cubre RF-12/13/E-06. Si no hay jornada `pendiente` con `ahora<cierre`, Paso 1 informativo (no bloquea) |
| D-12 | Reset | Acción puramente informativa, cero filas/BD | Ticket/notificación en BD | RF-08 + fuera de alcance notificaciones. Verificable: `SELECT count(*)` inmutable tras `Pedir reset`. Revocación real ocurre solo en `asignarTemporal` (dueña spec-09, aquí contrato) |

## 3. Archivos exactos a crear / modificar / no tocar

Respetando estructura objetivo de `AGENTS.md`. No se crea `app/normas/*` (spec-05), ni `eu.json`.

### Crear

- `src/proxy.ts` — `export function proxy(req)` + `matcher` salvo estáticos; renueva sliding `>1h`, aplica precedencia RF-06 (temporal → onboarding → `/`/`/admin`), redirige sin sesión a `/login` salvo `/login /registro /normas` pública. **Cubre RF-06/E-05/E-15.**
- `src/lib/auth/tipos.ts` — tipos §1. **Cubre RF-05/06/09/11.**
- `src/lib/auth/normalizacion.ts` — puras: `normalizarUsername(s:unknown):string`, `esFormatoUsernameValido`, `esPasswordValida` (sin trim + 1 no-espacio), `normalizarCodigoInvitacion`, `extraerIP(headers:Headers):string`. **Cubre RF-01/02/03/05.**
- `src/lib/auth/password.ts` — `hashearPassword(p:string):Promise<string>`, `verificarPassword(p,hash):Promise<boolean>` (argon2id). **Cubre RF-03/04/10.**
- `src/lib/auth/sesion.ts` — puras testeables: `debeRenovar(ultimaRenovacionAt,ahora):boolean`, `nuevaExpiracion(ahora):Date`, + impuras `crearSesion/revocarSesion/revocarTodasMenos`. **Cubre RF-06/09/10.**
- `src/lib/auth/rate-limit.ts` — pura `evaluarIntento(fila|null,ahora):{permitido,reiniciar,incBloqueo}` + `sujetoPara(alcance,ctx)`. **Cubre RF-05/E-04.**
- `src/lib/auth/guardas.ts` — pura `resolverDestino({tieneSesion,esTemporal,rol,onboardingPaso,ruta}):DestinoGuardia` con precedencia RF-06. **Cubre RF-06/07/09/11/E-15.**
- `src/lib/auth/esquemas.ts` — Zod borde (ver §4). **Cubre RF-01/02/03/10.**
- `src/lib/auth/index.ts` — barrel.
- `src/lib/supabase/auth.ts` — único acceso BD auth con cliente servidor `service_role`: `buscarUsuarioPorNorm`, `crearUsuario`, `buscarInvitacionActiva`, `leerFilaRateLimit/upsert`, `crearSesion/revocar`, `marcarTemporal/limpiarTemporal`. Verifica sesión+rol en backend antes de cada escritura. **Cubre RF-01/04/05/06/08.**
- Rutas (Server Components + Server Actions, `'use client'` solo en formularios):
  - `src/app/login/page.tsx` + `src/app/login/actions.ts` (`iniciarSesion`) + `src/app/login/formulario.tsx`. **Cubre RF-04/06.**
  - `src/app/registro/page.tsx` + `src/app/registro/actions.ts` (`registrar`) + `src/app/registro/formulario.tsx`. **Cubre RF-01/02/03/12.**
  - `src/app/cambiar-password/page.tsx` + `src/app/cambiar-password/actions.ts` (`cambiarPassword`). Accesible con sesión normal (desde Ajustes) o temporal confinada. **Cubre RF-09/10.**
  - `src/app/onboarding/page.tsx` + `src/app/onboarding/actions.ts` (`guardarQuintetoOnboarding`, `confirmarPaso2`) + `src/app/onboarding/paso-1.tsx` (importa selector spec-06, no lo reimplementa) + `src/app/onboarding/paso-2.tsx` (enlace `/normas#cierre`). **Cubre RF-11/12/13.**
- Tests junto al módulo (`*.test.ts`):
  - `src/lib/auth/normalizacion.test.ts`
  - `src/lib/auth/password.test.ts` (argon2, pocos casos por coste)
  - `src/lib/auth/rate-limit.test.ts`
  - `src/lib/auth/guardas.test.ts`
  - `src/lib/auth/sesion.test.ts`
  - `src/lib/auth/esquemas.test.ts`
  - `src/lib/auth/onboarding.test.ts` (retomar paso + precarga + sin `-10`)

No crear en 04: `src/lib/scoring/constantes.ts` (spec-02), migraciones SQL (spec-03), `src/app/normas/*` (spec-05), selector propio (spec-06), panel admin UI (spec-09 salvo contrato `asignarTemporal`).

### Modificar

- `package.json` — añadir `argon2`, `zod`. No `next-auth`, no `@supabase/*` nuevo (reusa cliente spec-01/03).
- `es/strings.json` — añadir claves §6 sin renombrar las de spec-01/02.
- `vitest.config.ts` (de spec-01) — mantener umbral global y añadir 100% líneas+ramas en `src/lib/auth/normalizacion.ts, rate-limit.ts, guardas.ts, sesion.ts`.

### No tocar

- `src/lib/scoring/*`, `src/lib/dominio/*` (solo consumir), `src/lib/fnb/*`, `src/app/normas/*`, `public/*`, `README.md §0/§1`.

## 4. Tipos de dominio en TypeScript strict y esquemas Zod

Convenciones: `strict` + `noUncheckedIndexedAccess`, cero `any` (`unknown` + narrowing), `readonly` en entradas, archivos `kebab-case`, negocio en español (`Quinteto`, `valoracionFNB` donde aplique).

```ts
// src/lib/auth/esquemas.ts — único sitio con unknown en borde
import { z } from 'zod';

export const esquemaUsername = z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_-]+$/);
export const esquemaPassword = z.string().min(8).max(72).refine(s => s.trim().length >= 1);
export const esquemaCodigo = z.string().trim().min(1).transform(s => s.toLowerCase());

export const esquemaRegistro = z.object({
  username: esquemaUsername,
  password: esquemaPassword,
  codigo: esquemaCodigo,
});

export const esquemaLogin = z.object({
  username: esquemaUsername,
  password: z.string().min(1),
}); // mensaje genérico, no filtra longitud real (E-03)

export const esquemaCambiar = z.object({
  actual: z.string().min(1),
  nueva: esquemaPassword,
});

export const esquemaConfirmarPaso2 = z.object({
  entendido: z.literal(true),
});
// Paso 1 reutiliza esquemaQuintetoInput de spec-02, no se redefine aquí.
```

Zod no entra en puras de sesión/guardas/rate-limit: reciben tipos ya estrechados.

## 5. Contratos de funciones puras / Server Actions / tablas Supabase

```ts
// puras (testeables sin BD/reloj real — ahora inyectado)
normalizarUsername(v: unknown): string; // trim; lanza codigo FORMATO si inválido
normalizarCodigoInvitacion(v: unknown): string;
evaluarIntento(fila: FilaRateLimit | null, ahora: Date): { permitido: boolean; bloquearHasta: Date | null; reiniciar: boolean };
debeRenovar(ultima: Date, ahora: Date): boolean; // >1h
resolverDestino(ctx: { tieneSesion: boolean; esTemporal: boolean; rol: Rol; onboardingPaso: PasoOnboarding; ruta: string }): DestinoGuardia;

// impuras servidor (service_role, tras validar sesión/rol)
registrar(input: unknown, ip: string, ahora: Date): Promise<{ ok: true } | { ok: false; codigo: 'INVITACION' | 'USERNAME' | 'PASSWORD' | 'BLOQUEADO' }>;
iniciarSesion(input: unknown, ahora: Date): Promise<{ ok: true } | { ok: false; codigo: 'CREDENCIALES' | 'BLOQUEADO' }>; // genérico E-03
cerrarSesion(sesionId: string): Promise<void>; // solo actual RF-06
cambiarPassword(sesionId: string, input: unknown): Promise<{ ok: true; retomarOnboarding: boolean } | { ok: false; codigo: string }>; // exige actual salvo temporal; nueva != actual/temporal; revoca demás RF-10
asignarClaveTemporal(adminSesionId: string, usuarioId: string, temporal: string): Promise<void>; // revoca todas + limpia rate-limit login/cambiar RF-08; UI en spec-09
guardarQuintetoOnboarding(sesionId: string, quinteto: unknown, instanteInicio: Date): Promise<{ ok: true } | { ok: false; codigo: 'CIERRE' | 'ALINEACION' | 'SIN_JORNADA' }>; // delega a validarQuinteto+validarCierre RF-13
confirmarPaso2(sesionId: string): Promise<void>; // marca completado, RF-11
```

Server Actions: `registrar`, `iniciarSesion`, `cerrarSesion`, `cambiarPassword`, `guardarQuintetoOnboarding`, `confirmarPaso2`. Cero Server Actions para `Pedir reset` (solo muestra texto).

Tablas Supabase afectadas (lectura/escritura, DDL dueña spec-03): `usuario`, `sesion`, `invitacion_liga`, `rate_limit`, `alineacion` (solo Paso 1). RLS `DENY ALL anon`, todo vía servidor con `service_role` tras validar sesión httpOnly y rol. Cero Storage.

## 6. Claves i18n nuevas para `es/strings.json`

Sin literales en JSX; `{var}` solo con valores de constantes donde aplique. No crear `ui.normas.*` (dueña spec-05).

- `ui.auth.login_titulo`, `ui.auth.registro_titulo`
- `ui.auth.username`, `ui.auth.password`, `ui.auth.codigo_invitacion`
- `ui.auth.entrar`, `ui.auth.crear_cuenta`
- `ui.auth.pedir_reset`, `ui.auth.reset_info` (`"Contacta al admin por privado con tu username {username}"`)
- `ui.auth.cambiar_titulo`, `ui.auth.actual`, `ui.auth.nueva`, `ui.auth.guardar`, `ui.auth.cerrar_sesion`
- `ui.onboarding.titulo`
- `ui.onboarding.paso1_titulo`, `ui.onboarding.paso1_sin_jornada`, `ui.onboarding.paso1_cierre_pasado`
- `ui.onboarding.ir_paso2`, `ui.onboarding.volver_paso1`
- `ui.onboarding.paso2_titulo`, `ui.onboarding.paso2_texto` (usa `{horas}`=`3` desde `HORAS_CIERRE`), `ui.onboarding.paso2_enlace` (`/normas#cierre`), `ui.onboarding.confirmar`
- `errors.auth.invitacion` (antes que username, E-12), `errors.auth.username_formato`, `errors.auth.username_duplicado`, `errors.auth.password_formato`, `errors.auth.credenciales` (genérico E-03), `errors.auth.bloqueado_15m` (con `{minutos}`=`15`), `errors.auth.temporal_distinta`, `errors.auth.nueva_distinta`, `errors.auth.temporal_invalida`
- Reuso: `errors.close.passed` (spec-01) para E-06; no duplicar.

## 7. Estrategia de tests en Vitest

- Entorno `node`; reloj inyectado (`ahora` param); BD mockeada con fakes en memoria (nunca Supabase real); `argon2` con coste mínimo en test.
- `normalizacion.test.ts`: E-01/E-02/E-08/E-13 (trim/case, `3-20`, solo-espacios, `7/73` vs `8`).
- `rate-limit.test.ts`: 4 fallos permiten, 5º bloquea 15m por sujeto; alcances aislados (login por norm, cambiar por id, registro por IP); acierto reinicia; intento en bloqueo no alarga; `>15m` reinicia a 1; credencial correcta durante bloqueo sigue bloqueada (DoD).
- `guardas.test.ts`: tabla precedencia temporal → onboarding paso pendiente → `/` o `/admin`; sin sesión salvo `/login /registro /normas`; E-05/E-14/E-15.
- `sesion.test.ts`: 30d exactos, `debeRenovar` frontera `1h`, revocar una vs todas.
- `esquemas.test.ts`: invitación antes que username (E-12), doble tap (E-11) una sola fila, genérico login (E-03).
- `onboarding.test.ts`: sin jornada/cierre pasado → informativo + Paso 2 obligatorio sin `-10` (E-06/RF-12); retomar paso; precarga quinteto; envío tardío `CIERRE` sin guardar (RF-13).
- Cobertura: 100% líneas+ramas en `src/lib/auth/normalizacion.ts, rate-limit.ts, guardas.ts, sesion.ts`; resto mantiene umbral spec-01.
- Puerta: `npx tsc --noEmit` 0 errores, cero `any`, `npm run lint` 0 warnings, `npm test` verde + umbral, `npm run build` verde.

## 8. Trazabilidad requisito → plan

- RF-01 → §4 `esquemaRegistro` + §1 `InvitacionLiga` + §5 `registrar` + §7 E-12.
- RF-02 → §4 `esquemaUsername` + §5 `normalizarUsername` + unicidad `usernameNorm` + §7 E-01/02/08/11.
- RF-03 → §4 `esquemaPassword` (8-72 + no-espacio, sin trim) + §5 `password.ts` + §7 E-13.
- RF-04 → §5 `iniciarSesion` genérico + §7 E-03.
- RF-05 → §1 `FilaRateLimit` + §5 `evaluarIntento/extraerIP` + §7 E-04.
- RF-06 → §1 `Sesion` + §3 `proxy.ts` + §5 `resolverDestino/debeRenovar` + §7 E-05/15.
- RF-07 → §1 `Rol` + §5 `guardas` + `asignarTemporal` excluido ranking + semilla spec-03.
- RF-08 → §2 D-12 sin tabla reset + §5 `asignarClaveTemporal` revoca + test BD inmutable.
- RF-09 → §1 `esTemporal/creadaDesdeTemporal` + §5 confinamiento `guardas` + `cambiarPassword` + §7 E-07/14.
- RF-10 → §4 `esquemaCambiar` + §5 `cambiarPassword` (distinta + rate-limit) + §7 E-13.
- RF-11 → §1 `PasoOnboarding` + §3 `onboarding/page + confirmarPaso2` + §7 DoD.
- RF-12 → §3 Paso 1 informativo + retomar + precarga + sin `-10` (`agregador` respeta `onboardingCompletadoAt<cierre`) + §7 E-06.
- RF-13 → §2 D-11 delegación `validarQuinteto/validarCierre` + §5 `guardarQuintetoOnboarding` + elegibles `activo+2 posiciones` + §7.
- RF-14 → §6 `ui.auth/ui.onboarding/errors.auth` + tap≥44px/360-430/Pete/tema (verificación manual + `break-ui` en build).
