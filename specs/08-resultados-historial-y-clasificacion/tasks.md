# Tasks — 08 Resultados, Historial y Clasificación

Orden de ejecución: tests primero (TDD). Cada tarea es atómica. Verificación con `npm test` / `npx tsc --noEmit` / `npm run lint` / `npm run build`.

- [ ] T-01 Tests puros `colores.ts` (RED)
  - Cubre: RF-17, E-02, E-03, E-04.
  - Crear `src/lib/resultados/colores.test.ts`: `medallaPorPuesto(1/2/3=>oro/plata/bronce, 4+=>null)`, `debeColorear(false si !hayCalculada o todosCero)`, `esZonaRoja(N>6 últimas 3 + empatados fila N-2, N<=6 nunca rojo)`, empate triple `3º` y empate en `N-2`.
  - Hecho cuando: `npm test -- colores` falla por módulo inexistente (RED), sin tocar `colores.ts`.

- [ ] T-02 Tests puros `clasificacion.ts` (RED)
  - Cubre: RF-14, RF-15, E-10, E-11.
  - Crear `src/lib/resultados/clasificacion.test.ts`: suma solo `calculada`+`-10` (excluye `papel/pendiente/invalidada`), orden acumulado DESC + `username` ASC case-insensitive, olímpica `1,2,2,4`, Admin excluido del input, nuevo con `0` adelanta a negativo, recálculo J2 visto en J6 actualiza.
  - Hecho cuando: `npm test -- clasificacion` en RED por `clasificacion.ts` inexistente.

- [ ] T-03 Tests puros `historial.ts` (RED)
  - Cubre: RF-04, RF-05, RF-06, RF-08, RF-12, RF-13, E-01, E-05, E-06, E-07, E-08, E-09, E-10.
  - Crear `src/lib/resultados/historial.test.ts`: `Sin datos` si 0 calculadas; DESC `hora_partido,numero_jornada`; filtra `papel/pendiente`, `invalidada`=>aviso sin fila; `-10` sin líneas con puesto y rompe rachas; `puestoAcumuladoTras` olímpico con `0` de altas tardías; sin retroactivo en filas propias; corrección J2 recalcula J2..J6.
  - Hecho cuando: `npm test -- historial` en RED.

- [ ] T-04 Tests desglose derivado del motor + anti-literal (RED)
  - Cubre: RF-09, RF-10, RF-11, E-12, E-13, E-14, E-15, E-20.
  - Crear `src/lib/resultados/desglose.test.ts`: usa `calcularJornada` real de spec-02 (no mocks): orden `BASE→entrenador→+5→-N→subtotal→+3→-5→TOTAL`, cifra entrenador solo en `lineas` (cabecera sin cifra), ceros explícitos, 2 expulsados `−10` con BASE intacta, capitán MVP `+3` sin multiplicar con Maider/Páter, `0 ✅` vs `0 🚑/❌`, baja actual no reescribe histórica.
  - Hecho cuando: `npm test -- desglose` en RED; `grep -r "+5\|x1.5" src/app/mi-resultado src/app/clasificacion` se documenta como futuro gate anti-literal.

- [ ] T-05 Implementar puras `tipos + historial + clasificacion + colores` (GREEN)
  - Cubre: RF-05, RF-06, RF-14, RF-15, RF-17.
  - Crear `src/lib/resultados/tipos.ts,historial.ts,clasificacion.ts,colores.ts,index.ts` según plan §1/§5, cero `any`, `readonly`, sin Zod, sin IO, reusando `scoring/dominio` sin duplicar fórmulas.
  - Hecho cuando: `npm test -- src/lib/resultados` verde + `npx tsc --noEmit` 0 errores.

- [ ] T-06 Queries servidor `src/lib/supabase/resultados.ts`
  - Cubre: RF-05, RF-14, RF-19.
  - Implementar solo lectura con `service_role` tras validar sesión+rol: `leerJornadasOrdenadas, leerAlineacionDe, leerActaDe, leerManagersElegibles, leerPlantillaVigenteEn`. Sin scoring dentro. Reusa `z.string().uuid()` de spec-03 en borde si valida ids.
  - Hecho cuando: `npm test` verde con fakes en memoria (sin BD real) + `npx tsc --noEmit` 0 errores.

- [ ] T-07 i18n `es/strings.json`
  - Cubre: RF-20, RF-08, RF-12, RF-18.
  - Añadir sin renombrar: `ui.resultados.*, ui.clasificacion.*, ui.comun.reintentar/cargando, errors.resultados.bd/admin_sin_historial` (plan §6), con `{puntos,puesto,penalizacion,numero,total,bonus}` tipados. Nada de `ui.normas.*`.
  - Hecho cuando: `npm test -- diccionario/traducir` verde + `traducir('es','ui.resultados.fila_puntos',{puntos:67,puesto:3})` compila y `@ts-expect-error` si falta `{var}`.

- [ ] T-08 Páginas Server `/mi-resultado` + `/clasificacion` (estructura)
  - Cubre: RF-01, RF-04, RF-05, RF-14, RF-15.
  - Crear `src/app/mi-resultado/page.tsx` (guardias 04 → `leer*` → `construirHistorial` → `destacada.tsx` + lista), `destacada.tsx` (etiqueta entrenador sin cifra + enlace `/normas#orden`), `fila-sin-envio.tsx` (nota `-10` + enlace), `src/app/clasificacion/page.tsx` (lista `<li>` no tocable). Sin `await cookies()` arriba, prefs vía `Suspense` (05).
  - Hecho cuando: `npx tsc --noEmit` 0 errores + `npm run lint` 0 warnings + render manual con J2 seed muestra destacada + filas DESC.

- [ ] T-09 Acordeón exclusivo client
  - Cubre: RF-07, E-16 + RF-11 (slot/capitán/iconos/ceros).
  - Crear `src/app/mi-resultado/historial-acordeon.tsx` (`'use client'`, `abiertaId:string|null`, tap ≥44px, una sola abierta, retap colapsa, cero hover). Solo presenta `DesgloseJornadaVista`, no calcula.
  - Hecho cuando: test manual móvil 360-430px: tocar fila A abre, tocar B colapsa A, retocar cierra; `npm run lint` 0 warnings.

- [ ] T-10 Colores, mi fila y `Sin datos` en UI
  - Cubre: RF-16, RF-17, E-01, E-02.
  - Aplicar `medallaPorPuesto/esZonaRoja/debeColorear` en `clasificacion/page.tsx`, `aria-current` en mi fila, `Sin datos` sin colores si 0 calculadas o todo `0`. Sin rojo si `N<=6`.
  - Hecho cuando: story con 7 managers y empate en `N-2` tiñe empatados; con 6 no hay rojo; `npm test -- colores` verde.

- [ ] T-11 Error total + Reintentar
  - Cubre: RF-19, E-18.
  - Crear `src/app/mi-resultado/error.tsx` y `src/app/clasificacion/error.tsx` (client, `reset()`), sin parciales.
  - Hecho cuando: forzar throw en query muestra error completo + botón `Reintentar` recupera al pulsar (manual + `npm run build` verde).

- [ ] T-12 Guardias, Admin y enlaces
  - Cubre: RF-02, RF-03, E-19, RF-18 + RF-01 (nav).
  - Reusar `src/proxy.ts/resolverDestino` (04): sin sesión→login, temporal/onboarding→flujo; Admin: `clasificacion` lectura sin rankear, `mi-resultado` denegado `errors.resultados.admin_sin_historial`. Añadir nav Resultados/Clasificación (05) y enlaces a `/normas#orden` en destacada/nota/aviso.
  - Hecho cuando: `npm test -- guardias` verde (04 sin regresión) + manual: Admin ve General sin aparecer, `/mi-resultado` deniega.

- [ ] T-13 Pete/tema/móvil + puerta final
  - Cubre: RF-20, E-17.
  - Verificar `img↔imgPete/nombre↔nombrePete` por cookie, `Maider/Páter/username` invariantes, tema claro/oscuro, 360-430px sin scroll-x, táctiles ≥44px. Cargar skill `mobile-native` antes de pulir.
  - Hecho cuando: `npx tsc --noEmit` 0 errores y cero `any` + `npm run lint` 0 warnings + `npm test` verde con 100% en `src/lib/resultados/**` + `npm run build` verde + revisión `break-ui` sin scroll-x.
