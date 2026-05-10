# DATA-01 — Fuente, formato y versionado del catálogo

## Formato en código

Cada entrada cumple `CountryRecord` en [`src/data/countries.ts`](../../../src/data/countries.ts):

| Campo       | Tipo   | Notas |
|------------|--------|--------|
| `iso2`     | string | ISO 3166-1 alpha-2 (mayúsculas en datos). |
| `iso3`     | string | ISO 3166-1 alpha-3. |
| `name`     | string | Nombre corto en **inglés** (coherente con UI y prompts actuales). |
| `capital`  | string | Capital principal en **inglés**. |
| `continent`| string | Uno de: `africa`, `americas`, `asia`, `europe`, `oceania` (alineado con `RegionFilter` sin `world`). |

Los datos viven en [`src/data/countries-catalog.json`](../../../src/data/countries-catalog.json) y se reexportan como `countriesCatalog`.

## Fuentes

1. **Geometrías y códigos jugables** — Paquete npm `world-atlas@2.0.2`, archivo `countries-110m.json` (Natural Earth vía Mike Bostock). Las geometrías exponen `id` numérico ISO 3166-1 y `properties.name`; la resolución a alpha-2 replica [`resolveCountryClickFromTopologyProperties`](../../../src/services/topology-country-click.ts) y la tabla [`ISO_3166_NUMERIC_TO_ALPHA2`](../../../src/data/iso3166-numeric-to-alpha2.ts).
2. **Nombres, capitales, ISO3 y región** — API pública [REST Countries](https://restcountries.com/) v3.1, endpoint `all?fields=cca2,cca3,name,capital,region,subregion` (snapshot usado para generar el JSON: **2026-05-09**).

Licencias habituales: Natural Earth (dominio público); REST Countries (MIT). Verificar términos vigentes al actualizar.

## Mapeo `region` → `continent`

REST Countries `region` se proyecta así:

- `Africa` → `africa`
- `Americas` → `americas`
- `Asia` → `asia`
- `Europe` → `europe`
- `Oceania` → `oceania`
- `Antarctic` → **excluido** del catálogo de juego (no hay filtro `antarctic` en producto).

## Entidades excluidas del catálogo (no en pool)

| Motivo | Ejemplos |
|--------|-----------|
| Región Antártica en REST Countries | `AQ`, `TF` |
| Geometría sin código ISO2 resoluble con la lógica actual | `N. Cyprus`, `Somaliland` |

Quedan documentadas aquí; no hay allowlist de “no clickeables” en catálogo: todo `iso2` del catálogo debe pasar el test de resolubilidad contra el TopoJSON.

## Alias en resolución de clics

Casos especiales en [`topology-country-click.ts`](../../../src/services/topology-country-click.ts) (`WORLD_ATLAS_NAME_TO_ISO2`, etc.). Cualquier nuevo alias debe ir con test en [`topology-country-click.test.ts`](../../../src/services/topology-country-click.test.ts) y anotarse en la tabla “Excepciones ISO / alias” de este doc.

| Nombre en TopoJSON | ISO2 | Notas |
|--------------------|------|--------|
| Kosovo | XK | Acuerdo de facto en mapa 110m. |

## Regenerar `countries-catalog.json`

1. Descargar metadatos (requiere red):

   ```bash
   curl -sL 'https://restcountries.com/v3.1/all?fields=cca2,cca3,name,capital,region,subregion' -o /tmp/restcountries.json
   ```

2. Ejecutar:

   ```bash
   node ./scripts/generate-countries-catalog.mjs /tmp/restcountries.json
   ```

3. Revisar diff, ejecutar `npm run test` y el test de catálogo ↔ topología.

4. Si cambia el conjunto de países o la fuente, actualizar [`src/data/dataset-version.ts`](../../../src/data/dataset-version.ts) y la fecha en este archivo.

## `datasetVersion`

Ver [`src/data/dataset-version.ts`](../../../src/data/dataset-version.ts). Debe bumparse cuando cambie el snapshot del catálogo o la semántica de datos cargados en cliente.
