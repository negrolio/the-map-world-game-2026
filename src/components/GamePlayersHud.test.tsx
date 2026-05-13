import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { GameSession } from '../types'
import { renderWithI18n } from '../test/render-with-i18n'
import { GamePlayersHud } from './GamePlayersHud'

const initialInnerWidth = window.innerWidth

function setTestViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  Object.defineProperty(window, 'outerWidth', { configurable: true, writable: true, value: width })
}

function restoreTestViewportWidth(): void {
  setTestViewportWidth(initialInnerWidth)
}

const baseSession: GameSession = {
  id: 's1',
  status: 'playing',
  config: {
    players: ['Jugador 1'],
    questionMode: 'country',
    regionFilter: 'world',
    antiCheatMode: 'normal',
    questionCount: 5,
  },
  players: [
    {
      id: 'player-1',
      name: 'Jugador 1',
      turnOrder: 1,
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
    },
  ],
  rounds: [{ id: 'r1', roundNumber: 1, targetCountryCode: 'JP', prompt: 'Japan' }],
  activeRoundIndex: 0,
  incidentCount: 0,
  datasetVersion: 'test',
}

describe('GamePlayersHud', () => {
  afterEach(() => {
    restoreTestViewportWidth()
  })

  it('en movil muestra turno en la lista compacta sin acordeon', () => {
    setTestViewportWidth(375)
    renderWithI18n(<GamePlayersHud session={baseSession} roundAnswered={false} />)

    const mobileRow = screen.getByTestId('player-hud-mobile-player-1')
    expect(mobileRow).toBeVisible()
    expect(within(mobileRow).getByText('Turno')).toBeInTheDocument()
    expect(mobileRow).toHaveAttribute('aria-current', 'true')
  })

  it('con roundAnswered no muestra badge de turno ni aria-current en movil', () => {
    setTestViewportWidth(375)
    renderWithI18n(<GamePlayersHud session={baseSession} roundAnswered />)

    const mobileRow = screen.getByTestId('player-hud-mobile-player-1')
    expect(within(mobileRow).queryByText('Turno')).not.toBeInTheDocument()
    expect(mobileRow).not.toHaveAttribute('aria-current')
    expect(screen.getByTestId('hud-active-player-announcement')).toHaveTextContent(/Ronda respondida/i)
  })

  it('en escritorio mantiene tarjeta con turno', () => {
    setTestViewportWidth(1200)
    renderWithI18n(<GamePlayersHud session={baseSession} roundAnswered={false} />)

    const card = screen.getByTestId('player-hud-player-1')
    expect(card).toBeVisible()
    expect(within(card).getByText('Turno')).toBeInTheDocument()
  })
})
