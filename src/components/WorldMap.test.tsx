import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { CSSProperties, KeyboardEventHandler, MouseEventHandler, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { WorldMap } from './WorldMap'
import { renderWithI18n } from '../test/render-with-i18n'

const { mockGeographies } = vi.hoisted(() => ({
  mockGeographies: [
    { rsmKey: 'geo-ar', id: '032', properties: { name: 'Argentina', ISO_A2: 'AR' } },
    { rsmKey: 'geo-de', id: '276', properties: { name: 'Germany', ISO_A2: 'DE' } },
  ],
}))

vi.mock('react-simple-maps', () => {
  return {
    ComposableMap: ({
      children,
      projectionConfig,
    }: {
      children: ReactNode
      projectionConfig?: { scale?: number; center?: readonly [number, number] }
    }) => (
      <svg
        data-testid="composable-map"
        data-projection-scale={projectionConfig?.scale ?? ''}
        data-projection-center={
          projectionConfig?.center ? `${projectionConfig.center[0]},${projectionConfig.center[1]}` : ''
        }
      >
        {children}
      </svg>
    ),
    Geographies: ({ children }: { children: (arg: { geographies: Array<Record<string, unknown>> }) => ReactNode }) =>
      children({
        geographies: mockGeographies,
      }),
    Geography: ({
      onClick,
      onKeyDown,
      style,
      'data-iso': dataIso,
      ...props
    }: {
      onClick?: MouseEventHandler<SVGPathElement>
      onKeyDown?: KeyboardEventHandler<SVGPathElement>
      style?: { default?: CSSProperties; hover?: CSSProperties; pressed?: CSSProperties }
      'data-iso'?: string
      [key: string]: unknown
    }) => {
      const flatStyle = style?.default ?? {}
      return (
        <path
          data-testid={`geo-${String(dataIso ?? 'xx').toLowerCase()}`}
          data-iso={dataIso}
          role="button"
          tabIndex={0}
          style={flatStyle}
          onClick={onClick}
          onKeyDown={onKeyDown}
          {...props}
        />
      )
    },
  }
})

describe('WorldMap', () => {
  it('expone controles de zoom y reset con etiquetas accesibles', () => {
    renderWithI18n(<WorldMap />)

    expect(screen.getByRole('button', { name: /Acercar mapa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Alejar mapa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Restablecer vista del mapa/i })).toBeInTheDocument()
  })

  it('actualiza el zoom en el estado del viewport al usar controles', () => {
    renderWithI18n(<WorldMap />)
    const root = screen.getByTestId('world-map-root')
    const viewport = screen.getByTestId('world-map-viewport')
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      top: 0,
      right: 200,
      bottom: 100,
      left: 0,
      toJSON: () => ({}),
    })

    expect(root).toHaveAttribute('data-viewport-zoom', '1.00')
    expect(root).toHaveAttribute('data-viewport-center', '0.00,0.00')

    fireEvent.click(screen.getByRole('button', { name: /Acercar mapa/i }))
    expect(root).toHaveAttribute('data-viewport-zoom', '1.35')
    expect(root).toHaveAttribute('data-viewport-center', '-35.00,-17.50')

    fireEvent.click(screen.getByRole('button', { name: /Restablecer vista del mapa/i }))
    expect(root).toHaveAttribute('data-viewport-zoom', '1.00')
    expect(root).toHaveAttribute('data-viewport-center', '0.00,0.00')
  })

  it('sincroniza pan al arrastrar dentro del viewport (Pointer Events)', () => {
    renderWithI18n(<WorldMap />)
    const root = screen.getByTestId('world-map-root')
    const viewport = screen.getByTestId('world-map-viewport')

    const ptrMouse = (x: number, y: number, pointerId: number, down: boolean) => ({
      clientX: x,
      clientY: y,
      pointerId,
      pointerType: 'mouse',
      button: 0,
      buttons: down ? 1 : 0,
    })

    fireEvent.pointerDown(viewport, ptrMouse(10, 10, 1, true))
    fireEvent.pointerMove(viewport, ptrMouse(30, 18, 1, true))
    fireEvent.pointerUp(viewport, ptrMouse(30, 18, 1, false))

    expect(root).toHaveAttribute('data-viewport-zoom', '1.00')
    expect(root).toHaveAttribute('data-viewport-center', '20.00,8.00')
  })

  it('aumenta el zoom con pinch simulado (dos punteros tactiles)', () => {
    renderWithI18n(<WorldMap />)
    const root = screen.getByTestId('world-map-root')
    const viewport = screen.getByTestId('world-map-viewport')
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      top: 0,
      right: 200,
      bottom: 100,
      left: 0,
      toJSON: () => ({}),
    })

    const ptrTouch = (x: number, y: number, pointerId: number, down: boolean) => ({
      clientX: x,
      clientY: y,
      pointerId,
      pointerType: 'touch',
      button: 0,
      buttons: down ? 1 : 0,
    })

    expect(root).toHaveAttribute('data-viewport-zoom', '1.00')

    fireEvent.pointerDown(viewport, ptrTouch(80, 50, 10, true))
    fireEvent.pointerDown(viewport, ptrTouch(120, 50, 11, true))
    fireEvent.pointerMove(viewport, ptrTouch(50, 50, 10, true))
    fireEvent.pointerMove(viewport, ptrTouch(150, 50, 11, true))

    fireEvent.pointerUp(viewport, { ...ptrTouch(50, 50, 10, false), buttons: 0 })
    fireEvent.pointerUp(viewport, { ...ptrTouch(150, 50, 11, false), buttons: 0 })

    expect(root).toHaveAttribute('data-viewport-zoom', '2.50')
  })

  it('no aplica transicion CSS al transform del mapa (pan lineal respecto del puntero)', () => {
    renderWithI18n(<WorldMap />)
    const layer = screen.getByTestId('world-map-transform-layer')
    expect(layer.className).not.toMatch(/transition-transform/)
  })

  it('aplica zoom con la rueda del mouse dentro del mapa', async () => {
    renderWithI18n(<WorldMap />)
    const root = screen.getByTestId('world-map-root')
    const viewport = screen.getByTestId('world-map-viewport')

    expect(root).toHaveAttribute('data-viewport-zoom', '1.00')

    fireEvent.wheel(viewport, { deltaY: -100, clientX: 50, clientY: 40 })
    await waitFor(() => {
      expect(root).toHaveAttribute('data-viewport-zoom', '1.30')
    })
    expect(root).toHaveAttribute('data-viewport-center', '-15.25,-12.20')

    fireEvent.wheel(viewport, { deltaY: 100, clientX: 50, clientY: 40 })
    await waitFor(() => {
      expect(root).toHaveAttribute('data-viewport-zoom', '1.00')
    })
    expect(root).toHaveAttribute('data-viewport-center', '0.00,0.00')
  })

  it('bloquea click de pais cuando answerLocked esta activo', () => {
    const onCountryClick = vi.fn()
    renderWithI18n(<WorldMap answerLocked onCountryClick={onCountryClick} />)

    fireEvent.click(screen.getByTestId('geo-ar'))

    expect(onCountryClick).not.toHaveBeenCalled()
  })

  it('permite click de pais con mapFeedback de intentos parciales si answerLocked es false', () => {
    const onCountryClick = vi.fn()
    renderWithI18n(
      <WorldMap
        onCountryClick={onCountryClick}
        mapFeedback={{
          selectedIso2: 'UY',
          targetIso2: 'UY',
          isCorrect: false,
          wrongSelectionsIso2: ['UY'],
        }}
      />,
    )

    const geo = screen.getByTestId('geo-de')
    const ptr = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 8, clientY: 8 }
    fireEvent.pointerDown(geo, { ...ptr, buttons: 1 })
    fireEvent.pointerUp(geo, { ...ptr, buttons: 0 })
    fireEvent.click(geo)

    expect(onCountryClick).toHaveBeenCalledWith('DE')
  })

  it('dispara onCountryClick al seleccionar un pais con puntero tipo mouse', () => {
    const onCountryClick = vi.fn()
    renderWithI18n(<WorldMap onCountryClick={onCountryClick} />)
    const geo = screen.getByTestId('geo-ar')
    const ptr = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 8, clientY: 8 }
    fireEvent.pointerDown(geo, { ...ptr, buttons: 1 })
    fireEvent.pointerUp(geo, { ...ptr, buttons: 0 })
    fireEvent.click(geo)
    expect(onCountryClick).toHaveBeenCalledTimes(1)
    expect(onCountryClick).toHaveBeenCalledWith('AR')
  })

  it('no selecciona pais si hubo drag desde el path (raton)', () => {
    const onCountryClick = vi.fn()
    renderWithI18n(<WorldMap onCountryClick={onCountryClick} />)
    const geo = screen.getByTestId('geo-ar')
    const viewport = screen.getByTestId('world-map-viewport')
    const ptr = { pointerId: 9, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 }
    fireEvent.pointerDown(geo, { ...ptr, buttons: 1 })
    fireEvent.pointerMove(viewport, { ...ptr, clientX: 30, clientY: 12, buttons: 1 })
    fireEvent.pointerUp(viewport, { ...ptr, clientX: 30, clientY: 12, buttons: 0 })
    fireEvent.click(geo)
    expect(onCountryClick).not.toHaveBeenCalled()
  })

  it('permite mayor zoom maximo en UI tactil o viewport estrecho', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: unknown) => {
        const q = String(query)
        const matches = q.includes('1023') || q.includes('coarse')
        return {
          matches,
          media: q,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
        } as MediaQueryList
      }),
    )

    try {
      renderWithI18n(<WorldMap />)
      const root = screen.getByTestId('world-map-root')
      const viewport = screen.getByTestId('world-map-viewport')
      vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        top: 0,
        right: 200,
        bottom: 100,
        left: 0,
        toJSON: () => ({}),
      })

      for (let i = 0; i < 40; i += 1) {
        fireEvent.click(screen.getByRole('button', { name: /Acercar mapa/i }))
      }
      const zoom = Number.parseFloat(root.getAttribute('data-viewport-zoom') ?? '0')
      expect(zoom).toBeGreaterThan(4)
      expect(zoom).toBeLessThanOrEqual(22)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('atenua paises fuera del continente activo cuando regionFilter no es world', () => {
    renderWithI18n(<WorldMap regionFilter="europe" />)
    expect(screen.getByTestId('world-map-root')).toHaveAttribute('data-region-filter', 'europe')

    // MAP_ACTIVE_CONTINENT_PALETTE.default.fill = '#d4bf95'
    expect(screen.getByTestId('geo-de')).toHaveStyle({ fill: 'rgb(212, 191, 149)' })
    // MAP_OUT_OF_REGION_PALETTE.default.fill = '#3a2412'
    expect(screen.getByTestId('geo-ar')).toHaveStyle({ fill: 'rgb(58, 36, 18)' })
  })

  it('prioriza estilos de mapFeedback sobre el dimming regional', () => {
    renderWithI18n(
      <WorldMap
        regionFilter="europe"
        mapFeedback={{
          selectedIso2: 'FR',
          targetIso2: 'DE',
          isCorrect: false,
        }}
      />,
    )

    // MAP_REVEALED_TARGET_PALETTE.default.fill = '#fdd835'
    expect(screen.getByTestId('geo-de')).toHaveStyle({ fill: 'rgb(253, 216, 53)' })
    // MAP_OUT_OF_REGION_PALETTE.default.fill = '#3a2412'
    expect(screen.getByTestId('geo-ar')).toHaveStyle({ fill: 'rgb(58, 36, 18)' })
  })

  // PRD UX feedback modo AI — F2 (RF-F20..RF-F24)
  it('renderiza wrongSelectionsIso2 con el estilo de selección errónea (rojo pleno)', () => {
    renderWithI18n(
      <WorldMap
        mapFeedback={{
          // selected/target apuntan a un ISO2 inexistente en el mock para
          // aislar el efecto de `wrongSelectionsIso2` sobre 'AR'.
          selectedIso2: 'XX',
          targetIso2: 'XX',
          isCorrect: false,
          wrongSelectionsIso2: ['AR'],
        }}
      />,
    )

    // MAP_WRONG_SELECTION_PALETTE.default.fill = '#d94c38'
    expect(screen.getByTestId('geo-ar')).toHaveStyle({ fill: 'rgb(217, 76, 56)' })
  })

  it('atenúa los wrong al cerrar con isCorrect=true y target en verde pleno', () => {
    renderWithI18n(
      <WorldMap
        mapFeedback={{
          selectedIso2: 'DE',
          targetIso2: 'DE',
          isCorrect: true,
          wrongSelectionsIso2: ['AR'],
        }}
      />,
    )

    // MAP_CORRECT_TARGET_PALETTE.default.fill = '#7cb342'
    expect(screen.getByTestId('geo-de')).toHaveStyle({ fill: 'rgb(124, 179, 66)' })
    // MAP_WRONG_SELECTION_DIMMED_PALETTE.default.fill = 'rgba(217, 76, 56, 0.5)'
    expect(screen.getByTestId('geo-ar')).toHaveStyle({ fill: 'rgba(217, 76, 56, 0.5)' })
  })

  it('al cambiar regionFilter centra la proyeccion en el continente y deja pan/zoom en home', () => {
    const { unmount } = renderWithI18n(<WorldMap key="region-world" regionFilter="world" />)
    const mapWorld = screen.getByTestId('composable-map')
    expect(mapWorld).toHaveAttribute('data-projection-scale', '147')
    expect(mapWorld).toHaveAttribute('data-projection-center', '0,0')

    unmount()
    renderWithI18n(<WorldMap key="region-europe" regionFilter="europe" />)
    const rootEurope = screen.getByTestId('world-map-root')
    const mapEurope = screen.getByTestId('composable-map')
    expect(rootEurope).toHaveAttribute('data-viewport-zoom', '1.00')
    expect(rootEurope).toHaveAttribute('data-viewport-center', '0.00,0.00')
    expect(rootEurope).toHaveAttribute('data-map-projection-scale', '147')
    expect(rootEurope).toHaveAttribute('data-map-projection-center', '15,52')
    expect(mapEurope).toHaveAttribute('data-projection-scale', '147')
    expect(mapEurope).toHaveAttribute('data-projection-center', '15,52')
  })

  it('Reset vuelve al centro del continente: pan/zoom en cero manteniendo la proyeccion regional', () => {
    renderWithI18n(<WorldMap regionFilter="europe" />)
    const root = screen.getByTestId('world-map-root')
    const map = screen.getByTestId('composable-map')
    const viewport = screen.getByTestId('world-map-viewport')
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      top: 0,
      right: 200,
      bottom: 100,
      left: 0,
      toJSON: () => ({}),
    })

    expect(root).toHaveAttribute('data-map-projection-scale', '147')
    expect(root).toHaveAttribute('data-map-projection-center', '15,52')

    fireEvent.click(screen.getByRole('button', { name: /Acercar mapa/i }))
    expect(root).not.toHaveAttribute('data-viewport-zoom', '1.00')

    fireEvent.click(screen.getByRole('button', { name: /Restablecer vista del mapa/i }))
    expect(root).toHaveAttribute('data-viewport-zoom', '1.00')
    expect(root).toHaveAttribute('data-viewport-center', '0.00,0.00')
    expect(root).toHaveAttribute('data-map-projection-scale', '147')
    expect(root).toHaveAttribute('data-map-projection-center', '15,52')
    expect(map).toHaveAttribute('data-projection-scale', '147')
    expect(map).toHaveAttribute('data-projection-center', '15,52')
  })

  it('bloquea zoom y clics cuando mapInteractionLocked es true', () => {
    const onCountryClick = vi.fn()
    renderWithI18n(<WorldMap mapInteractionLocked onCountryClick={onCountryClick} />)

    const root = screen.getByTestId('world-map-root')
    expect(root).toHaveAttribute('data-map-interaction-locked', 'true')

    const zoomBefore = root.getAttribute('data-viewport-zoom')
    fireEvent.click(screen.getByRole('button', { name: /Acercar mapa/i }))
    expect(root).toHaveAttribute('data-viewport-zoom', zoomBefore ?? '1.00')

    fireEvent.click(screen.getByTestId('geo-ar'))
    expect(onCountryClick).not.toHaveBeenCalled()
  })
})
