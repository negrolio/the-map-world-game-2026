import { fireEvent, render, screen } from '@testing-library/react'
import type { KeyboardEventHandler, MouseEventHandler, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { WorldMap } from './WorldMap'

vi.mock('react-simple-maps', () => {
  return {
    ComposableMap: ({ children }: { children: ReactNode }) => (
      <svg data-testid="composable-map">{children}</svg>
    ),
    Geographies: ({ children }: { children: (arg: { geographies: Array<Record<string, unknown>> }) => ReactNode }) =>
      children({
        geographies: [
          {
            rsmKey: 'geo-ar',
            id: '032',
            properties: { name: 'Argentina', ISO_A2: 'AR' },
          },
        ],
      }),
    Geography: ({
      onClick,
      onKeyDown,
      ...props
    }: {
      onClick?: MouseEventHandler<SVGPathElement>
      onKeyDown?: KeyboardEventHandler<SVGPathElement>
      [key: string]: unknown
    }) => (
      <path
        data-testid="geo-ar"
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown}
        {...props}
      />
    ),
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
})
