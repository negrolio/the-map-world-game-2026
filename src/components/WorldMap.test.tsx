import { fireEvent, render, screen } from '@testing-library/react'
import type { CSSProperties, KeyboardEventHandler, MouseEventHandler, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { WorldMap } from './WorldMap'

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
    render(<WorldMap />)

    expect(screen.getByRole('button', { name: /Acercar mapa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Alejar mapa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Restablecer vista del mapa/i })).toBeInTheDocument()
  })

  it('actualiza el zoom en el estado del viewport al usar controles', () => {
    render(<WorldMap />)
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

  it('sincroniza pan al arrastrar dentro del viewport', () => {
    render(<WorldMap />)
    const root = screen.getByTestId('world-map-root')
    const viewport = screen.getByTestId('world-map-viewport')

    fireEvent.mouseDown(viewport, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(viewport, { clientX: 30, clientY: 18 })
    fireEvent.mouseUp(viewport)

    expect(root).toHaveAttribute('data-viewport-zoom', '1.00')
    expect(root).toHaveAttribute('data-viewport-center', '20.00,8.00')
  })

  it('no aplica transicion CSS al transform del mapa (pan lineal respecto del puntero)', () => {
    render(<WorldMap />)
    const layer = screen.getByTestId('world-map-transform-layer')
    expect(layer.className).not.toMatch(/transition-transform/)
  })

  it('aplica zoom con la rueda del mouse dentro del mapa', () => {
    render(<WorldMap />)
    const root = screen.getByTestId('world-map-root')
    const viewport = screen.getByTestId('world-map-viewport')

    expect(root).toHaveAttribute('data-viewport-zoom', '1.00')

    fireEvent.wheel(viewport, { deltaY: -100, clientX: 50, clientY: 40 })
    expect(root).toHaveAttribute('data-viewport-zoom', '1.30')
    expect(root).toHaveAttribute('data-viewport-center', '-15.25,-12.20')

    fireEvent.wheel(viewport, { deltaY: 100, clientX: 50, clientY: 40 })
    expect(root).toHaveAttribute('data-viewport-zoom', '1.00')
    expect(root).toHaveAttribute('data-viewport-center', '0.00,0.00')
  })

  it('bloquea click de pais cuando answerLocked esta activo', () => {
    const onCountryClick = vi.fn()
    render(<WorldMap answerLocked onCountryClick={onCountryClick} />)

    fireEvent.click(screen.getByTestId('geo-ar'))

    expect(onCountryClick).not.toHaveBeenCalled()
  })

  it('atenua paises fuera del continente activo cuando regionFilter no es world', () => {
    render(<WorldMap regionFilter="europe" />)
    expect(screen.getByTestId('world-map-root')).toHaveAttribute('data-region-filter', 'europe')

    // MAP_ACTIVE_CONTINENT_PALETTE.default.fill = '#d4bf95'
    expect(screen.getByTestId('geo-de')).toHaveStyle({ fill: 'rgb(212, 191, 149)' })
    // MAP_OUT_OF_REGION_PALETTE.default.fill = '#3a2412'
    expect(screen.getByTestId('geo-ar')).toHaveStyle({ fill: 'rgb(58, 36, 18)' })
  })

  it('prioriza estilos de mapFeedback sobre el dimming regional', () => {
    render(
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

  it('al cambiar regionFilter centra la proyeccion en el continente y deja pan/zoom en home', () => {
    const { unmount } = render(<WorldMap key="region-world" regionFilter="world" />)
    const mapWorld = screen.getByTestId('composable-map')
    expect(mapWorld).toHaveAttribute('data-projection-scale', '147')
    expect(mapWorld).toHaveAttribute('data-projection-center', '0,0')

    unmount()
    render(<WorldMap key="region-europe" regionFilter="europe" />)
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
    render(<WorldMap regionFilter="europe" />)
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
})
