# Plan técnico — 00 Fundación JS + i18n

Fuente: `specs/00-fundacion-js-i18n/spec.md` + `CONSTITUTION.md` + `AGENTS.md`.
No incluye código de producción. Solo diseño para que un agente lo ejecute después.

## 1. Archivos exactos a crear / modificar

### Crear

- `es/strings.json` — único diccionario v1 (solo `es`).
- `src/lib/i18n/diccionario.js` — carga y acceso al diccionario por locale, con fallback `es` según E-08.
- `src/lib/i18n/traducir.js` — resolución por clave jerárquica + interpolación `{var}` simple + errores visibles en desarrollo (E-01, E-02, E-04).
- `src/lib/i18n/index.js` — re-export público del módulo (único punto de importación permitido).

### No crear en esta 00

- `src/lib/scoring/`, `src/lib/dominio/`, `src/lib/supabase/` — ni siquiera placeholders (fuera de alcance §4, los crean sus specs).
- `src/app/` — `app/` se queda en raíz (RF-01).
- `tsconfig.json`, `*.ts/*.tsx`, config Vitest — prohibidos por RF-10 y §4.

### Modificar

- Ningún archivo existente (`app/layout.js`, `app/page.js`, `jsconfig.json`, `next.config.mjs`, `eslint.config.mjs`, `package.json`) se modifica en esta 00, salvo que `npm run lint` / `npm run build` lo exija para pasar en verde. No hay cambio visual exigible.

## 2. Tipos de dominio y esquemas Zod

**No aplica TypeScript strict en esta 00** (RF-10 deroga temporalmente `CONSTITUTION §1/§10`).

- No se crea `tsconfig.json`, no hay `tsc --noEmit`, no hay `any` que auditar porque no hay TS.
- Contratos JS con `JSDoc` mínimo únicamente para:
  - `Locale = 'es'` (extensible a `'eu'` sin cambiar firmas).
  - `ClaveI18n = string` con forma jerárquica `seccion.subseccion.nombre`.
  - `ParamsI18n = Record<string, string | number>` solo para `{var}` simple.
- **Zod: no aplica.** No hay formularios, Server Actions ni input de usuario en esta fundación. No se añade dependencia `zod`.

## 3. Contratos (funciones puras / Server Actions / Supabase)

### Funciones puras i18n (únicas en alcance)

1. `cargarDiccionario(locale)` → devuelve el objeto diccionario del locale, o `es` como fallback con aviso en desarrollo si el locale no existe (E-08). Si el archivo falta o es JSON inválido, propaga fallo visible que impide `build` verde (E-05, E-06).
2. `traducir(locale, clave, params?)` → resuelve clave jerárquica, sustituye `{var}` simple, ignora params extra (E-03), trata valor no-string como clave malformada (E-04), variable malformada como literal (E-09). Clave inexistente: aviso en desarrollo + devuelve la clave (E-01). Variable declarada sin param: aviso en desarrollo, no devuelve frase incompleta (E-02).

Ambas son puras respecto a la UI: no leen `window`, no hacen fetch, no tocan BD.

### Server Actions

**0 afectadas.** Esta fundación no muta nada. No se crea ninguna Server Action.

### Tablas Supabase

**0 afectadas.** Sin migraciones, sin RLS, sin `service_role`, sin Storage. `public/` no se toca.

## 4. Claves i18n nuevas (`es/strings.json`)

Solo el mínimo RF-02. Estructura jerárquica, texto plano, sin HTML, sin plurales:

- `ui.home.countdown` — contiene `{time}` (ej. valor tipo "Cierre en {time}").
- `errors.close.passed` — sin variables.
- `ui.ejemplo.saludo` — ejemplo adicional con `{nombre}` para demostrar sustitución (no es de ninguna pantalla; sirve para verificar RF-05).

Prohibido añadir en esta 00 claves de auth, equipo, ficha, jornada, clasificación, ajustes o admin (fuera de alcance). Prohibido componer frases por concatenación fuera del diccionario (RF-09).

## 5. Estrategia de tests en Vitest

**No aplica en esta 00** (fuera de alcance §4, decisión explícita).

- No se instala `vitest`, no se crea `npm test`, no hay umbral de cobertura.
- Verificación de esta 00 exclusivamente por DoD de la spec:
  1. `npm run lint` → 0 warnings.
  2. `npm run build` → verde; con `es/strings.json` ausente/inválido no se considera verde.
  3. Comprobación manual: clave válida devuelve texto, `{time}`/`{nombre}` interpolan, clave inexistente devuelve la clave con aviso en desarrollo, variable sin param avisa, locale sin diccionario avisa y usa `es`.
- La infra Vitest la aportará la spec del motor §0 / la 01, no esta.
