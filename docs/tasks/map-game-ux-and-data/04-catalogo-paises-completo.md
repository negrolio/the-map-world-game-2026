# Tarea: Catálogo completo de países (reemplazar lista reducida)

| Campo | Valor |
|--------|--------|
| **ID** | DATA-01 |
| **Prioridad** | P1 (alta para “juego real”; no bloquea zoom/HUD) |
| **Estimación** | 4–8 h (según fuente y validación) |
| **Dependencias** | Coherencia con `world-atlas/countries-110m.json` y `resolveCountryClickFromTopologyProperties` |

**Estado:** implementado (DATA-01). Detalle de fuentes, regeneración y excepciones: [`04-catalogo-fuente-y-versionado.md`](./04-catalogo-fuente-y-versionado.md).

## Objetivo

Sustituir la lista fija de **10 países** en `src/data/countries.ts` por un **catálogo amplio** (idealmente todos los países jugables alineados al mapa 110m), manteniendo el contrato `CountryRecord`:

- `iso2`, `iso3`, `name`, `continent`, `capital`

y el tipo `RegionFilter` para continentes.

## Contexto en repo

- `src/data/countries.ts`: `countriesCatalog` reducido; usado en `App.tsx`, `loaders.ts`, `build-question-pool.test.ts`.
- Mapa: TopoJSON Natural Earth vía `world-atlas/countries-110m.json` (`WorldMap.tsx`).
- Clics: `src/services/topology-country-click` — los ISO2 del catálogo deben ser **resolubles** desde propiedades del TopoJSON para no generar preguntas “imposibles” en el mapa.

## Alcance

1. **Fuente de datos**: elegir una fuente mantenible (JSON estático en repo, script de generación desde dataset público, etc.). Documentar origen y fecha en comentario o `datasetVersion` / nota en `src/data`.
2. **Cobertura**: incluir todos los países que el juego deba soportar en modo “Mundo” y por continente, filtrando entidades que no sean países soberanos si así lo define el producto (ej. omitir dependencias según reglas del PRD).
3. **Validación automatizada**:
   - Test o script que verifique: cada `iso2` del catálogo aparece en el flujo de resolución esperado **o** lista explícita de excepciones documentadas.
   - Continente coherente con `RegionFilter` (excluir `'world'` en el campo `continent`).
4. **Capital y nombre**: nombres en español o inglés según decisión de producto; ser **consistente** en todo el catálogo.
5. Actualizar tests que asumen `countriesCatalog.length === 10` (p. ej. `build-question-pool.test.ts`) a valores derivados o fixtures mínimos.

## Fuera de alcance (salvo decisión explícita)

- Añadir nuevas dependencias npm sin aprobación del equipo (regla `.cursor/rules/core.mdc`).
- Cambiar resolución del mapa a 50m si no es necesario para el MVP.
- Comportamiento visual/reactivo del mapa al cambiar continente (ver `05-seleccion-continente-reactiva.md`).

## Criterios de aceptación

- [x] `countriesCatalog.length` refleja el conjunto acordado (>> 10; **173** soberanos/jugables alineados a `countries-110m` + REST Countries; excluye Antártida y geometrías no resolubles).
- [x] `validateConfig` / `buildQuestionPool` funcionan con el nuevo tamaño; límites de preguntas en UI siguen correctos.
- [x] Al menos un test asegura que **ningún** país del pool de una partida “mundo” queda fuera de lo clicable en el mapa (muestra o propiedad invariante acordada).
- [x] `datasetVersion` o documentación equivalente actualizada si el dataset cambia.

## Riesgos

- Discrepancia ISO2 entre catálogo y TopoJSON (suelets, Kosovo, etc.): conviene tabla de alias o exclusión explícita con tests.

## Orden sugerido

Puede ejecutarse **en paralelo** a MAP-UX-01–03; si el pool crece mucho, conviene **antes** de invertir fuerte en contenido de preguntas o analytics por país.
