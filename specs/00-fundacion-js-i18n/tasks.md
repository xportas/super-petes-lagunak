# Tareas — 00 Fundación JS + i18n

Fuente: `spec.md` + `plan.md` de esta 00.
Nota: en esta 00 **no aplican** tests de motor/dominio (sin Vitest, sin `scoring/`, sin `dominio` por §4). T-01 lo deja verificado primero.

## T-01 — Precondiciones y ausencia de alcance
- **Toca:** ninguno (solo lectura: `app/`, `jsconfig.json`, `package.json`, `es/`, `src/`).
- **Cubre:** RF-01, RF-10.
- **Hacer:** comprobar que `app/` está en raíz con `jsconfig.json` y alias `@/*`; comprobar que no existen `tsconfig.json`, `*.ts/*.tsx` propios, config Vitest ni `src/lib/scoring|dominio|supabase`.
- **Verificación:** `npm run lint` pasa como base (puede ser antes de crear nada, documenta punto de partida).

## T-02 — Crear `es/strings.json` mínimo
- **Toca:** `es/strings.json` (crear).
- **Cubre:** RF-02.
- **Hacer:** objeto jerárquico válido con `ui.home.countdown` (con `{time}`), `errors.close.passed` (sin vars) y `ui.ejemplo.saludo` (con `{nombre}`). Solo texto plano, sin HTML ni plurales.
- **Verificación:** `node -e "JSON.parse(require('fs').readFileSync('es/strings.json','utf8')); console.log('json ok')"` y comprobar las 3 claves existen.

## T-03 — Crear loader `diccionario.js`
- **Toca:** `src/lib/i18n/diccionario.js` (crear).
- **Cubre:** RF-01, RF-04, RF-08.
- **Hacer:** carga por `locale` con fallback a `es` + aviso en desarrollo si el locale no existe (E-08). Archivo ausente o JSON inválido propaga fallo visible (E-05, E-06).
- **Verificación:** `npm run lint` 0 warnings sobre el fichero; comprobación manual: pedir `eu` avisa y devuelve `es`.

## T-04 — Crear `traducir.js` (clave + `{var}` + errores)
- **Toca:** `src/lib/i18n/traducir.js` (crear).
- **Cubre:** RF-03, RF-05, RF-06, RF-07.
- **Hacer:** resolución jerárquica, sustitución solo `{nombre}` válido, ignora params extra (E-03), valor no-string → aviso + fallback a clave (E-04), `{malformada` como literal (E-09), clave inexistente → aviso + devuelve clave (E-01), variable sin param → aviso sin devolver frase incompleta (E-02).
- **Verificación:** `npm run lint` 0 warnings; comprobación manual con `ui.home.countdown {time}`, `ui.ejemplo.saludo {nombre}`, clave inexistente y variable ausente.

## T-05 — Crear `index.js` público
- **Toca:** `src/lib/i18n/index.js` (crear).
- **Cubre:** RF-01, RF-03, RF-04.
- **Hacer:** único punto de importación del módulo; no añade lógica.
- **Verificación:** `npm run lint` 0 warnings; no existe ningún otro `src/lib/*` fuera de `i18n/`.

## T-06 — Verificar diccionario roto bloquea (RF-08)
- **Toca:** ninguno (verificación temporal sobre copia, restaurar después).
- **Cubre:** RF-08.
- **Hacer:** renombrar temporalmente `es/strings.json` y luego restaurarlo; corromperlo temporalmente con JSON inválido y restaurarlo. En ambos casos la fundación no se da por hecha.
- **Verificación:** con archivo ausente/inválido, `npm run build` no se considera verde (falla o se descarta la entrega).

## T-07 — Verificar cero-concatenación y permanencia JS
- **Toca:** ninguno (revisión).
- **Cubre:** RF-09, RF-10.
- **Hacer:** revisión manual de que frases con vars viven completas en el diccionario y de que no hay `tsconfig.json`, `*.ts/*.tsx` propios, `tsc` ni Vitest/`npm test`.
- **Verificación:** búsqueda de literales visibles fuera del diccionario + `npm run lint` 0 warnings.

## T-08 — Puerta de calidad final
- **Toca:** solo ajustes mínimos en ficheros existentes si `lint`/`build` lo exigen (sin cambios visuales).
- **Cubre:** RF-01, RF-08, RF-10 + DoD.
- **Hacer:** dejar `npm run lint` en 0 warnings y `npm run build` en verde con el diccionario válido.
- **Verificación:** `npm run lint` → 0 warnings; `npm run build` → verde.
