---
name: Plan UX Data Iteracion
overview: Plan de ejecucion para implementar las 5 tasks nuevas de UX y datos del mapa sin mezclar con la TODO list general del MVP.
todos:
  - id: uxd-map-01
    content: Implementar MAP-UX-01 en WorldMap y validar click bajo transformaciones
    status: pending
  - id: uxd-layout-02
    content: Ajustar layout de partida para visibilidad de CTA sin scroll
    status: pending
  - id: uxd-hud-03
    content: Redisenar HUD movil para turno visible sin details
    status: pending
  - id: uxd-data-04
    content: Ampliar catalogo de paises y corregir tests dependientes
    status: completed
  - id: uxd-region-05
    content: Agregar reaccion visual por continente y enfoque inicial
    status: completed
isProject: false
---

# Plan de implementacion — Iteracion UX + Datos (MAP-UX-01..05)

## Objetivo
Implementar de forma incremental las tareas de UX y datos para mejorar jugabilidad, visibilidad de controles y cobertura del catalogo de paises, manteniendo compatibilidad con el flujo actual de partida y sus tests.

## Alcance de la iteracion
- `MAP-UX-01`: zoom/pan/reset en mapa dentro del contenedor.
- `MAP-UX-02`: layout de partida con prompt+mapa+CTA visibles sin scroll obligatorio.
- `MAP-UX-03`: HUD movil intuitivo con turno visible sin expandir `details`.
- `DATA-01`: catalogo de paises ampliado y validado contra mapa/topologia.
- `MAP-UX-05`: reaccion visual del mapa al continente activo (highlight + atenuacion + foco inicial).

## Archivos base a tocar
- [docs/tasks/map-game-ux-and-data/01-mapa-zoom-pan-contenedor.md](/Users/minecbook/Development/map-game/the-map-world-game-2026/docs/tasks/map-game-ux-and-data/01-mapa-zoom-pan-contenedor.md)
- [docs/tasks/map-game-ux-and-data/02-layout-partida-controles-visibles.md](/Users/minecbook/Development/map-game/the-map-world-game-2026/docs/tasks/map-game-ux-and-data/02-layout-partida-controles-visibles.md)
- [docs/tasks/map-game-ux-and-data/03-hud-jugadores-intuitivo.md](/Users/minecbook/Development/map-game/the-map-world-game-2026/docs/tasks/map-game-ux-and-data/03-hud-jugadores-intuitivo.md)
- [docs/tasks/map-game-ux-and-data/04-catalogo-paises-completo.md](/Users/minecbook/Development/map-game/the-map-world-game-2026/docs/tasks/map-game-ux-and-data/04-catalogo-paises-completo.md)
- [docs/tasks/map-game-ux-and-data/05-seleccion-continente-reactiva.md](/Users/minecbook/Development/map-game/the-map-world-game-2026/docs/tasks/map-game-ux-and-data/05-seleccion-continente-reactiva.md)
- [src/components/WorldMap.tsx](/Users/minecbook/Development/map-game/the-map-world-game-2026/src/components/WorldMap.tsx)
- [src/components/GamePlayersHud.tsx](/Users/minecbook/Development/map-game/the-map-world-game-2026/src/components/GamePlayersHud.tsx)
- [src/App.tsx](/Users/minecbook/Development/map-game/the-map-world-game-2026/src/App.tsx)
- [src/data/countries.ts](/Users/minecbook/Development/map-game/the-map-world-game-2026/src/data/countries.ts)
- [src/services/topology-country-click.ts](/Users/minecbook/Development/map-game/the-map-world-game-2026/src/services/topology-country-click.ts)
- [src/App.test.tsx](/Users/minecbook/Development/map-game/the-map-world-game-2026/src/App.test.tsx)
- [src/services/build-question-pool.test.ts](/Users/minecbook/Development/map-game/the-map-world-game-2026/src/services/build-question-pool.test.ts)

## Orden recomendado de ejecucion
1. `MAP-UX-01` (base de interaccion del mapa).
2. `MAP-UX-02` (mapa a pantalla completa + overlay mínimo armonioso; sin scroll de documento en partida).
3. `MAP-UX-03` (HUD movil sin friccion).
4. `DATA-01` (catalogo amplio + validaciones).
5. `MAP-UX-05` (reactividad por continente sobre mapa ya estabilizado).

## Estrategia tecnica por tarea
- **MAP-UX-01**
  - Introducir estado de viewport del mapa (escala y desplazamiento) con limites de zoom.
  - Agregar controles accesibles de zoom/reset y mantener seleccion de pais bajo transformacion.
  - Definir y documentar comportamiento cuando `locked` esta activo.
- **MAP-UX-02**
  - Shell de partida a pantalla completa (`100dvh`/`100svh` o equivalente): mapa edge-to-edge como capa base.
  - Overlay con solo lo indispensable: ronda, objetivo (país/capital), turno, puntaje, zoom/reset, siguiente/setup/home, feedback mínimo; composición armoniosa y safe-area.
  - Sin scroll de documento durante `playing`; pan/zoom (MAP-UX-01) como compensación si la UI tapa parte del mapa.
  - Debug y metadatos secundarios fuera del overlay principal o solo en modo dev.
- **MAP-UX-03**
  - Reemplazar `details` movil por un patron de lectura inmediata del turno activo (barra compacta o lista).
  - Conservar semantica accesible y comportamiento actual de `roundAnswered`.
- **DATA-01**
  - Expandir `countriesCatalog` con fuente consistente y formato normalizado (`iso2/iso3/name/continent/capital`).
  - Ajustar tests que hoy asumen tamano fijo del catalogo.
  - Agregar validacion de resolubilidad mapa<->catalogo y documentar excepciones.
- **MAP-UX-05**
  - Pasar region activa al mapa y aplicar estilos diferenciados para region activa/resto.
  - Implementar enfoque inicial por continente con fallback seguro.
  - Bloquear o explicar claramente clics fuera de region activa para evitar ambiguedades.

## Validacion y criterios de salida
- El mapa mantiene seleccion correcta de pais con zoom/pan activos.
- Partida: mapa a pantalla completa con overlay mínimo; sin scroll de documento; pan/zoom permite clic en zonas inicialmente bajo la UI.
- Turno activo visible en movil sin interaccion extra.
- El catalogo deja de ser reducido y el pool mundial es consistente con paises clicables.
- El modo por continente se distingue visualmente y no introduce respuestas ambiguas.
- `npm run test` permanece en verde con tests actualizados en componentes/servicios afectados.

## Riesgos y mitigaciones
- **Desalineacion ISO entre catalogo y TopoJSON**: introducir tabla de alias/exclusiones controlada y testeada.
- **Regresiones de layout en movil**: validar en un viewport base pequeno antes de cerrar cada task.
- **Interferencia entre pan y click**: priorizar una sola semantica de interaccion (drag intencional + click corto) y mantener reset rapido.
- **Overlay vs mapa**: calibrar `pointer-events`, areas clicables y densidad de chips para no bloquear el juego; pan/zoom como compensacion documentada.

## Entregable documental de esta fase
Actualizar estado/checklist de cada task origen en `docs/tasks/map-game-ux-and-data/` conforme se complete cada implementacion, sin crear aun la TODO list separada.