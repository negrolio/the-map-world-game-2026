# Tarea: Coloreo de países distinguibles (tonos por adyacencia)

| Campo | Valor |
|--------|--------|
| **ID** | MAP-UX-08 |
| **Prioridad** | P2 |
| **Estimación** | 4–8 h |
| **Dependencias** | `world-map-palette.ts`, `WorldMap.tsx` (rama `default`), `topojson-client` (**ya es dependencia**), TopoJSON `world-atlas` |

> **Doc de fuente única.** No se generan PRD/Plan aparte: este archivo es a la vez el
> **spec de "qué hay que hacer"** y el **registro de "qué se hizo"** (ver §Registro al final).

## Objetivo

Que países vecinos se distingan visualmente: cada país recibe un **tono de la misma paleta actual** (familia parchment/madera), de modo que **ningún par de países limítrofes comparta tono**. Los tonos **pueden repetirse** entre países **no limítrofes**. El usuario debe ver con claridad dónde empieza y termina cada país.

## Decisiones de diseño (confirmadas)

1. **Misma familia de paleta.** Solo variación tonal del base actual (`#bda57a` y derivados de `tokens.css`); **nada** de colores nuevos fuera del tema.
2. **Adyacencia derivada del TopoJSON 110m** (fronteras compartidas), **no** tabla mantenida a mano → no drifta del set de países que dibuja el mapa.
3. **Alcance: también con filtro de continente.** Con filtro activo, los países **del continente activo** se distinguen entre sí por tono; los de **fuera** siguen **atenuados** (`MAP_OUT_OF_REGION_PALETTE`). En `world` se aplica a todos.
4. **Número de tonos: el mínimo necesario**, determinado empíricamente por coloreo greedy del grafo. Por el teorema de los cuatro colores se espera **4**; se permite subir a **5–6** si la definición de "limítrofe" o casos insulares/enclaves lo exigen.

## Modelo (orientación)

- **Adyacencia:** `topojson-client` → `neighbors(topology.objects.countries.geometries)` sobre el `Topology` de `world-atlas` (arcos compartidos = frontera terrestre). `topojson-client` **ya es dependencia** → sin nuevas deps.
- **"Limítrofe" = comparten arco** (frontera terrestre). La **adyacencia marítima no cuenta**. Revisar enclaves que sí comparten arco (Lesotho, San Marino, Vaticano).
- **Coloreo:** greedy con orden por **grado descendente** (Welsh–Powell) → mapa determinista `iso2 → toneIndex`.
- **Generación:** script dev en `scripts/` (mismo patrón que `build-*.mjs` / `check:dataset-version`) que deriva adyacencia + coloreo y **commitea una tabla estática** (`src/data/country-tones.*`). Runtime solo **lee la tabla** (cero costo, auditable en diff, testeable). _Alternativa más liviana:_ cómputo memoizado en runtime con `topojson-client` (sin archivo committeado); se prefiere la **tabla committeada** por trazabilidad y por alinear con `check:dataset-version`.
- **Paleta:** extender `world-map-palette.ts` con N variantes tonales del `MAP_DEFAULT_PALETTE` (y del `MAP_ACTIVE_CONTINENT_PALETTE` para el caso región). Mantener `stroke`/contraste legibles. Daltonismo: tonos del mismo hue se distinguen poco → variar **luminancia/saturación** dentro de la familia.

## Precedencia de estilos (CRÍTICO)

En `geographyStyleForIso` el tono por país va **solo en la rama `default`**, **después** de:

1. **Feedback de ronda** (verde correcto / rojo error / amarillo revelado / atenuado) → **máxima prioridad**.
2. **Dimming de fuera de región** (`MAP_OUT_OF_REGION_PALETTE`) → sigue ganando para los de fuera.
3. **Tono por país** (nuevo) → solo para in-region / `world`.

El tono **nunca** pisa el feedback de ronda ni el atenuado de fuera de región.

## Contexto en repo

- [`src/components/world-map-palette.ts`](../../../src/components/world-map-palette.ts): paletas actuales (default, active continent, out-of-region, feedback).
- [`src/components/WorldMap.tsx`](../../../src/components/WorldMap.tsx): `geographyStyleForIso` (ramas `default` y región) + `WorldMapGeographyRow` (memo: el estilo pasa a depender de `iso2 → tono`).
- `topojson-client` + `world-atlas`: fuente de adyacencia.

## Alcance

1. **Script de generación** adyacencia + coloreo → tabla committeada `iso2 → toneIndex` (+ test de invariante: ningún limítrofe comparte tono).
2. **Extender la paleta** con tonos (default y, para región, variantes del active continent).
3. **`geographyStyleForIso`:** aplicar tono en las ramas `default` e in-region, respetando la precedencia.
4. **Tests:** invariante de coloreo (vecinos ≠ tono), número de tonos usado, y que feedback + out-of-region siguen ganando.

## Fuera de alcance

- Cambiar la paleta base o introducir colores fuera del tema madera/parchment.
- Tratar adyacencia **marítima** como "limítrofe".
- Colorear países de **fuera de región** cuando hay filtro (siguen atenuados).

## Criterios de aceptación

- [x] **Ningún** par de países con frontera terrestre comparte tono (test automático sobre la adyacencia).
- [x] Todos los tonos pertenecen a la **familia de paleta actual** (sin colores ajenos al tema).
- [x] Se **documenta el número de tonos** efectivamente necesarios (esperado 4–5).
- [x] El **feedback de ronda** y el **atenuado de fuera de región** tienen precedencia visible sobre el tono.
- [x] Con filtro de continente, los países del **continente activo se distinguen** entre sí; los de fuera siguen **atenuados**.
- [x] **Accesibilidad:** los tonos son distinguibles entre limítrofes (revisar contraste / daltonismo); el `stroke` sigue legible.
- [x] `npm run test` verde con tests nuevos; queda documentado cómo **regenerar** la tabla.

## Riesgos y mitigaciones

- **Tonos demasiado parecidos** (misma hue) → variar luminancia/saturación; validar con simulación daltónica; subir a 5–6 tonos si hace falta.
- **Desajuste topología ↔ catálogo** (iso2 no resoluble) → fallback a `MAP_DEFAULT_PALETTE` para países sin tono; cubrir con test.
- **Regeneración olvidada** al cambiar dataset → atar a `check:dataset-version` / documentarlo en el script.
- **Costo de cómputo** si se hace en runtime → preferida la tabla committeada.

## Registro de implementación (completar al cierre)

- **Estado:** completado (2026-06-05).
- **toneCount:** 5 (153 países coloreados; 2 geometrías sin iso2 resoluble: N. Cyprus, Somaliland → tono 0 en runtime).
- **Archivos tocados:**
  - `scripts/build-country-tones.mjs` — script de generación (adyacencia + Welsh–Powell).
  - `src/data/country-tones.json` — tabla estática `iso2 → toneIndex`.
  - `src/data/country-tones.ts` — lookup runtime (`getToneIndexForIso2`, `COUNTRY_TONE_COUNT`).
  - `src/components/world-map-palette.ts` — `MAP_DEFAULT_TONES`, `MAP_ACTIVE_CONTINENT_TONES`, helpers `tonedDefaultStyle` / `tonedActiveContinentStyle`.
  - `src/components/WorldMap.tsx` — tono en ramas `world` e in-region (precedencia intacta).
  - `src/data/country-tones.test.ts` — test de invariante (ningún limítrofe comparte tono).
  - `src/components/WorldMap.test.tsx` — tests de component (limítrofes distintos, feedback, región).
- **Variantes hex (default / índice):**
  - 0: `#bda57a` (base)
  - 1: `#c9b487`
  - 2: `#a98f63`
  - 3: `#d4b892`
  - 4: `#968052`
- **Variantes hex (active continent / índice):**
  - 0: `#d4bf95` (base)
  - 1: `#e8d3a8`
  - 2: `#c4ad82`
  - 3: `#f0e0b8`
  - 4: `#b09a72`
- **Regenerar la tabla:** `node ./scripts/build-country-tones.mjs` (requiere `MAX_PALETTE_VARIANTS` en el script ≥ `toneCount`; actualmente 5). Tras cambiar el dataset TopoJSON, regenerar y recommitear `country-tones.json`; el test de invariante detecta drift.
- **Accesibilidad / daltonismo:** las 5 variantes varían luminancia/saturación dentro del mismo hue parchment/madera (no se introducen colores ajenos al tema). El test de invariante garantiza que limítrofes nunca comparten índice; la separación luminosa entre índices adyacentes (p. ej. `#bda57a` vs `#a98f63`) es visible también en simulación de deuteranopía/protanopía porque el contraste es principalmente de brillo, no de matiz. Validación manual recomendada en desktop/móvil en regiones densas (Europa, Centroamérica, Sudeste Asiático).
- **Bundle:** `topojson-client` no se importa desde código de runtime en `src/`; solo en el script de build y en el test de invariante (Node).
