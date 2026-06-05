/**
 * Color palette consumed by the world map. Values mirror the visual tokens
 * declared in `src/styles/tokens.css` so the map blends with the rest of
 * the redesigned UI without introducing slate/cyan greys.
 *
 * Centralizing the hex codes also keeps the WorldMap test asserts easy to
 * update when the palette evolves.
 */

export interface MapGeographyStyleLayer {
  readonly fill: string
  readonly stroke: string
  readonly strokeWidth: number
}

export interface MapGeographyStyle {
  readonly default: MapGeographyStyleLayer
  readonly hover: MapGeographyStyleLayer
  readonly pressed: { readonly fill: string }
}

/** Default world style — warm parchment without regional filter. */
export const MAP_DEFAULT_PALETTE: MapGeographyStyle = {
  default: { fill: '#bda57a', stroke: '#7d6845', strokeWidth: 0.4 },
  hover: { fill: '#d4bf95', stroke: '#5d4f33', strokeWidth: 0.4 },
  pressed: { fill: '#9a8662' },
}

/** Countries inside the active continent (region filter !== world). */
export const MAP_ACTIVE_CONTINENT_PALETTE: MapGeographyStyle = {
  default: { fill: '#d4bf95', stroke: '#5d4f33', strokeWidth: 0.55 },
  hover: { fill: '#e8d3a8', stroke: '#3a2412', strokeWidth: 0.55 },
  pressed: { fill: '#9a8662' },
}

/** Countries outside the active continent — dimmed wood. */
export const MAP_OUT_OF_REGION_PALETTE: MapGeographyStyle = {
  default: { fill: '#3a2412', stroke: '#2d1e0f', strokeWidth: 0.2 },
  hover: { fill: '#5d3a1f', stroke: '#2d1e0f', strokeWidth: 0.22 },
  pressed: { fill: '#3a2412' },
}

/** Country that matched the target after a correct answer. */
export const MAP_CORRECT_TARGET_PALETTE: MapGeographyStyle = {
  default: { fill: '#7cb342', stroke: '#3f5e1e', strokeWidth: 0.65 },
  hover: { fill: '#5e8c2d', stroke: '#3f5e1e', strokeWidth: 0.65 },
  pressed: { fill: '#9a8662' },
}

/** Country the player chose, when the answer is wrong. */
export const MAP_WRONG_SELECTION_PALETTE: MapGeographyStyle = {
  default: { fill: '#d94c38', stroke: '#7a2515', strokeWidth: 0.65 },
  hover: { fill: '#b53824', stroke: '#7a2515', strokeWidth: 0.65 },
  pressed: { fill: '#9a8662' },
}

/**
 * Variante atenuada del wrong selection (~50 % opacity en fill y stroke), token
 * derivado del `MAP_WRONG_SELECTION_PALETTE` base. Se usa exclusivamente
 * cuando el jugador acertó en un intento posterior y los países erróneos
 * previos deben quedar visibles pero secundarios al verde del target
 * (PRD UX feedback modo AI, RF-F23). No reemplaza al palette base.
 */
export const MAP_WRONG_SELECTION_DIMMED_PALETTE: MapGeographyStyle = {
  default: { fill: 'rgba(217, 76, 56, 0.5)', stroke: 'rgba(122, 37, 21, 0.5)', strokeWidth: 0.65 },
  hover: { fill: 'rgba(181, 56, 36, 0.5)', stroke: 'rgba(122, 37, 21, 0.5)', strokeWidth: 0.65 },
  pressed: { fill: 'rgba(154, 134, 98, 0.5)' },
}

/** Target country revealed after a wrong answer. */
export const MAP_REVEALED_TARGET_PALETTE: MapGeographyStyle = {
  default: { fill: '#fdd835', stroke: '#8a7100', strokeWidth: 0.65 },
  hover: { fill: '#c9a700', stroke: '#8a7100', strokeWidth: 0.65 },
  pressed: { fill: '#9a8662' },
}

/** Variantes tonales del default (world). El índice 0 == base actual. */
export const MAP_DEFAULT_TONES: readonly MapGeographyStyle[] = [
  MAP_DEFAULT_PALETTE,
  {
    default: { fill: '#c9b487', stroke: '#7d6845', strokeWidth: 0.4 },
    hover: { fill: '#dbc9a0', stroke: '#5d4f33', strokeWidth: 0.4 },
    pressed: { fill: '#a89470' },
  },
  {
    default: { fill: '#a98f63', stroke: '#7d6845', strokeWidth: 0.4 },
    hover: { fill: '#c0a87a', stroke: '#5d4f33', strokeWidth: 0.4 },
    pressed: { fill: '#8a7554' },
  },
  {
    default: { fill: '#d4b892', stroke: '#7d6845', strokeWidth: 0.4 },
    hover: { fill: '#e6cba8', stroke: '#5d4f33', strokeWidth: 0.4 },
    pressed: { fill: '#b09a72' },
  },
  {
    default: { fill: '#968052', stroke: '#7d6845', strokeWidth: 0.4 },
    hover: { fill: '#ad9668', stroke: '#5d4f33', strokeWidth: 0.4 },
    pressed: { fill: '#7a6844' },
  },
]

/** Variantes tonales del continente activo (in-region). El índice 0 == base actual. */
export const MAP_ACTIVE_CONTINENT_TONES: readonly MapGeographyStyle[] = [
  MAP_ACTIVE_CONTINENT_PALETTE,
  {
    default: { fill: '#e8d3a8', stroke: '#5d4f33', strokeWidth: 0.55 },
    hover: { fill: '#f2e2be', stroke: '#3a2412', strokeWidth: 0.55 },
    pressed: { fill: '#b09a72' },
  },
  {
    default: { fill: '#c4ad82', stroke: '#5d4f33', strokeWidth: 0.55 },
    hover: { fill: '#d8c49a', stroke: '#3a2412', strokeWidth: 0.55 },
    pressed: { fill: '#9a8662' },
  },
  {
    default: { fill: '#f0e0b8', stroke: '#5d4f33', strokeWidth: 0.55 },
    hover: { fill: '#faf0d0', stroke: '#3a2412', strokeWidth: 0.55 },
    pressed: { fill: '#c4ad82' },
  },
  {
    default: { fill: '#b09a72', stroke: '#5d4f33', strokeWidth: 0.55 },
    hover: { fill: '#c4ad82', stroke: '#3a2412', strokeWidth: 0.55 },
    pressed: { fill: '#8a7554' },
  },
]

export function tonedDefaultStyle(toneIndex: number): MapGeographyStyle {
  return MAP_DEFAULT_TONES[toneIndex] ?? MAP_DEFAULT_PALETTE
}

export function tonedActiveContinentStyle(toneIndex: number): MapGeographyStyle {
  return MAP_ACTIVE_CONTINENT_TONES[toneIndex] ?? MAP_ACTIVE_CONTINENT_PALETTE
}
