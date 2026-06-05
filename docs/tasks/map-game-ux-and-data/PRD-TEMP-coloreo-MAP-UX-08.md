# PRD (TEMPORAL / DESECHABLE) — MAP-UX-08: Coloreo de países distinguibles (tonos por adyacencia)

> **ESTE ARCHIVO ES DESECHABLE.** Es un PRD de implementación para que un agente lo ejecute
> en una pestaña nueva sin contexto previo. **Borrar al cerrar MAP-UX-08.**
> Fuente de verdad (qué/por qué, y registro final): [`07-coloreo-paises-distinguibles.md`](./07-coloreo-paises-distinguibles.md).
> Convenciones del repo: `.cursor/rules/core.mdc` y `.cursor/rules/dependency-security.mdc` (leerlas).

---

## 1. Resumen ejecutivo

Hoy todos los países se pintan con un único relleno (`MAP_DEFAULT_PALETTE`, `#bda57a`), por lo que **dos países limítrofes se ven casi iguales** y cuesta distinguir dónde termina uno y empieza otro.

Esta tarea asigna a **cada país un tono** de la **misma familia de paleta** (parchment/madera) de modo que **ningún par de países con frontera terrestre comparta tono**. Los tonos **se repiten** entre países **no** limítrofes. Es un **coloreo de grafo** (teorema de los cuatro colores ⇒ se esperan 4, a lo sumo 5 tonos).

**Estrategia central (decisión de implementación):**
- La adyacencia y el coloreo se **precalculan con un script de build** (Node) que deriva las fronteras del **TopoJSON** vía `topojson-client.neighbors()` y commitea una **tabla estática `iso2 → toneIndex`**.
- En runtime, `WorldMap` solo **lee la tabla** (lookup O(1)) y mapea `toneIndex` a una variante tonal de la paleta. **No** se carga `topojson-client` en el bundle del cliente.

---

## 2. Anclas en el repositorio (leer antes de codear)

| Qué | Archivo | Detalle relevante |
|-----|---------|-------------------|
| Estilos por país | `src/components/WorldMap.tsx` → `geographyStyleForIso(iso2, mapFeedback, interactionLocked, regionFilter)` | Punto único donde se decide el `fill` de cada `<path>`. Ramas actuales: **feedback** (máxima prioridad) → **fuera de región** (atenuado) → **continente activo** → **default (world)**. |
| Paletas | `src/components/world-map-palette.ts` | `MapGeographyStyle`; `MAP_DEFAULT_PALETTE` (world), `MAP_ACTIVE_CONTINENT_PALETTE` (in-region), `MAP_OUT_OF_REGION_PALETTE`, y las de feedback. Hex centralizados a propósito (los tests asertan sobre ellos). |
| Memo de filas | `src/components/WorldMap.tsx` → `WorldMapGeographyRow` / `worldMapGeographyRowPropsEqual` | El estilo de cada `<path>` ya depende de `iso2` y `regionFilter`. El tono es una **función determinista de `iso2`** ⇒ **no** agrega props nuevas ni rompe el memo. |
| Resolución id→iso2 (para el script) | `src/services/topology-country-click.ts` + `src/data/iso3166-numeric-to-alpha2.ts` | Patrón ya usado por `scripts/generate-countries-catalog.mjs`: `ISO_A2` en props → numérico (`geo.id`) vía tabla → nombre (`{ Kosovo: 'XK' }`). |
| Patrón de script de build | `scripts/generate-countries-catalog.mjs` | Lee `node_modules/world-atlas/countries-110m.json`, parsea `iso3166-numeric-to-alpha2.ts` con regex, resuelve iso2 por geometría, escribe JSON en `src/data/`. **Reusar este patrón.** |
| Catálogo / continentes | `src/data/countries.ts` (`countriesCatalog`, `getContinentForIso2`), `src/data/countries-catalog.json` | El mapa renderiza **todas** las geografías del TopoJSON, no solo el catálogo. El coloreo aplica al **grafo completo** (todo país resoluble a iso2). |
| Dep ya instalada | `topojson-client@^3.1.0` (en `dependencies`) | Provee `neighbors(geometries)` (adyacencia por arcos compartidos = frontera terrestre). **No** hay que instalar nada. |
| Guard de dataset | `scripts/check-dataset-version.mjs`, `src/data/dataset-version.ts` | Atar la regeneración a cambios de dataset (ver §9). |

---

## 3. Arquitectura y flujo de datos

```
[build] scripts/build-country-tones.mjs
   ├─ lee node_modules/world-atlas/countries-110m.json
   ├─ neighbors(geometries)  (topojson-client)  → adyacencia por índice
   ├─ resuelve cada índice → iso2 (mismo resolver que generate-countries-catalog.mjs)
   ├─ greedy coloring (Welsh–Powell)            → iso2 -> toneIndex
   └─ escribe src/data/country-tones.json { version, toneCount, tones: { iso2: idx } }

[runtime] src/data/country-tones.ts
   └─ getToneIndexForIso2(iso2): number   (lookup en el JSON; fallback 0)

[runtime] src/components/world-map-palette.ts
   ├─ MAP_DEFAULT_TONES: MapGeographyStyle[]            (K variantes del default)
   └─ MAP_ACTIVE_CONTINENT_TONES: MapGeographyStyle[]   (K variantes del active-continent)

[runtime] WorldMap.tsx → geographyStyleForIso
   └─ en ramas "world" e "in-region", elige la variante por getToneIndexForIso2(iso2)
```

---

## 4. Script de build — `scripts/build-country-tones.mjs` (NUEVO)

Reusar el estilo de `generate-countries-catalog.mjs`.

- **Entrada:** `node_modules/world-atlas/countries-110m.json`; tabla numérico→alpha2 parseada de `src/data/iso3166-numeric-to-alpha2.ts` (mismo regex `/'(\d{3})':\s*'([A-Z]{2})'/g`); excepción `{ Kosovo: 'XK' }`.
- **Adyacencia:** `import { neighbors } from 'topojson-client'`; `const geos = topo.objects.countries.geometries; const adjIdx = neighbors(geos)`.
- **Resolución iso2 por geometría:** función `iso2OfGeometry(geo)` = `ISO_A2` (props) → `alpha2FromNumeric(geo.id)` → `NAME_TO_ISO2[props.name]`. Si no resuelve, marcar geometría como "sin iso2".
- **Grafo en espacio iso2:** para cada par `(i, j)` adyacente, si ambos resuelven iso2 y `iso2_i !== iso2_j`, agregar arista no dirigida. (Geometrías sin iso2 se ignoran; sus fronteras no restringen.)
- **Coloreo greedy (Welsh–Powell):**
  - Ordenar nodos por **grado descendente** (desempate alfabético por iso2 para determinismo).
  - Para cada nodo, asignar el **menor `toneIndex`** que **no** use ningún vecino ya coloreado.
  - `toneCount = max(toneIndex) + 1`.
- **Salida:** `src/data/country-tones.json`:
  ```json
  { "version": 1, "toneCount": 5, "tones": { "AR": 0, "BR": 1, "CL": 2 } }
  ```
  Ordenar `tones` por clave para diffs estables.
- **Logs (sin PII):** imprimir `toneCount` y cantidad de países coloreados. Si `toneCount` excede las variantes de paleta disponibles (§5), `console.error` + `process.exit(1)` con mensaje claro ("agregar N variantes a world-map-palette.ts").
- **Invocación:** `node ./scripts/build-country-tones.mjs`.
- **package.json:** *opcional* agregar `"build:country-tones": "node ./scripts/build-country-tones.mjs"`. **Tocar `package.json` requiere aprobación explícita del usuario** (`core.mdc`): si no se aprueba, documentar la invocación directa por `node`.

> El algoritmo de coloreo es trivial; lo testeable de verdad es la **invariante del output** (§11), que se valida recomputando adyacencia.

---

## 5. Paleta de tonos — `src/components/world-map-palette.ts` (EXTENDER)

Agregar **K variantes tonales** (esperado K = 4–5) **dentro de la familia actual** (parchment/madera; nada de hues nuevos). Variar **luminancia/saturación**, no el tono base.

```ts
/** Variantes tonales del default (world). El índice 0 == base actual. */
export const MAP_DEFAULT_TONES: readonly MapGeographyStyle[] = [
  MAP_DEFAULT_PALETTE, // 0 — base (#bda57a)
  { default: { fill: '#c9b487', stroke: '#7d6845', strokeWidth: 0.4 }, hover: {/*…*/}, pressed: {/*…*/} }, // 1
  { default: { fill: '#a98f63', stroke: '#7d6845', strokeWidth: 0.4 }, hover: {/*…*/}, pressed: {/*…*/} }, // 2
  // … hasta cubrir toneCount (afinar hex en QA; documentar en doc 07)
]

/** Variantes tonales del continente activo (in-region). El índice 0 == MAP_ACTIVE_CONTINENT_PALETTE. */
export const MAP_ACTIVE_CONTINENT_TONES: readonly MapGeographyStyle[] = [
  MAP_ACTIVE_CONTINENT_PALETTE, // 0
  // … K variantes
]

export function tonedDefaultStyle(toneIndex: number): MapGeographyStyle {
  return MAP_DEFAULT_TONES[toneIndex] ?? MAP_DEFAULT_PALETTE
}
export function tonedActiveContinentStyle(toneIndex: number): MapGeographyStyle {
  return MAP_ACTIVE_CONTINENT_TONES[toneIndex] ?? MAP_ACTIVE_CONTINENT_PALETTE
}
```

- Mantener el `stroke` legible y suficiente contraste **entre variantes** (deben distinguirse a simple vista entre limítrofes; ver accesibilidad §8).
- `MAP_DEFAULT_TONES.length` y `MAP_ACTIVE_CONTINENT_TONES.length` deben ser `>= toneCount` del JSON (test en §11).

---

## 6. Runtime lookup — `src/data/country-tones.ts` (NUEVO)

```ts
import data from './country-tones.json'

const TONES = data.tones as Readonly<Record<string, number>>
export const COUNTRY_TONE_COUNT: number = data.toneCount

/** Tono asignado al país; 0 (base) si no está en la tabla. */
export function getToneIndexForIso2(iso2: string | undefined): number {
  if (!iso2) return 0
  return TONES[iso2] ?? 0
}
```

---

## 7. Cableado en `geographyStyleForIso` (`WorldMap.tsx`)

Insertar el tono **solo** en las ramas `world` e `in-region`, **respetando la precedencia existente**:

1. **Feedback de ronda** (verde/rojo/amarillo/atenuado) → sin cambios, máxima prioridad.
2. **Fuera de región** (`MAP_OUT_OF_REGION_PALETTE`) → sin cambios, sigue atenuado.
3. **Continente activo (in-region)** → `toGeographyStyle(tonedActiveContinentStyle(getToneIndexForIso2(iso2)), interactionLocked)`.
4. **Default (world)** → `toGeographyStyle(tonedDefaultStyle(getToneIndexForIso2(iso2)), interactionLocked)`.

```ts
// … tras el bloque de mapFeedback (sin tocar) …
if (regionFilter !== 'world') {
  const continent = getContinentForIso2(iso2)
  if (!continent || continent !== regionFilter) {
    return toGeographyStyle(MAP_OUT_OF_REGION_PALETTE, interactionLocked) // sin tono
  }
  return toGeographyStyle(tonedActiveContinentStyle(getToneIndexForIso2(iso2)), interactionLocked)
}
return toGeographyStyle(tonedDefaultStyle(getToneIndexForIso2(iso2)), interactionLocked)
```

> `geographyStyleForIso` sigue siendo **pura** (la tabla es un import estático). No agregar props al `<Geography>` ni al memo: el tono se deriva de `iso2` que ya es input.

---

## 8. Requisitos no funcionales

**Performance**
- Coloreo **precalculado en build**; en runtime solo lookup O(1) por país. No hay cálculo de grafo en el cliente.
- **Bundle:** `topojson-client` se usa **solo** en el script de build y en el test (Node); **no** debe importarse desde código de `src/` que entre al bundle. El `country-tones.json` es pequeño (~pocos KB).
- Sin re-render extra de los ~200 `<path>`: el tono no cambia las props del memo (deriva de `iso2`).

**Security / Privacy**
- 100% cliente/estático, sin red en runtime, sin PII, sin secretos (`privacy.mdc`). El script de build **no** requiere red (lee `node_modules`).

**Scalability**
- Sin backend. El coste no crece con jugadores/rondas. Regenerar la tabla solo al cambiar el dataset de geometrías.

**Accesibilidad**
- Los tonos deben distinguirse **entre limítrofes** a simple vista; el color **no** codifica información de juego (es solo diferenciación visual; el feedback de ronda conserva sus colores). Validar con simulación de daltonismo (deuteranopía/protanopía): si dos variantes colindantes se confunden, ajustar luminancia o subir `toneCount`. Mantener contraste del `stroke`.

**Compatibilidad / Dependencias**
- **No** agregar dependencias ni ejecutar `npm install`. Modificar `package.json` (script opcional) **solo** con aprobación (`core.mdc`).

---

## 9. Edge cases y escenarios de error

| # | Caso | Comportamiento esperado |
|---|------|--------------------------|
| E1 | `iso2` no está en la tabla (país sin tono) | `getToneIndexForIso2` → `0` (base). País se ve con el tono base, sin romper. |
| E2 | Geometría del TopoJSON sin iso2 resoluble (`-99`, sin id) | El script la ignora (no aporta aristas). En runtime se pinta con tono 0. |
| E3 | Ronda con feedback activo sobre un país | El **feedback gana** (verde/rojo/amarillo); el tono no se ve. (Precedencia §7). |
| E4 | Filtro de continente activo | In-region: tonos distinguibles (variantes active-continent). Fuera de región: **atenuado** sin tono. |
| E5 | Enclaves que comparten arco (Lesotho–Sudáfrica, San Marino/Vaticano–Italia) | Deben recibir tono **distinto** del país que los rodea (el grafo los incluye). |
| E6 | Vecinos **solo** por mar (sin frontera terrestre) | **No** se restringen; pueden compartir tono (aceptado, ver §10). |
| E7 | `toneCount` del JSON > variantes de paleta disponibles | El script falla (`exit 1`) y/o el test de §11 falla, pidiendo agregar variantes. **No** se mergea con tabla inconsistente. |
| E8 | Dataset/TopoJSON cambia y no se regeneró la tabla | El test de invariante (§11) recomputa adyacencia desde `node_modules` y **falla** si hay drift (guard). Regenerar y recommitear. |
| E9 | Kosovo (`XK`) y disputados | Se colorean si resuelven a iso2; se tratan como nodo normal. |

---

## 10. Fuera de alcance

- Tratar la **adyacencia marítima** como "limítrofe" (solo frontera terrestre / arcos compartidos).
- Cambiar la **paleta base** o introducir colores fuera del tema parchment/madera.
- Colorear países **fuera de región** cuando hay filtro (siguen **atenuados**).
- Cambiar el **feedback** de ronda (verde/rojo/amarillo) o el dimming regional.
- MAP-UX-07 (auto-zoom): tarea independiente.

---

## 11. Plan de pruebas

**Invariante del output (Vitest, entorno node) — `country-tones.test.ts` (clave):**
- Cargar `src/data/country-tones.json`.
- Recomputar adyacencia desde `node_modules/world-atlas/countries-110m.json` con `topojson-client.neighbors()` + el mismo resolver iso2.
- **Aserción principal:** para **toda** arista `(a, b)` con frontera terrestre, `tones[a] !== tones[b]`.
- `toneCount` declarado === `max(tones)+1`.
- `MAP_DEFAULT_TONES.length >= toneCount` y `MAP_ACTIVE_CONTINENT_TONES.length >= toneCount`.

**Unit (opcional) — coloreo puro:** si se extrae `greedyColoring(adjacency)` a un módulo, testear con grafos sintéticos (triángulo ⇒ 3 colores; grafo bipartito ⇒ 2; nodo aislado ⇒ 1).

**Component (Testing Library) — `WorldMap.test.tsx`:**
- Dos países **limítrofes conocidos** (p. ej. `AR`/`CL`, `FR`/`DE`) renderizan `fill` **distinto** en modo `world`.
- Con feedback activo, el país con feedback mantiene su color de feedback (el tono no lo pisa).
- Con `regionFilter` de un continente: in-region toneado; out-of-region con `MAP_OUT_OF_REGION_PALETTE`.

**QA manual (registrar en doc 07):** desktop y móvil; recorrer regiones densas (Europa, Centroamérica, Sudeste Asiático) y confirmar que todo limítrofe se distingue; pasar un simulador de daltonismo.

---

## 12. Definition of Done

- [ ] `scripts/build-country-tones.mjs` creado; genera `src/data/country-tones.json` (determinista, ordenado).
- [ ] `src/data/country-tones.json` committeado; `toneCount` documentado (esperado 4–5).
- [ ] `src/data/country-tones.ts` (`getToneIndexForIso2`, `COUNTRY_TONE_COUNT`).
- [ ] `world-map-palette.ts` extendido con `MAP_DEFAULT_TONES` / `MAP_ACTIVE_CONTINENT_TONES` + helpers, dentro de la familia actual.
- [ ] `geographyStyleForIso` aplica tono en `world` e `in-region`, conservando precedencia (feedback > out-of-region > tono).
- [ ] Test de **invariante** verde (ningún limítrofe comparte tono) + tests de component.
- [ ] `topojson-client` **no** entra al bundle de cliente; `npm run test` y `npm run lint` verdes; sin `npm install`; `package.json` sin tocar (o script agregado **con aprobación**).
- [ ] Doc [`07-coloreo-paises-distinguibles.md`](./07-coloreo-paises-distinguibles.md) §Registro actualizado (toneCount final, hex de variantes, cómo regenerar, resultado de validación de daltonismo).
- [ ] **Borrar este archivo PRD-TEMP.**
```
