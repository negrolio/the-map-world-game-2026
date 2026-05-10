import type { RegionFilter } from '../types'

/** Pan/zoom CSS (MAP-UX-01). El “home” del usuario es siempre zoom 1 y sin translate; el encuadre geográfico lo da la proyección (MAP-UX-05). */
export interface WorldMapBaselineViewport {
  readonly zoom: number
  readonly offset: readonly [number, number]
}

/** `scale` compartida con modo `world` + `center` [lon, lat] para `react-simple-maps` / d3-geo. */
export interface WorldMapProjectionConfig {
  readonly scale: number
  readonly center: readonly [number, number]
}

type ContinentKey = Exclude<RegionFilter, 'world'>

/** Única escala de proyección (mismo “nivel de zoom” geográfico que el mapa mundial; MAP-UX-05). */
const MAP_PROJECTION_SCALE = 147

const WORLD_CENTER: readonly [number, number] = [0, 0]

/** Centros aproximados [lon, lat] por continente; no se aumenta `scale` respecto a `world`. */
const CONTINENT_CENTER: Record<ContinentKey, readonly [number, number]> = {
  africa: [20, 4],
  americas: [-92, 6],
  asia: [98, 34],
  europe: [15, 52],
  oceania: [168, -22],
}

export function getProjectionConfigForRegion(regionFilter: RegionFilter): WorldMapProjectionConfig {
  if (regionFilter === 'world') {
    return {
      scale: MAP_PROJECTION_SCALE,
      center: [WORLD_CENTER[0], WORLD_CENTER[1]],
    }
  }
  const [lon, lat] = CONTINENT_CENTER[regionFilter]
  return {
    scale: MAP_PROJECTION_SCALE,
    center: [lon, lat],
  }
}

/** Siempre identidad en CSS: el centrado territorial viene de `getProjectionConfigForRegion`. */
export function getBaselineViewportForRegion(_regionFilter: RegionFilter): WorldMapBaselineViewport {
  return { zoom: 1, offset: [0, 0] }
}
