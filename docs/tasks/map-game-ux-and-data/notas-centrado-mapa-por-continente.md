# Notas para especificaciones — centrado del mapa por continente (MAP-UX-05)

Este documento resume decisiones técnicas que conviene tener presentes al redactar o revisar requisitos de mapa y región, para no mezclar conceptos ni duplicar criterios de aceptación contradictorios.

## Dos capas de “vista”

1. **Proyección geográfica** (`ComposableMap` / `projectionConfig` en `react-simple-maps`): **`scale` es única** (la misma que en modo `world`, p. ej. `147`): el “zoom” geográfico de producto no cambia al filtrar por continente. Solo varía **`center` [lon, lat]** para desplazar el encuadre y poner el continente en el medio del lienzo. El acercamiento adicional es solo el **zoom CSS** (MAP-UX-01), control del usuario.
2. **Transformación CSS** (pan + zoom sobre el contenedor del SVG): `translate` + `scale` controlados por el usuario (MAP-UX-01). Es el **ajuste fino** cuando el overlay tapa parte del mapa o el jugador quiere acercarse a un país.

## Qué debe significar “Reset”

- **Reset** debe volver al **mismo encuadre de producto** que al abrir el mapa en ese modo de región: misma proyección (`scale` mundial + `center` del modo) y **pan/zoom CSS en estado neutro** (sin translate, zoom 1).
- No debe confundirse con “volver al mundo completo” si la partida es por continente: en ese caso el home es **continente centrado**, no la vista mundial.

## Qué revisar en futuras historias / AC

- Si el requisito dice “centrar en el continente”, aclarar que el **centrado regional** es por **`center` de proyección** con **misma `scale` que `world`**; no exigir otro nivel de zoom geográfico salvo decisión explícita de producto.
- Si se pide “recordar la posición del usuario entre rondas”, explicitarlo: hoy el pan/zoom puede persistir entre rondas del mismo modo de región; cambiar de continente o de `world` ↔ continente debe **recentrar** (remontaje / baseline documentado).
- Validar presets de **`center`** en **viewports pequeños** y con **overlay** (MAP-UX-02): los centros son revisables en [`src/components/world-map-baseline-viewport.ts`](../../src/components/world-map-baseline-viewport.ts); la escala no debería divergir del mapa mundial sin acuerdo explícito.
- Tests que aseguren centrado deberían poder leer `data-map-projection-*` en el root del mapa o la `projectionConfig` mockeada, además del estado de viewport CSS.

## Archivos relevantes

- [`src/components/world-map-baseline-viewport.ts`](../../src/components/world-map-baseline-viewport.ts) — `getProjectionConfigForRegion`, `getBaselineViewportForRegion`.
- [`src/components/WorldMap.tsx`](../../src/components/WorldMap.tsx) — `WorldMap` con `key={regionFilter}` sobre el implementación interna para alinear estado de pan/zoom al cambio de región.
- [`docs/tasks/map-game-ux-and-data/05-seleccion-continente-reactiva.md`](05-seleccion-continente-reactiva.md) — tarea fuente MAP-UX-05.
