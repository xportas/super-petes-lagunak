# DESIGN.md — Super Petes Lagunak · Neo-Brutalist Fantasy Court

Fuente visual: paquete Stitch `stitch_lagunak_fantasy_basketball_ui.zip`
(`neo_brutalist_fantasy_court/DESIGN.md` + pantallas `mi_alineaci_n`,
`ficha_de_jugador`, `clasificaci_n` con `code.html` y `screen.png`).
Adaptado a las reglas de negocio de este repo (`README.md §0`,
`CONSTITUTION.md`, `AGENTS.md`). En caso de conflicto, ganan las reglas.

## 1. Identidad y principios

Estética **Pop Neo-Brutalism**: cultura streetball + marcador arcade +
cromo coleccionable, con los colores del C.B. Lagunak
(amarillo pista `#FFD600`, negro tinta `#1C1B1B`).

- **Sombras isométricas duras, sin blur gaussiano.** Profundidad solo con
  offsets sólidos `2px`, `3px`, `4px` y `6px` en negro tinta.
- **Bordes estructurales gruesos.** `2px`–`3px solid` en cada tarjeta,
  botón, input, badge y avatar.
- **Acentos eléctricos.** Amarillo `#FFD600` como primario, verde lima
  `#3FFF8B` / `#62FF96` para bonus positivo y disponible, coral-rojo
  `#BD0042` / `#FFCDD1` para racha negativa, lesión, expulsión y zona roja.
- **Física táctil de pulsación.** Al presionar (`:active`), el elemento se
  comprime en diagonal `translate(2px, 2px)` o `translate(3px, 3px)` y su
  sombra cae a `0 0 0`. Transición `120ms cubic-bezier(0.23, 1, 0.32, 1)`.
  Con `prefers-reduced-motion: reduce` se anula el desplazamiento.
- **Solo móvil `360px–430px`.** Interacción única `tap-to-select + lista`.
  Prohibido drag & drop. Objetivos táctiles `≥ 44×44px`. Tipografía
  `Space Grotesk` para display y `Plus Jakarta Sans` para cuerpo.
- **Modo Pete cosmético.** Toda vista respeta `img ↔ imgPete` y
  `nombre ↔ nombrePete`. Las reglas nunca cambian.

## 2. Paleta (tokens semánticos)

Los nombres siguen a Stitch. En Tailwind v4 se exponen como
`bg-surface`, `bg-surface-container-lowest`, `text-on-surface`,
`bg-primary-container`, etc. (ver `src/app/globals.css`).

### 2.1 Superficies — Light Mode (defecto, fiel a Stitch)

| Token | Valor | Uso |
|---|---|---|
| `surface` / `background` | `#FCF9F8` | Fondo app y cabeceras translúcidas |
| `surface-container-lowest` | `#FFFFFF` | Tarjetas principales, cromos, slots |
| `surface-container-low` | `#F6F3F2` | Secundarias, pozos, toggles off |
| `surface-container` | `#F0EDEC` | Pozos de datos, barras |
| `surface-container-high` | `#EBE7E7` | Pista, inactivos, badges neutros |
| `surface-container-highest` | `#E5E2E1` | Contraste alto neutro |
| `surface-dim` | `#DCD9D9` | Divisores suaves |

### 2.2 Superficies — Dark Mode «Night Court» (`html.dark`)

| Token | Valor | Uso |
|---|---|---|
| `surface` / `background` | `#121212` | Fondo app |
| `surface-container-lowest` | `#1E1D1D` | Tarjetas principales |
| `surface-container-low` | `#252424` | Secundarias |
| `surface-container` | `#2C2A2A` | Pozos de datos |
| `surface-container-high` | `#353232` | Pista, inactivos |
| `surface-container-highest` | `#403D3D` | Contraste alto neutro |
| `surface-dim` | `#2A2929` | Divisores suaves |

### 2.3 Tinta, bordes y sombras

| Token | Light | Dark | Uso |
|---|---|---|---|
| `on-surface` | `#1C1B1B` | `#F6F3F2` | Texto principal, bordes |
| `on-surface-variant` | `#4D4632` | `#C9C0A8` | Texto secundario |
| `ink-border` | `#1C1B1B` | `#F6F3F2` | `border-color` estructural |
| `ink-shadow` | `#1C1B1B` | `#000000` | `box-shadow` dura |
| `inverse-surface` | `#313030` | `#EDE8E2` | Chips inversos negros |
| `outline` / `outline-variant` | `#7F775F` / `#D0C6AB` | `#A89D83` / `#4A4436` | Bordes suaves |

En Dark los bordes estructurales usan `on-surface` (`#F6F3F2`) y la sombra
dura usa `#000000`. Los destacados pueden bordear en `#FFD600`.

### 2.4 Acentos (ambos temas, mismos valores que Stitch)

| Token | Valor | Uso |
|---|---|---|
| `primary-container` (amarillo Lagunak) | `#FFD600` | CTAs, activos, capitán, hero, podio 1º |
| `primary-fixed` | `#FFE170` | Fondos amarillos suaves |
| `on-primary-fixed` | `#221B00` | Texto sobre amarillo |
| `primary` | `#705D00` | Texto/acentos marrones |
| `inverse-primary` | `#E9C400` | Hover/active amarillo |
| `secondary-container` (lima) | `#3FFF8B` | Bonus `+5`, disponible, racha `0`, activo |
| `secondary-fixed` | `#62FF96` | Pills verdes claras |
| `secondary` | `#006D35` | Texto verde oscuro |
| `on-secondary-fixed` / `on-secondary-container` | `#00210B` / `#007237` | Texto sobre lima |
| `tertiary` (coral-rojo) | `#BD0042` | Lesión, expulsión, racha `−N`, zona roja |
| `tertiary-container` | `#FFCDD1` | Fondos de alerta |
| `on-tertiary-container` | `#BE0042` | Texto sobre rosa |
| `error` | `#BA1A1A` | Errores de formulario |

## 3. Tipografía (`next/font/google`)

- **Display (`Space Grotesk`, `700`)**: títulos, contadores, badges.
  Variables CSS `--font-display`.
- **Cuerpo (`Plus Jakarta Sans`, `500/600/700`)**: datos y párrafos.
  Variable `--font-sans`.
- Contadores (`stat-counter`) siempre con
  `font-variant-numeric: tabular-nums` para no vibrar en live.
- Micro-etiquetas (`badge-label`) siempre en mayúsculas con
  `letter-spacing: 0.06em`.

| Estilo | Fuente | Tamaño / Alto / Tracking / Peso |
|---|---|---|
| `display-hero-mobile` | Space Grotesk | `32px / 36px / -0.03em / 700` |
| `headline-lg` | Space Grotesk | `28px / 32px / -0.02em / 700` |
| `headline-md` | Space Grotesk | `22px / 26px / -0.01em / 700` |
| `headline-sm` | Space Grotesk | `18px / 22px / 0 / 700` |
| `stat-counter` | Space Grotesk | `24px / 28px / -0.02em / 700` |
| `body-lg` | Plus Jakarta Sans | `16px / 22px / -0.01em / 600` |
| `body-md` | Plus Jakarta Sans | `14px / 20px / 0 / 500` |
| `body-sm` | Plus Jakarta Sans | `12px / 16px / 0.01em / 500` |
| `badge-label` | Space Grotesk | `11px / 12px / 0.06em / 700` uppercase |
| `caption` | Plus Jakarta Sans | `10px / 14px / 0.02em / 600` |

Inputs (`input, select, textarea`) mínimo `16px` para no disparar el zoom
de iOS. Regla dura de `mobile-native`: jamás `user-scalable=no`.

## 4. Elevación, geometría y espaciado

### Niveles (sin blur)

- **Level 0 (plano / slot vacío):** `border: 2px solid ink;` sin sombra.
- **Level 1 (tarjeta estándar):** `border: 2.5px solid ink; box-shadow: 3px 3px 0 ink;`
- **Level 2 (CTA, starter, hero, capitán):** `border: 3px solid ink; box-shadow: 4px 4px 0 ink;`
- **Level 3 (bottom sheet, modal):** `border: 3px solid ink; box-shadow: 6px 6px 0 ink;`
- **Pulsado:** `transform: translate(2px/3px, 2px/3px); box-shadow: 0 0 0 ink;`

### Geometría

- Tarjetas y sheets: `rounded-xl` (`12px`) — en Tailwind v4 de este repo
  `rounded-xl` equivale a `0.75rem` por el preset de Stitch.
- Botones e inputs: `rounded-lg` (`8px`).
- Badges de posición y pills: `rounded-full` con borde `1.5px–2px`.
- Avatares: marcos cuadrados `rounded-xl` con borde `2px` y sombra `2px`,
  foto circular interior `rounded-full` cuando es retrato (pista, lista).

### Espaciado móvil

- Lienzo `min-w-[360px] max-w-[430px]`, margen lateral `16px` (`px-4`),
  ritmo vertical `12px–16px` (`gap-3` / `gap-4`).
- Contenedores con sombra dura reservan `≥ 6px` de holgura inferior-derecha
  para no recortar la sombra en scroll.
- Barra inferior fija reserva `80px` sobre el home indicator
  (`pb-[calc(0.375rem+env(safe-area-inset-bottom))]` + `pb-28` en `main`).

## 5. Componentes del dominio

### 5.1 Botones

- **Primario (`.brutal-btn-primary`):** fondo `primary-container`, texto
  `on-primary-fixed`, `Space Grotesk` bold uppercase, Level 2.
- **Secundario lima (`.brutal-btn-secondary`):** fondo
  `secondary-container`, Level 1. Confirmaciones positivas.
- **Peligro (`.brutal-btn-danger`):** fondo `tertiary`, texto blanco,
  Level 1. Cerrar sesión, dar de baja, vaciar.
- **Fantasma (`.brutal-btn-ghost`):** fondo `surface-container-lowest`,
  Level 1 sin sombra hasta `:hover`/`:active`.
- Todos `min-h-[44px]`, `touch-action: manipulation`,
  `user-select: none`, `:active` con compresión diagonal.

### 5.2 Tarjetas y badges

- **Starter Card (`.brutal-card` / `.brutal-card-lg`):** fondo
  `surface-container-lowest`, `rounded-xl`, Level 1/2. Acento izquierdo
  negro por posición (`B/E/A/AP/P`), foto con borde `2px`, sello de
  valoración (`VAL` en lima si positivo, neutro si `0`, coral si negativo).
- **Position Chip (`.brutal-chip-pos`):** pill negra `inverse-surface`,
  texto blanco `11px` uppercase.
- **Status Pill:** disponible `secondary-fixed`, lesionado/baja
  `tertiary-container`, racha `−N` en `tertiary-container`, capitán en
  `primary-container`.
- **Hazard bar (`.brutal-hazard-bar`):** cinta rayada `45deg`
  `#FFD600/#111111` de `12px` sobre cromos y heroes.

### 5.3 Formularios y sheets

- **Input (`.brutal-input`):** fondo `surface-container-lowest`,
  `2.5px solid ink`, sombra `3px`, `rounded-lg`, `min-h-[44px]`,
  `text-base (16px)`. Foco: borde `3px`, fondo `#FFFFFA` en light.
- **Segmented / filtros:** pista `surface-container-low` con borde `2px`;
  pestaña activa en `primary-container` con sombra `2px`.
- **Checkbox brutalista:** `24×24px`, `2.5px solid ink`, checked en lima
  con check negro grueso.
- **Bottom sheet (`.brutal-sheet`):** Level 3, `rounded-t-2xl`,
  `max-h-[80dvh]`, `overscroll-behavior: contain` en la lista interior.

## 6. Mapeo pantalla a pantalla (Stitch → app real)

| Pantalla Stitch | Pantalla app | Adaptación aplicada |
|---|---|---|
| `mi_alineaci_n` banner + botones | `/equipo` `EquipoEditor` | Banner brutalista de jornada/cierre; chips `5/5`, entrenador, capitán; CTA `Guardar quinteto`; sin `PROJ` ni `Auto-Optimizar` |
| `mi_alineaci_n` media pista SVG + 5 nodos | `/equipo` pista táctica | Mismo SVG de media pista; 5 nodos por slot `B/E/A/AP/P` con foto real, badge posición, badge capitán y chip de modificador; tap abre `SelectorJugadores` |
| `mi_alineaci_n` tarjeta entrenador | `/equipo` `SelectorEntrenador` | Dos tarjetas Maider/Páter con foto real `/coaches/*.webp`, info del modificador y estado `ACTIVO` |
| `mi_alineaci_n` banquillo + `Meter` | `/equipo` `SelectorJugadores` | Bottom sheet Level 3 con filtros `TODOS/B/E/A/AP/P`, toggle disponibles y lista brutalista; sin botón `Meter` directo |
| `ficha_de_jugador` cromo | `/jugadores/[id]` `FichaCabecera/Media/Estado` | Cromo con hazard bar, chip dorsal/posiciones, foto grande, descripción, sellos `VAL MED` y última valoración, pills sanitario/racha |
| `ficha_de_jugador` últimos 5 | `/jugadores/[id]` `FichaEvolucion/GraficaEvolucion` | Gráfica SVG brutalista + filas por jornada con barra proporcional y sello de valoración |
| `ficha_de_jugador` barra `Capitán/Alinear` | — | No se replica: capitán solo vive en `/equipo` |
| `clasificaci_n` hero `#4` + podio + lista | `/clasificacion` | Hero personal con sello `#N` + chip `TÚ`; podio Top 3 a 3 alturas (oro/plata/bronce); lista completa con medalla y zona roja |
| Home (no estaba en ZIP) | `/` | Hero brutalista de jornada/cierre + Top 3 managers + Top 3 jugadores + CTA plantilla, mismo lenguaje |
| `mi-resultado` (no estaba en ZIP) | `/mi-resultado` | Destacada + desglose por línea con pills `BASE/efecto/+pos/racha/subtotal` y sello `TOTAL`, mismo lenguaje |
| `/normas`, `/ajustes`, auth, onboarding, admin | — | Acordeones, interruptores, inputs y tabs con el mismo sistema (ver §7) |

## 7. Reglas por ruta

- `/` Home: hero `brutal-card-lg` con cinta hazard, cuenta atrás tabular
  con punto pulsante, bloque partido con pills rival/fecha/pabellón y `?`
  hacia `/normas#cierre`; tops con insignias `#1/#2/#3`.
- `/equipo`: banner jornada/cierre, chips de completitud, media pista SVG,
  slots `Starter Card`, entrenador dual Maider/Páter, CTA guardar,
  bottom sheet de jugadores.
- `/jugadores`: filas-cromo compactas con foto `52px`, chip dorsal/pos y
  badge sanitario.
- `/jugadores/[id]`: cromo grande + sellos + gráfica + filas de evolución.
- `/mi-resultado`: destacada + acordeones de historial con desglose
  `BASE → efecto → +pos → racha → subtotal`, chips `MVP/expulsión` y sello
  `TOTAL`.
- `/clasificacion`: banner, hero personal, podio Top 3, lista con medalla
  oro/plata/bronce, fila propia destacada y zona roja coral.
- `/normas`: un `<details class="brutal-card">` por bloque
  (`#cierre #base #entrenadores #posicion #racha #mvp #expulsion #orden`),
  tabla de rachas con bordes `2px`, ejemplo Pete como mini-cromo.
- `/ajustes`: tarjeta `Normas del juego`, interruptores Pete/Tema,
  acordeón de contraseña, tarjeta de idioma, botón peligro de salir.
- Auth (`/login /registro /cambiar-password`): tarjeta central con hazard
  bar + escudo, `.brutal-input`, CTA primario, ayuda de reset.
- `/onboarding`: pills de paso, chips de posición, selector de entrenador,
  tarjeta de cierre `-3h`, checkbox brutalista.
- `/admin`: tabs segmentados, banner pendientes, formularios con
  `.brutal-card` + `.brutal-input` + CTAs.
- Errores/404: tarjetas de alerta brutalistas con CTA primario.

## 8. Accesibilidad y mobile-native

- `viewport-fit=cover` + `env(safe-area-inset-*)` en cabecera, nav y sheets.
- `100dvh` para shell y sheets; `overscroll-behavior: none` en raíz y
  `contain` en listas interiores.
- `-webkit-tap-highlight-color: transparent` global + `:active` propio.
- `hover` solo bajo `@media (hover: hover) and (pointer: fine)`.
- `touch-action: manipulation` en botones/enlaces; `pan-y` donde aplique.
- Foco visible en todos los CTAs; `aria-pressed/expanded/current` reales;
  iconos decorativos con `aria-hidden="true"`.
- Contraste: texto principal sobre amarillo usa `#221B00`; sobre lima usa
  `#00210B`; sobre coral usa `#BE0042`/`#FFFFFF` según fondo.

## 9. Prohibiciones (puerta de calidad visual)

- Nada de `user-scalable=no` / `maximum-scale=1`.
- Nada de `100vh` para shell o barras fijas (usar `100dvh`).
- Nada de `:hover` sin gate de `(hover: hover)`.
- Nada de `user-select: none` en `body` (solo controles).
- Nada de textos visibles fuera de `es/strings.json`.
- Nada de números de reglas fuera de `src/lib/scoring/constantes.ts`
  + `{var}` i18n (ver `src/app/normas/normas-vars.test.ts`).
- Nada de clases con literales de regla en `src/app/normas/*.tsx`
  (`gap-5`, `p-5`, `w-10`, `h-10`, `z-10`, …) ni `+5`/`x1.5` en
  `src/app/mi-resultado/**` y `src/app/clasificacion/**`.
