import type { WorldMapBaselineViewport } from './world-map-baseline-viewport'

export interface FocusViewportInput {
  /** Tamaño del contenedor recortado (viewportRef) en px. */
  readonly viewport: { readonly width: number; readonly height: number }
  /** Rect del país relativo a la esquina sup-izq del viewport, en px (bajo el transform actual). */
  readonly country: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  /** Viewport CSS actual (zoom + offset px). */
  readonly current: WorldMapBaselineViewport
  /** Banda aceptable de tamaño aparente (fracción de la dimensión menor del viewport). */
  readonly gateMin: number
  readonly gateMax: number
  /** Tamaño aparente objetivo cuando hay que reencuadrar (fracción de la dimensión menor). */
  readonly target: number
  /** Límites de zoom CSS (dependientes del dispositivo). */
  readonly minZoom: number
  readonly maxZoom: number
}

export const FOCUS_GATE_DESKTOP = { gateMin: 0.22, gateMax: 0.65, target: 0.45 } as const
export const FOCUS_GATE_TOUCH = { gateMin: 0.18, gateMax: 0.7, target: 0.5 } as const

/**
 * Devuelve el viewport destino para centrar el país y, si su tamaño aparente
 * cae fuera de [gateMin, gateMax], ajustar el zoom hacia `target`.
 * Si el rect es inválido (<= 0) devuelve `current` sin cambios.
 */
export function computeFocusViewport(input: FocusViewportInput): WorldMapBaselineViewport {
  const { viewport, country, current, gateMin, gateMax, target, minZoom, maxZoom } = input

  const minViewportDim = Math.min(viewport.width, viewport.height)
  const apparent = Math.max(country.width, country.height)
  if (minViewportDim <= 0 || apparent <= 0 || current.zoom <= 0) {
    return current
  }

  const ratio = apparent / minViewportDim

  // 1) Zoom: solo cambia si está fuera del gate.
  let nextZoom = current.zoom
  if (ratio < gateMin || ratio > gateMax) {
    const scaleFactor = (target * minViewportDim) / apparent
    nextZoom = Math.min(maxZoom, Math.max(minZoom, current.zoom * scaleFactor))
  }

  // 2) Centro: el centro del país (relativo al viewport) en coords locales de la capa.
  const centerRelX = country.x + country.width / 2
  const centerRelY = country.y + country.height / 2
  const localX = (centerRelX - current.offset[0]) / current.zoom
  const localY = (centerRelY - current.offset[1]) / current.zoom

  // 3) Offset para que ese punto quede en el centro del viewport bajo nextZoom.
  const offsetX = viewport.width / 2 - nextZoom * localX
  const offsetY = viewport.height / 2 - nextZoom * localY

  return { zoom: nextZoom, offset: [offsetX, offsetY] }
}
