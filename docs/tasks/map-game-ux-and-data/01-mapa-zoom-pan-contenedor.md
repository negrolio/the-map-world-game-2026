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

- Composicion del **shell pantalla completa** y del **overlay** de partida (ver `02-layout-partida-controles-visibles.md`); MAP-UX-01 debe seguir permitiendo pan/zoom fiable para que el overlay no bloquee de forma permanente zonas del mapa.
- Cambios en `GamePlayersHud` (ver `03-hud-jugadores-intuitivo.md`).

## Criterios de aceptación

- [x] En viewport típico (375px y 1280px), el mapa no desborda el contenedor; pan/zoom ocurre **solo** dentro de él.
- [ ] Con zoom ≠ 100%, un clic en un país sigue disparando `onCountryClick` con el ISO2 esperado en casos de prueba manual (AR, BR, FR del dataset reducido o muestra acordada). *Cubierto en parte por tests; falta spot-check manual explícito en build.*
- [x] Con `answerLocked` / feedback activo, no se puede “jugar” de forma ambigua (clic bloqueado como hoy; pan/zoom puede permitirse o bloquearse, pero comportamiento documentado en el componente).
- [x] Controles de zoom y reset tienen `aria-label` y foco visible.
- [x] `npm run test` pasa con tests nuevos o actualizados para `WorldMap` / integración mínima.

## Notas técnicas (orientación)

- Evaluar envolver el mapa en un grupo con `transform` CSS o transform SVG; si se usa `react-simple-maps`, revisar patrones de `ZoomableGroup` si el API del paquete lo expone en la versión instalada.
- Cuidar **accesibilidad**: no robar foco de `Geography` sin alternativa clara.

## Orden sugerido en el epic

Ejecutar **primero** respecto a MAP-UX-02 y MAP-UX-03: MAP-UX-02 asume mapa **a pantalla completa** con UI superpuesta; el zoom/pan de MAP-UX-01 permite **revelar** geografias que queden bajo bandas o chips del overlay.

---

## QA manual — cierre Fase 1 (MAP-UX-01)

Pasada en **2026-05-08** con app en `npm run dev` (`http://127.0.0.1:5173/`), flujo home → setup → partida, viewports **1280×800** y **375×667**.

### Hallazgos

- **Controles y mapa:** En ambos viewports aparecen **Acercar mapa**, **Alejar mapa** y **Restablecer vista del mapa** en el árbol de accesibilidad; la región “Mapa interactivo de países” sigue presente. Tras **Acercar**, el mapa expone los destinos “Seleccionar …” por país (comportamiento esperado al zoom).
- **Bloqueo / feedback:** Decisión acordada: con `answerLocked` o feedback de ronda (`mapFeedback`), **no** se responde por país, pero **sí** se puede explorar con pan/zoom; queda documentado en `WorldMap.tsx`.
- **Setup → partida:** Si el entorno de prueba requiere scroll antes de interactuar con el mapa, MAP-UX-02 debe converger a **partida sin scroll de documento** con mapa a pantalla completa; MAP-UX-01 no sustituye ese shell.

### Checklist repetible (manual)

1. **Contenedor:** Con zoom al máximo y pan al extremo, el SVG **no desborda** el borde redondeado del mapa; no aparece scroll horizontal de página por el mapa.
2. **Botones:** **Acercar** / **Alejar** / **Restablecer** responden y el zoom queda entre el mínimo y el máximo definidos en código (`VIEWPORT_LIMITS`).
3. **Rueda:** Sobre el viewport del mapa, la rueda **cambia zoom** y **no** desplaza la página (`preventDefault` en el nodo del mapa).
4. **Pan:** Arrastrar dentro del mapa mueve la vista; **soltar y hacer clic** sin arrastre sigue seleccionando país (no “falso” por drag).
5. **Clic con zoom:** Con zoom ≠ 1, clic en **2–3 países conocidos** (p. ej. AR, BR, JP) y comprobar ISO2 en “Último clic” / lógica de ronda.
6. **Locked:** Tras responder, **no** debe registrarse nuevo intento por clic en país; pan/zoom **sí** deben seguir funcionando.
7. **Teclado:** Tab hasta un país; **Enter** o **espacio** dispara la misma resolución que el clic (solo si no está locked).
8. **Móvil real (opcional):** Probar **pinch** y **pan con un dedo** en dispositivo físico; el MCP de escritorio no sustituye tacto.

### Automatizado

- `npm run test` (incluye `src/components/WorldMap.test.tsx` y `App.test.tsx`).
