# Tarea: Layout de partida — prompt y acciones sin scroll obligatorio

| Campo | Valor |
|--------|--------|
| **ID** | MAP-UX-02 |
| **Prioridad** | P0 |
| **Estimación** | 2–5 h |
| **Dependencias** | Recomendado después de MAP-UX-01 (mapa con tamaño estable en contenedor) |

## Objetivo

En la vista **Partida (mapa)** (`currentView === 'game'`), el usuario debe ver **sin desplazarse por la página** (en viewports móvil y desktop típicos):

- El **prompt** de la ronda (incluido el nombre del país o capital según modo).
- La acción principal **Siguiente pregunta** / **Ver resultado final** cuando corresponda.
- Feedback mínimo de acierto/error (al menos una línea o badge).

Hoy el bloque de acciones está **debajo** del `WorldMap` en `src/App.tsx`, lo que empuja el CTA fuera del primer viewport en muchos casos.

## Contexto en repo

- `src/App.tsx` (rama `game` + `playing`): `<header>…</header>`, luego `<WorldMap />`, luego `<div>` con botones.
- Texto de “último clic ISO2” ocupa espacio vertical útil en mobile.

## Alcance

1. Reorganizar layout en **columnas o grid**: área “juego” (mapa) con altura acotada + **barra inferior o lateral** con CTAs primarios.
2. En mobile: considerar **barra fija inferior** (`sticky`/`fixed`) con botón principal y secundarios colapsados o en menú, sin tapar geometrías críticas del mapa sin padding.
3. Compactar o relegar a “detalle” / texto secundario: línea de debug “Último clic — ISO2…” (útil en dev; opcional `import.meta.env.DEV` o toggle).
4. Mantener accesibilidad: orden de foco lógico; `aria-live` en feedback de ronda sin duplicar ruido.

## Fuera de alcance

- Implementación interna de zoom/pan (MAP-UX-01), salvo ajustes de contenedor compartidos.
- Rediseño del listado de jugadores (MAP-UX-03).

## Criterios de aceptación

- [ ] En iPhone SE / 375×667 simulado: sin scroll de página, son visibles **prompt completo** + **mapa** + **botón Siguiente** cuando `roundGuess` está presente.
- [ ] Misma condición con **solo** estado “responder”: visible prompt + mapa + hint de “clic en mapa” (puede ser una sola línea compacta).
- [ ] `GamePlayersHud` no obliga a expandir `<details>` para entender de quién es el turno si MAP-UX-03 ya está hecho; si esta tarea va sola, al menos no empeorar el scroll total.
- [ ] Tests en `src/App.test.tsx` o e2e (`e2e/smoke.spec.ts`) actualizados si cambian `data-testid` o flujos visibles.

## Orden sugerido

Después de **MAP-UX-01**; en paralelo o justo antes de **MAP-UX-03** según carga del equipo.
