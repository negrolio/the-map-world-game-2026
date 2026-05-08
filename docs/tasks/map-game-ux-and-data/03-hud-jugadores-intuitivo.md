# Tarea: HUD de jugadores más intuitivo (sin fricción móvil)

| Campo | Valor |
|--------|--------|
| **ID** | MAP-UX-03 |
| **Prioridad** | P1 |
| **Estimación** | 2–4 h |
| **Dependencias** | Complementa MAP-UX-02; puede hacerse en paralelo |

## Objetivo

Reducir fricción en **móvil**: el usuario no debe abrir un `<details>` para ver el estado de jugadores y el **turno actual** durante la partida. El HUD debe comunicar de un vistazo:

- Quién tiene el turno (si la ronda no está respondida).
- Puntos y contadores por jugador (al menos en vista compacta).
- Estado “ronda respondida” coherente con `roundAnswered`.

## Contexto en repo

- `src/components/GamePlayersHud.tsx`: en `md:hidden` usa `<details>` (“Ver jugadores”); en `md+` grid de tarjetas.
- `src/App.tsx`: monta `<GamePlayersHud session={…} roundAnswered={…} />`.

## Alcance

1. Sustituir o complementar el patrón `<details>` por una de:
   - **Carrusel horizontal** con snap y 1 tarjeta visible + indicadores; o
   - **Lista compacta** (1 línea por jugador) con icono/badge de turno; o
   - **Barra superior** “Turno: Nombre” + mini puntajes.
2. Mantener `aria-live` / anuncios para lectores de pantalla (`hud-active-player-announcement`).
3. Conservar `data-testid` existentes o migrar con búsqueda en repo (`player-hud-*`, `game-players-hud`).
4. No degradar desktop: el grid actual puede mantenerse o alinearse visualmente con el nuevo móvil.

## Criterios de aceptación

- [ ] En viewport `< md`, el turno activo es **visible sin interacción extra** (sin abrir acordeón).
- [ ] Hasta 6 jugadores: layout usable sin scroll vertical masivo dentro del HUD.
- [ ] `roundAnswered === true`: no se resalta “en turno” hasta avanzar (comportamiento actual preservado).
- [ ] Tests actualizados en `App.test.tsx` o test dedicado del HUD si existe.

## Fuera de alcance

- Lógica de `turn-engine` / puntuación (solo presentación).

## Orden sugerido

Tras o junto a **MAP-UX-02** para validar el “above the fold” completo en una sola pasada de QA.
