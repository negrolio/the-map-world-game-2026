# Tarea: Safari / WebKit — mapa invisible en partida (pantalla completa)

| Campo | Valor |
|--------|--------|
| **ID** | MAP-SAFARI-01 (provisional) |
| **Prioridad** | P1 (bloquea UX en Safari hasta confirmar alcance) |
| **Estimación** | Desconocida (requiere repro en dispositivo + instrumentación) |
| **Dependencias** | `WorldMap.tsx`, `GameShell.tsx`, `react-simple-maps` v3, `vite` `base` |

## Resumen del problema

En **Safari** (macOS y/o iOS, versiones concretas por confirmar), en la **vista de partida** a pantalla completa:

- El **mapa** (capa de países / SVG de `react-simple-maps`) **no se ve**: solo se percibe el fondo decorativo (papel / textura global), como si la capa vectorial no pintara o tuviera tamaño cero.
- Tras iteraciones posteriores, el usuario reportó que **sí** volvieron a verse el **panel de jugadores** y los **sombreados** superior e inferior; **el mapa siguió sin mostrarse**.

En **Chrome** (y entornos de test con jsdom) el comportamiento es el esperado.

## Contexto en repo (al momento de documentar)

- `src/features/game/GameShell.tsx`: shell con `OverlayBand` arriba/abajo y `WorldMap` con `fullBleed` en un contenedor `absolute inset-0`.
- `src/components/WorldMap.tsx`: `ComposableMap` + `Geographies` con URL a `world-atlas/countries-110m.json` (Vite `?url`), pan/zoom y feedback regional.
- `vite.config.ts`: `base: '/the-map-world-game-2026/'` (relevante si Safari trata distinto rutas relativas/absolutas al cargar el topojson).
- Fondos globales: `src/styles/tokens.css` (`body::before`, etc.).

## Resumen de esta conversación (chat)

1. **Síntoma inicial**: mapa no visible; tampoco sombreados arriba/abajo ni panel de jugadores (todo “aplanado” sobre el pergamino).
2. **Objetivo del trabajo en chat**: corregir compatibilidad Safari sin añadir dependencias nuevas.
3. **Estado al cerrar**: el usuario indica que **no se adoptarán** los cambios de código intentados en el repo; se pide **solo documentación** en `docs/tasks/` para retomar después, incluyendo lo intentado que **no** resolvió el mapa.

## Lo que ya se intentó (y qué efecto reportó el usuario)

### Intento A — Layout, degradados en tokens, transform 2D

- Ajustes de **cadena de altura** (`min-h-0`, `min-w-0`, contenedor `flex` + `flex-1` en modo `fullBleed`) para evitar SVG a altura 0 en flex.
- Degradados de overlay en `:root` pasando de `color-mix(in oklab, …)` a **gradientes en sRGB / `rgb()`** por posibles fallos de pintura en Safari antiguo.
- Sustituir **`translate3d`** por **`translate(...)` 2D** en el wrapper del mapa (hipótesis de composición GPU / WebKit).
- `GameShell`: `min-h-0` / `min-w-0` en `main` y capa del mapa.

**Resultado**: el usuario indicó **“sigue igual”** (sin mapa; el resto del síntoma no quedó claramente resuelto en ese mensaje).

### Intento B — Pan/zoom en `<g>` SVG, medición de viewport, overlay inline, colores HUD

- Mover pan/zoom del **`transform` CSS en un `div`** al **atributo `transform` de un `<g>`** envolviendo `Geographies` (hipótesis: WebKit no pinta el SVG si un ancestro HTML tiene `transform`).
- **`ResizeObserver`** sobre el viewport del mapa para pasar **`width` / `height`** numéricos a `ComposableMap` (alineado con la proyección y `viewBox`); respaldo con `resize` en entornos sin `ResizeObserver` (p. ej. tests).
- **`OverlayBand`**: degradado con **`style.backgroundImage`** e `linear-gradient` fijo (sin `bg-[image:var(...)]`).
- **HUD / `PlayerCard`**: colores con **hex** explícitos donde había utilidades con opacidad (`/95`, `/30`, etc.).

**Resultado**: el usuario reportó que **reaparecieron panel de jugadores y sombreados**, pero **el mapa sigue sin verse**. Por decisión de producto/desarrollo, **no se aplicarán** esos cambios al flujo actual; esta tarea conserva el contexto.

## Hipótesis pendientes (para la próxima iteración)

No verificadas en dispositivo real con instrumentación; sirven como checklist:

1. **Carga del topojson**: fallo silencioso de `fetch` en Safari (URL absoluta vs `base`, ITP, modo privado, CORS en despliegue GitHub Pages, etc.); consola podría mostrar error de `react-simple-maps` (“problem when fetching the data”).
2. **Tamaño / viewBox**: aunque se midan `width`/`height`, algún ancestro con `overflow` + stacking que deje el SVG con área de dibujo nula solo en WebKit.
3. **Capa encima del mapa**: elemento transparente capturando pintura o bloqueando composición (menos probable si los controles de zoom se ven).
4. **Versión Safari**: diferencias entre macOS Monterey / Safari 15 vs Safari 17+ (soporte de CSS moderno, `@property`, etc.); conviene anotar **versión exacta** y **URL** (localhost vs Pages).
5. **Sustituto de estrategia**: render alternativo en Safari (canvas / imagen estática / otro pipeline) solo como último recurso; implica coste y mantenimiento.

## Próximos pasos sugeridos

1. Reproducir en **Safari + Consola + inspector de red** (petición al JSON del atlas).
2. Confirmar **viewport** (ancho/alto del `svg` y del contenedor en el inspector).
3. Probar **import estático del topojson** (sin `fetch` en runtime) para aislar red vs render.
4. Decidir si se **revierte** el código de los intentos A/B en git o se deja en una rama; esta tarea no asume estado del working tree.

## Criterios de aceptación (cuando se retome)

- [ ] En Safari acordado (versiones mínimas documentadas), el mapa muestra países y responde a clic como en Chrome.
- [ ] Bandas superior/inferior y HUD legibles (sin regresiones en otros navegadores).
- [ ] `npm run test` y `npm run build` pasan.
- [ ] Nota breve en este archivo o en `docs/requirements/` con la **causa raíz** encontrada y la **solución** elegida.

## Referencias de código (orientación)

- `src/components/WorldMap.tsx`
- `src/features/game/GameShell.tsx`
- `src/components/ui/overlay-band.tsx`
- `src/components/GamePlayersHud.tsx`, `src/components/ui/player-card.tsx`
- `src/styles/tokens.css`

---

*Documento generado a partir del chat de soporte Safari; los intentos de código asociados pueden estar o no en el historial de git según lo que se mergee o revierta.*
