import { describe, expect, it } from 'vitest'

import {
  computeFocusViewport,
  FOCUS_GATE_DESKTOP,
  type FocusViewportInput,
} from './world-map-focus-country'

function baseInput(overrides: Partial<FocusViewportInput> = {}): FocusViewportInput {
  return {
    viewport: { width: 800, height: 600 },
    country: { x: 100, y: 80, width: 40, height: 30 },
    current: { zoom: 1, offset: [0, 0] },
    ...FOCUS_GATE_DESKTOP,
    minZoom: 1,
    maxZoom: 4,
    ...overrides,
  }
}

function apparentRatioAtZoom(input: FocusViewportInput, zoom: number): number {
  const minDim = Math.min(input.viewport.width, input.viewport.height)
  const apparentNow = Math.max(input.country.width, input.country.height) / minDim
  return apparentNow * (zoom / input.current.zoom)
}

describe('computeFocusViewport', () => {
  it('hace zoom in cuando el país es más chico que gateMin', () => {
    const input = baseInput({
      country: { x: 380, y: 280, width: 80, height: 60 },
      current: { zoom: 1, offset: [0, 0] },
    })
    const next = computeFocusViewport(input)
    expect(next.zoom).toBeGreaterThan(input.current.zoom)
    expect(apparentRatioAtZoom(input, next.zoom)).toBeCloseTo(FOCUS_GATE_DESKTOP.target, 1)
  })

  it('hace zoom out cuando el país es más grande que gateMax', () => {
    const input = baseInput({
      country: { x: 50, y: 50, width: 500, height: 400 },
      current: { zoom: 2, offset: [0, 0] },
    })
    const next = computeFocusViewport(input)
    expect(next.zoom).toBeLessThan(input.current.zoom)
    expect(apparentRatioAtZoom(input, next.zoom)).toBeCloseTo(FOCUS_GATE_DESKTOP.target, 1)
  })

  it('conserva el zoom cuando el país ya está dentro del gate', () => {
    const input = baseInput({
      country: { x: 300, y: 200, width: 200, height: 150 },
      current: { zoom: 1.5, offset: [10, 20] },
    })
    const ratio =
      Math.max(input.country.width, input.country.height) /
      Math.min(input.viewport.width, input.viewport.height)
    expect(ratio).toBeGreaterThanOrEqual(FOCUS_GATE_DESKTOP.gateMin)
    expect(ratio).toBeLessThanOrEqual(FOCUS_GATE_DESKTOP.gateMax)

    const next = computeFocusViewport(input)
    expect(next.zoom).toBe(input.current.zoom)
    expect(next.offset).not.toEqual(input.current.offset)
  })

  it('clampa el zoom al máximo permitido', () => {
    const input = baseInput({
      country: { x: 390, y: 290, width: 5, height: 5 },
      current: { zoom: 1, offset: [0, 0] },
      maxZoom: 2,
    })
    const next = computeFocusViewport(input)
    expect(next.zoom).toBe(2)
  })

  it('nunca baja del zoom mínimo', () => {
    const input = baseInput({
      country: { x: 0, y: 0, width: 900, height: 700 },
      current: { zoom: 1, offset: [0, 0] },
      minZoom: 1,
    })
    const next = computeFocusViewport(input)
    expect(next.zoom).toBeGreaterThanOrEqual(1)
  })

  it('devuelve current sin cambios cuando el rect es inválido', () => {
    const current = { zoom: 1.2, offset: [5, 10] as const }
    const input = baseInput({
      country: { x: 0, y: 0, width: 0, height: 0 },
      current,
    })
    expect(computeFocusViewport(input)).toEqual(current)
  })

  it('centra el país en el viewport con zoom 1 y offset cero', () => {
    const input = baseInput({
      viewport: { width: 400, height: 300 },
      country: { x: 10, y: 20, width: 60, height: 40 },
      current: { zoom: 1, offset: [0, 0] },
    })
    const next = computeFocusViewport(input)
    const centerRelX = input.country.x + input.country.width / 2
    const centerRelY = input.country.y + input.country.height / 2
    const localX = (centerRelX - input.current.offset[0]) / input.current.zoom
    const localY = (centerRelY - input.current.offset[1]) / input.current.zoom
    const screenCenterX = next.offset[0] + next.zoom * localX
    const screenCenterY = next.offset[1] + next.zoom * localY
    expect(screenCenterX).toBeCloseTo(input.viewport.width / 2, 1)
    expect(screenCenterY).toBeCloseTo(input.viewport.height / 2, 1)
  })
})
