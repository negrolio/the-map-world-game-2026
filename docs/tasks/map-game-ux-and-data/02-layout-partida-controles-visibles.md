# Tarea: Layout de partida — mapa a pantalla completa con UI superpuesta mínima

| Campo | Valor |
|--------|--------|
| **ID** | MAP-UX-02 |
| **Prioridad** | P0 |
| **Estimación** | 4–8 h (según granularidad de overlay y tests) |
| **Dependencias** | MAP-UX-01 (zoom/pan/reset operativos; el usuario debe poder desplazar la vista si una zona queda bajo la UI) |

## Objetivo

En la vista **Partida (mapa)** (`currentView === 'game'`), el **mapa ocupa toda la pantalla** (viewport de la app: alto y ancho útiles, sin “cinta” de página debajo del mapa).

Sobre el mapa, en una o varias capas **armoniosas** (bordes, bandas semitransparentes o chips), se muestra **solo lo indispensable** para que el juego continúe:

- **Número de ronda** (o equivalente claro de progreso).
- **Objetivo a adivinar** (país o capital según modo).
- **Turno del jugador** activo.
- **Puntaje** (por jugador o resumen compacto acordado con HUD existente).
- **Controles del mapa** ya previstos en MAP-UX-01: **zoom +**, **zoom −**, **restablecer vista** (pueden vivir en el overlay si mejora la composición, siempre accesibles).
- **Acciones de flujo**: **Siguiente pregunta** / **Ver resultado final** cuando corresponda; acceso a **Setup** y **Home** (iconos o texto compacto, sin duplicar navegación innecesaria).
- **Feedback mínimo** de acierto/error (una línea, badge o estado visual breve).

La **interacción con el mapa** (pan/zoom) compensa el hecho de que parte del territorio pueda quedar **debajo** de paneles del overlay: el jugador puede mover y acercar la vista para hacer clic en cualquier país jugable.

## Contexto en repo

- `src/App.tsx`: rama `game` + `playing` — hoy suele apilar header, `WorldMap` y bloques de acción en flujo vertical.
- `src/components/WorldMap.tsx`: mapa con viewport interno (zoom/pan).
- `src/components/GamePlayersHud.tsx`: puntajes y jugadores; MAP-UX-03 puede refinar la presentación, pero MAP-UX-02 debe dejar **lectura clara de turno y puntaje** en el patrón overlay (o integración explícita con el HUD dentro del shell de pantalla completa).

## Alcance

1. **Shell de partida a pantalla completa:** contenedor raíz de la vista `game` con `100dvh` / `100svh` (o patrón equivalente estable en iOS) y `overflow: hidden` a nivel de página durante la partida, de modo que **no haya scroll vertical de documento** por contenido de juego.
2. **Capas:** mapa como **fondo edge-to-edge**; encima, overlay(s) con `z-index` y espaciado coherentes (safe-area para notch).
3. **Contenido mínimo** listado arriba, distribuido sin saturar el centro del mapa si es posible (p. ej. banda superior + esquina o barra inferior compacta).
4. **Zoom/pan como “válvula de escape”:** documentar en UI o en comentario de componente que, si un país queda tapado, el usuario debe poder **pan + zoom** para exponerlo (MAP-UX-01 ya lo habilita).
5. **Debug** (“último clic ISO2”, etc.): solo en `import.meta.env.DEV`, toggle, o fuera del overlay principal.
6. **Accesibilidad:** orden de foco lógico entre controles del overlay y el mapa; `aria-live` para cambios de ronda/resultado sin duplicar ruido.

## Fuera de alcance

- Implementación interna de zoom/pan (MAP-UX-01), salvo **reubicación visual** de los mismos botones dentro del overlay.
- Rediseño profundo del modelo de datos del HUD (MAP-UX-03 puede afinar `<details>` móvil o compactación si aún aplica).

## Criterios de aceptación

- [x] En **375×667** y **1280×800**, la vista de partida muestra el mapa **ocupando todo el viewport** visible de la app (sin franja de layout “vacía” bajo el mapa por scroll de página).
- [x] Sin **scroll de página** durante `playing` por el contenido esencial de juego (solo excepciones documentadas, p. ej. teclado virtual).
- [x] Son visibles de forma inmediata: **ronda**, **objetivo (país/capital)**, **turno**, **puntaje** (o resumen acordado), **Siguiente** / **resultado** cuando aplique, **Setup**, **Home**, controles **zoom ±** y **reset**, y **feedback** mínimo de acierto/error.
- [x] La composición es **armoniosa** (alineación, contraste legible sobre mapa, safe-area).
- [x] Con pan/zoom, el usuario puede **seleccionar un país** aunque inicialmente quede parcialmente bajo la UI (comportamiento verificable manualmente en 2–3 países).
- [x] `GamePlayersHud` no obliga a expandir `<details>` para saber el turno **si** MAP-UX-03 ya está hecho; si MAP-UX-02 va sola, el turno debe leerse en el overlay mínimo o en el HUD sin empeorar el shell pantalla completa. *MAP-UX-02 va sola: el turno aparece como subtítulo en la banda superior (`data-testid="active-turn-player"`) cuando aún no hay respuesta; el HUD móvil mantiene `<details>` y se refina en MAP-UX-03 (Fase 3).*
- [x] Tests en `src/App.test.tsx` o e2e (`e2e/smoke.spec.ts`) actualizados si cambian `data-testid`, rutas visibles o jerarquía de foco.

## Orden sugerido

Después de **MAP-UX-01**; antes o en paralelo con **MAP-UX-03** según si el puntaje/turno queda resuelto íntegramente en MAP-UX-02 o se delega refinamiento a MAP-UX-03.

---

## Notas de cierre — Fase 2 (2026-05-08)

### Decisiones técnicas

- **Shell**: rama `playing` en `App.tsx` usa `<main>` con `class="relative h-screen w-screen overflow-hidden"` y `style={{ height: '100dvh' }}` (fallback a `100vh` para navegadores sin `dvh`). Un `useEffect` adicional fija `document.body/html` `overflow:hidden` mientras dura la partida (cinturón + tirantes para Mobile Safari/iOS).
- **Capas (orden DOM = orden de foco con Tab)**:
  1. `data-testid="game-overlay-top"` (banda superior, `pointer-events-auto`): pill *Partida (mapa)* + `round-counter` compacto + nav `Setup/Home` + `round-prompt` + `active-turn-player` + `guess-feedback`/`guessSubmitError`/`antiCheatNotice`.
  2. `WorldMap` en `fullBleed` (`absolute inset-0 z-0`).
  3. `data-testid="game-overlay-bottom"` (banda inferior, `pointer-events-auto`): `GamePlayersHud` + acción primaria *Siguiente / Ver resultado final*.
- **Mapa edge-to-edge**: `WorldMap` recibe nueva prop `fullBleed` que descarta `max-w-4xl`, `rounded-xl`, `border` y `max-h-[min(70vh,520px)]` y hace que el SVG llene el contenedor (`h-full w-full`).
- **Zoom +/-/reset**: en modo `fullBleed` los controles se posicionan `absolute right-3 top-1/2 -translate-y-1/2` apilados verticalmente, fuera del cono de la banda superior y de la inferior. No hay duplicación con el overlay: estos botones son la única superficie de zoom en la UI.
- **Pan/zoom como válvula de escape**: documentado en JSDoc de `WorldMap.tsx` (sección F2.6) y en el texto `sr-only` de instrucciones para lectores. El comportamiento sigue habilitado incluso con `answerLocked`.
- **Debug**: el bloque `Último clic — ISO2 (TopoJSON)` y el estado `lastClickedCountryCode` se eliminaron por completo (decisión de producto: no se requería en producción y los tests no dependían de él).
- **A11y / live regions**: `guess-feedback`, `antiCheatNotice` y el anuncio sr-only del HUD usan `aria-live="polite"`/`role="status"`/`role="alert"`. Sin duplicación de mensajes simultáneos. `h1 "Mapa mundial — 110m"` queda `sr-only` para preservar jerarquía y compatibilidad con tests existentes.

### Tests automatizados

- `npm run test`: 81 tests, 15 archivos. Incluye nuevos tests en `src/App.test.tsx`:
  - `renderiza el shell de partida full-screen con bandas top y bottom (MAP-UX-02)`
  - `expone navegacion compacta a Setup y Home en la banda superior (F2.4)`
  - `quita el bloque debug "Ultimo clic ISO2" de la vista de partida (F2.8)`
  - `rendera el mapa en modo full-bleed dentro del shell (F2.2)`
- `npx playwright test`: 2 tests verdes, agregado `partida en pantalla completa: shell + overlay top/bottom + sin scroll de pagina` que valida en navegador real:
  - presencia de `game-shell`, `game-overlay-top`, `game-overlay-bottom`,
  - `data-fullbleed="true"` en `world-map-root`,
  - `documentElement.scrollHeight - clientHeight ≤ 1` (sin scroll de documento),
  - ausencia del `data-testid="map-click-feedback"`.

### Pendiente conocido

- **MAP-UX-03 (Fase 3)**: el HUD móvil usa lista compacta siempre visible (sin `<details>`). F2.3 sigue complementando con el subtítulo de turno en la banda superior. Revisar contraste y alineación en la banda inferior si se itera el layout.
- **QA manual**: verificar en dispositivo físico iOS Safari que `100dvh` no deja hueco al colapsar/expandir la barra de URL; el fallback a `100vh` está disponible si hace falta retoque.
