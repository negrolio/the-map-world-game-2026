import { fireEvent, screen } from '@testing-library/react'
import type { CSSProperties, KeyboardEventHandler, MouseEventHandler, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { renderWithI18n } from './test/render-with-i18n'

/**
 * F3 (UX feedback modo AI, PRD §4.4 RF-I40..RF-I45) — pausa de listeners
 * anti-cheat mientras la ronda activa está cerrada y el usuario aún no avanzó.
 *
 * Mock de `react-simple-maps` con una sola geografía (Argentina). Permite
 * disparar `onCountryClick` real desde Vitest sin depender de `world-atlas`
 * en jsdom. Patrón heredado de `src/components/WorldMap.test.tsx`.
 */
const { mockGeographies } = vi.hoisted(() => ({
  mockGeographies: [
    { rsmKey: 'geo-ar', id: '032', properties: { name: 'Argentina', ISO_A2: 'AR' } },
  ],
}))

vi.mock('react-simple-maps', () => {
  return {
    ComposableMap: ({ children }: { children: ReactNode }) => (
      <svg data-testid="composable-map">{children}</svg>
    ),
    Geographies: ({
      children,
    }: {
      children: (arg: { geographies: Array<Record<string, unknown>> }) => ReactNode
    }) => children({ geographies: mockGeographies }),
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

function clickHomeGameCard(): void {
  fireEvent.click(screen.getByTestId('home-card-game'))
}

function startStrictCountryGame(): void {
  renderWithI18n(<App />)
  clickHomeGameCard()
  fireEvent.click(screen.getByTestId('setup-options-toggle'))
  fireEvent.click(screen.getByRole('radio', { name: /Estricto/i }))
  fireEvent.click(screen.getAllByRole('button', { name: /Jugar ahora/i })[0])
}

describe('App — anti-cheat pausa entre rondas (F3 / RF-I40..RF-I45)', () => {
  it('blur con ronda cerrada no incrementa incidentCount ni aborta la partida', () => {
    startStrictCountryGame()

    fireEvent.click(screen.getByTestId('geo-ar'))
    expect(screen.getByTestId('advance-round-button')).toBeInTheDocument()

    fireEvent.blur(window)

    expect(screen.queryByTestId('game-finished-status')).not.toBeInTheDocument()
    expect(screen.getByTestId('game-shell')).toBeInTheDocument()
  })

  it('blur con ronda abierta sigue abortando en strict (regresion RF-I43)', () => {
    startStrictCountryGame()

    fireEvent.blur(window)

    expect(screen.getByTestId('game-finished-status')).toHaveTextContent(/abortada por anti-cheat/i)
    expect(screen.getByTestId('anti-cheat-incidents')).toHaveTextContent(/registrados:?\s*1\b/)
  })

  it('multiples blur con ronda cerrada no acumulan incidentes y la siguiente ronda abierta sigue contando como 1', () => {
    startStrictCountryGame()

    fireEvent.click(screen.getByTestId('geo-ar'))
    expect(screen.getByTestId('advance-round-button')).toBeInTheDocument()

    for (let index = 0; index < 3; index += 1) {
      fireEvent.blur(window)
    }
    expect(screen.queryByTestId('game-finished-status')).not.toBeInTheDocument()
    expect(screen.getByTestId('game-shell')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('advance-round-button'))
    fireEvent.blur(window)

    expect(screen.getByTestId('game-finished-status')).toHaveTextContent(/abortada por anti-cheat/i)
    expect(screen.getByTestId('anti-cheat-incidents')).toHaveTextContent(/registrados:?\s*1\b/)
  })
})
