# Tarea: Auto-zoom y centrado adaptativo post-respuesta

| Campo | Valor |
|--------|--------|
| **ID** | MAP-UX-07 |
| **Prioridad** | P1 |
| **Estimación** | 4–8 h |
| **Dependencias** | MAP-UX-01 (zoom/pan CSS), MAP-UX-05 (proyección por región), GameShell (cierre de ronda + `mapFeedback`) |

> **Doc de fuente única.** No se generan PRD/Plan aparte: este archivo es a la vez el
> **spec de "qué hay que hacer"** y el **registro de "qué se hizo"** (ver §Registro al final).
> Actualizarlo al cerrar la tarea en vez de crear docs nuevos.

## Objetivo

Al cerrar una ronda, mover la cámara para que el **país correcto** quede **centrado** y con un **tamaño aparente legible**, tanto en países grandes (Rusia, Canadá) como chicos (Andorra, Singapur), y en cualquier dispositivo. El país **errado no condiciona el encuadre** (su highlight rojo sigue, pero la cámara lo ignora).

## Cambio respecto al backlog

| Origen | Idea previa | Estado en esta tarea |
|--------|-------------|----------------------|
| `ideas-features-backlog.md` → "Mapa — auto-zoom post-respuesta (fit-bounds)" | Encuadrar **2–4 países** (errado + correcto) con `fit-bounds` | **Sustituida**: se centra **solo el correcto** + **gate de zoom** adaptativo. No se hace fit-bounds multi-país. |

## Decisiones de diseño (confirmadas)

1. **Centrado: siempre.** Al cerrar la ronda la cámara siempre hace pan al centro del país correcto.
2. **Zoom: condicional por gate.** El zoom **solo se ajusta** si el tamaño aparente del país cae **fuera de un "gate"** (banda aceptable). Si ya se ve bien dentro del gate, **se conserva el zoom actual del usuario** (solo pan).
3. **Animación: suave.** Transición pan+zoom ~300–500 ms hacia el encuadre. Respetar `prefers-reduced-motion` → movimiento instantáneo.
4. **Dependiente del dispositivo.** Gate y zoom objetivo distintos en táctil vs desktop, respetando `VIEWPORT_LIMITS` (`max: 4` desktop, `maxTouchUi: 22`).

## Modelo de cámara (orientación)

- **Tamaño aparente:** bbox proyectado del país, `max(ancho, alto)` en px del viewport, dividido por la **dimensión menor** del viewport → `ratioAparente`.
- **Gate `[GATE_MIN, GATE_MAX]`** (propuesta inicial a afinar: `0.22 – 0.65`) y `TARGET` (~`0.45`):
  - `ratioAparente < GATE_MIN` → **zoom in** hasta alcanzar `TARGET`.
  - `ratioAparente > GATE_MAX` → **zoom out** hasta alcanzar `TARGET`.
  - dentro del gate → **no tocar zoom**; solo pan al centro.
- **Centro:** centroide proyectado del **polígono de mayor área** del país (no el centroide global), para multipart (EE.UU., Rusia, Francia + Guayana). Manejar **antimeridiano** (Rusia, Fiji, Aleutianas) para no centrar en el océano.
- **Clamp** del zoom resultante a `VIEWPORT_LIMITS` según táctil/desktop.
- **Conversión a la capa transform CSS** (`offset`/`zoom`) reutilizando `applyZoomAroundPoint` y la relación proyección → SVG → contenedor que ya existe en `WorldMap.tsx`.

## Contexto en repo

- [`src/components/WorldMap.tsx`](../../../src/components/WorldMap.tsx): estado `viewport` (zoom/offset CSS), `VIEWPORT_LIMITS`, `applyZoomAroundPoint`, `transformLayerRef`/`viewportLiveRef` (doble vía DOM + React).
- [`src/components/world-map-baseline-viewport.ts`](../../../src/components/world-map-baseline-viewport.ts): proyección (`geoEqualEarth`, `scale 147`, `center`).
- [`src/features/game/GameShell.tsx`](../../../src/features/game/GameShell.tsx): arma `mapFeedback`, conoce el `target` (correcto) y el cierre de ronda. Cross-mode (country/capital/AI).

## Alcance

1. **Util nueva** (`src/components/world-map-focus-country.ts`): dado `iso2` objetivo + config de proyección + rect del viewport + límites de dispositivo → devuelve `{ zoom, offset }` destino (o "sin cambio de zoom" cuando cae dentro del gate).
2. **API en `WorldMap`** para recibir un objetivo de cámara (prop tipo `focusTarget` o comando imperativo) y aplicar la transición por el mismo camino que `setViewport` + `viewportLiveRef`.
3. **Animación:** transición temporal en la capa transform **solo durante el auto-move**; quitarla al terminar (o al primer `pointerdown`) para no degradar el gesto manual. `prefers-reduced-motion` → salto.
4. **GameShell** dispara el focus al cerrar la ronda con el país correcto, en los tres modos.
5. **Tests:** util (grande / chico / multipart / antimeridiano / dentro-de-gate) + `WorldMap` (aplica el transform destino) + `GameShell` (dispara focus al cerrar).

## Fuera de alcance

- Encuadrar el país errado o varios países (descartado, ver §Cambio respecto al backlog).
- Cambiar la proyección o el centrado por continente (eso es MAP-UX-05).

## Criterios de aceptación

- [x] Al cerrar una ronda, el país correcto queda **centrado** en el viewport (country/capital y AI).
- [x] Países **chicos** terminan con zoom suficiente para verse; **grandes** no quedan recortados ni excesivamente alejados.
- [x] Si la vista previa ya mostraba el país **dentro del gate**, el zoom **no cambia** (solo pan).
- [x] El movimiento es **animado y suave**; con `prefers-reduced-motion` es **instantáneo**.
- [x] El zoom destino respeta `VIEWPORT_LIMITS` en desktop (≤ 4) y táctil (≤ 22).
- [x] El auto-move **no rompe** el pan/zoom manual posterior (la transición temporal se limpia).
- [x] `npm run test` verde con tests nuevos.

## Riesgos y mitigaciones

- **Centroide en océano** (multipart / antimeridiano) → usar polígono de mayor área + manejo de 180°.
- **Interferencia animación vs gesto** → transición solo durante el auto-move, removida al terminar / al primer `pointerdown`.
- **Doble fuente de verdad del viewport** (`state` vs `viewportLiveRef`) → escribir el destino por el mismo camino que el pan/zoom existente.

## Registro de implementación (completar al cierre)

- **Estado:** completado (2026-06-05).
- **Estrategia:** medición del `<path data-iso>` ya renderizado (`getBoundingClientRect`) + función pura `computeFocusViewport` (sin reproyección d3-geo). Refina el modelo orientativo de §Modelo de cámara.
- **Archivos tocados:**
  - `src/components/world-map-focus-country.ts` (nuevo)
  - `src/components/world-map-focus-country.test.ts` (nuevo)
  - `src/components/WorldMap.tsx` (prop `cameraFocus`, efecto de cámara, animación)
  - `src/components/WorldMap.test.tsx` (tests de `cameraFocus`)
  - `src/features/game/GameShell.tsx` (disparo de `cameraFocus` al cerrar ronda)
  - `src/features/game/GameShell.test.tsx` (tests de cableado)
- **Gate / target finales:**
  - Desktop: `gateMin=0.22`, `gateMax=0.65`, `target=0.45`
  - Táctil (`touchUiZoom`): `gateMin=0.18`, `gateMax=0.7`, `target=0.5`
- **Animación:** interpolación de `zoom`/`offset` por `requestAnimationFrame` (easeOutCubic), escribiendo el `transform` en cada frame. **No** se usa transición CSS: en navegadores táctiles, fijar `transition`+`transform` de forma imperativa (incluso con reflow) coalescía el cambio y el mapa saltaba directo al destino sin animar. La interpolación por rAF es fiable en desktop y móvil. Duración dependiente del dispositivo: **620 ms** desktop, **820 ms** táctil (recorrido/zoom mayores). Un gesto manual (`pointerdown`/`wheel`) cancela la animación y sincroniza el estado con el frame visual actual para continuar sin saltos.
- **`prefers-reduced-motion`:** el auto-move **NO** lo respeta (desvío explícito de FR-3.2 / RF-A04). Se alinea con la decisión de producto ya tomada para los carteles de feedback/prompt (`src/styles/tokens.css`, 2026-05-28): el movimiento de cámara comunica dónde estaba el país correcto y debe percibirse incluso con el SO pidiendo reducir movimiento (causa concreta del bug en móvil: el ahorro de batería / "reducir movimiento" activaba `reduce` y la cámara saltaba mientras los carteles —que ya lo ignoran— sí animaban).
- **Limitación conocida (E4):** países multipart / antimeridiano (Rusia, Fiji, EE.UU.) — el bbox del path abarca todas las partes; el encuadre puede quedar amplio y el centro cerca del medio del bbox. Mejora futura: sub-path de mayor área.
- **QA manual pendiente de validación en dispositivo real:** desktop 1280×800 y móvil 375×667; países chico (AD/SG), grande (RU/CA), normal (AR/FR); zoom previo muy adentro/afuera; suavidad y pan posterior sin lag.
