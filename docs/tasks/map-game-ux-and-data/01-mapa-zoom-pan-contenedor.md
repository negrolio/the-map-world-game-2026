# Tarea: Mapa con zoom y pan dentro del contenedor

| Campo | Valor |
|--------|--------|
| **ID** | MAP-UX-01 |
| **Prioridad** | P0 |
| **Estimación** | 3–6 h |
| **Dependencias** | Ninguna (base para MAP-UX-02) |

## Objetivo

Permitir **acercar/alejar** y **arrastrar** el mapa dentro de su contenedor fijo, sin perder la capacidad de **seleccionar país** por clic (y teclado donde ya exista), respetando el bloqueo cuando `answerLocked` / feedback de ronda.

## Contexto en repo

- `src/components/WorldMap.tsx`: `ComposableMap` con `projectionConfig` fijo; contenedor con `overflow-hidden`.
- `src/App.tsx`: pasa `mapFeedback`, `onCountryClick`, bloqueo vía props del mapa.

## Alcance

1. Contenedor con altura máxima definida (viewport o `min(70vh, …)` coherente con el diseño actual).
2. Transformación de vista: **escala (zoom)** y **traslación (pan)** aplicadas al SVG o a un wrapper interno (no al scroll de página).
3. Controles accesibles: al menos **zoom + / −** y **restablecer vista**; opcional: rueda del ratón / pinch con límites de zoom.
4. Durante pan/zoom, los clics deben seguir resolviendo el país correcto (coordenadas invertidas respecto a la transformación).
5. Respetar `locked` (sin iniciar pan si eso interfiere con clic; documentar decisión: ej. botón “mover mapa” vs gesto solo con espacio o con botón medio).
6. Tests: Vitest + Testing Library donde sea viable (p. ej. botones de zoom cambian atributos/transform; smoke de que el root sigue existiendo).

## Fuera de alcance

- Rediseño completo del layout de partida (ver `02-layout-partida-controles-visibles.md`).
- Cambios en `GamePlayersHud` (ver `03-hud-jugadores-intuitivo.md`).

## Criterios de aceptación

- [ ] En viewport típico (375px y 1280px), el mapa no desborda el contenedor; pan/zoom ocurre **solo** dentro de él.
- [ ] Con zoom ≠ 100%, un clic en un país sigue disparando `onCountryClick` con el ISO2 esperado en casos de prueba manual (AR, BR, FR del dataset reducido o muestra acordada).
- [ ] Con `answerLocked` / feedback activo, no se puede “jugar” de forma ambigua (clic bloqueado como hoy; pan/zoom puede permitirse o bloquearse, pero comportamiento documentado en el componente).
- [ ] Controles de zoom y reset tienen `aria-label` y foco visible.
- [ ] `npm run test` pasa con tests nuevos o actualizados para `WorldMap` / integración mínima.

## Notas técnicas (orientación)

- Evaluar envolver el mapa en un grupo con `transform` CSS o transform SVG; si se usa `react-simple-maps`, revisar patrones de `ZoomableGroup` si el API del paquete lo expone en la versión instalada.
- Cuidar **accesibilidad**: no robar foco de `Geography` sin alternativa clara.

## Orden sugerido en el epic

Ejecutar **primero** respecto a MAP-UX-02 y MAP-UX-03 (layout y HUD pueden asumir un mapa ya “encajado” en un panel).
