# Tarea: HUD de jugadores más intuitivo (sin fricción móvil)

| Campo | Valor |
|--------|--------|
| **ID** | MAP-UX-03 |
| **Prioridad** | P1 |
| **Estimación** | 2–4 h |
| **Dependencias** | Complementa MAP-UX-02 (overlay pantalla completa); puede hacerse en paralelo o fundirse con el mismo shell si el puntaje/listado vive en la misma capa |

## Objetivo

Reducir fricción en **móvil**: el usuario no debe realizar un paso extra (p. ej. acordeón) para ver el estado de jugadores y el **turno actual** durante la partida. El HUD debe comunicar de un vistazo:

- Quién tiene el turno (si la ronda no está respondida).
- Puntos y contadores por jugador (al menos en vista compacta).
- Estado “ronda respondida” coherente con `roundAnswered`.

## Contexto en repo

- `src/components/GamePlayersHud.tsx`: en `md:hidden` lista compacta siempre visible (scroll local si hace falta); en `md+` grid de tarjetas.
- `src/App.tsx`: monta `<GamePlayersHud session={…} roundAnswered={…} />`.
- Tras MAP-UX-02, el HUD puede integrarse **dentro del overlay** de la vista a pantalla completa; evitar listados que obliguen a scroll de documento o que tapen de forma fija el centro del mapa sin alternativa de pan.

## Alcance

1. **Implementado:** lista compacta en `md:hidden` (1 fila por jugador, badge “Turno”, métricas; scroll local `max-h` si hace falta). Carrusel o barra superior quedan como alternativas documentadas si hiciera falta iterar.
2. Mantener `aria-live` / anuncios para lectores de pantalla (`hud-active-player-announcement`).
3. **`data-testid`:** `game-players-hud`, `hud-active-player-announcement`, `player-hud-{id}` (escritorio `md+`), `player-hud-mobile-{id}` (móvil `<md`).
4. No degradar desktop: grid `md:grid` sin cambios de comportamiento.

## Criterios de aceptación

- [x] En viewport `< md`, el turno activo es **visible sin interacción extra** (sin abrir acordeón).
- [x] Hasta 6 jugadores: layout usable sin scroll vertical masivo dentro del HUD (scroll local acotado si aplica).
- [x] `roundAnswered === true`: no se resalta “en turno” hasta avanzar (comportamiento actual preservado).
- [x] Tests en `App.test.tsx` (viewport ancho/estrecho) y `GamePlayersHud.test.tsx` (turno / `roundAnswered`).

## Fuera de alcance

- Lógica de `turn-engine` / puntuación (solo presentación).

## Orden sugerido

Tras o junto a **MAP-UX-02** para validar en una sola pasada de QA: mapa full-screen, overlay mínimo, turno y puntajes legibles sin fricción (incluido móvil).
