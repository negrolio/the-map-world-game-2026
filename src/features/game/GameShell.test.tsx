import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GameConfig, GameSession, Player } from '../../types'
import { renderWithI18n } from '../../test/render-with-i18n'
import { GameShell } from './GameShell'

const baseConfig: GameConfig = {
  players: ['A'],
  questionMode: 'country',
  regionFilter: 'world',
  antiCheatMode: 'normal',
  questionCount: 3,
}

const lonePlayer: Player = {
  id: 'player-1',
  name: 'Ana',
  turnOrder: 0,
  score: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
}

function mockMediaQueryList(matches: boolean, query: string): MediaQueryList {
  return {
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList
}

function buildSessionWithGuess(options?: { readonly isLastRound?: boolean }): GameSession {
  const roundCount = 3
  const activeRoundIndex = options?.isLastRound === true ? roundCount - 1 : 0
  const rounds = Array.from({ length: roundCount }, (_, index) => {
    const base = {
      id: `r-${index + 1}`,
      roundNumber: index + 1,
      targetCountryCode: 'AR',
      prompt: 'Argentina',
    }
    if (index !== activeRoundIndex) {
      return base
    }
    return {
      ...base,
      guess: {
        playerId: 'player-1',
        selectedCountryCode: 'UY',
        isCorrect: false,
        answeredAtISO: '2026-01-01T00:00:00.000Z',
      },
    }
  })
  return {
    id: 's',
    status: 'playing',
    config: baseConfig,
    players: [lonePlayer],
    rounds,
    activeRoundIndex,
    incidentCount: 0,
    datasetVersion: 't',
  }
}

describe('GameShell — atajo avanzar ronda (desktop)', () => {
  const noop = (): void => {}

  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      mockMediaQueryList(query === '(hover: hover) and (pointer: fine)', query),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('con puntero fino y respuesta ya enviada, Enter global llama a onAdvanceRound', () => {
    const onAdvanceRound = vi.fn()
    renderWithI18n(
      <GameShell
        session={buildSessionWithGuess()}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={onAdvanceRound}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onAdvanceRound).toHaveBeenCalledTimes(1)
  })

  it('con puntero fino, barra espaciadora avanza', () => {
    const onAdvanceRound = vi.fn()
    renderWithI18n(
      <GameShell
        session={buildSessionWithGuess()}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={onAdvanceRound}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    fireEvent.keyDown(window, { key: ' ', code: 'Space' })
    expect(onAdvanceRound).toHaveBeenCalledTimes(1)
  })

  it('no avanza con tecla si matchMedia indica puntero no fino', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => mockMediaQueryList(false, query))

    const onAdvanceRound = vi.fn()
    renderWithI18n(
      <GameShell
        session={buildSessionWithGuess()}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={onAdvanceRound}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onAdvanceRound).not.toHaveBeenCalled()
  })

  it('no intercepta Enter cuando el foco está en otro botón', () => {
    const onAdvanceRound = vi.fn()
    renderWithI18n(
      <GameShell
        session={buildSessionWithGuess()}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={onAdvanceRound}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    screen.getByRole('button', { name: /Volver al setup/i }).focus()
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onAdvanceRound).not.toHaveBeenCalled()
  })

  it('muestra leyenda de teclado solo con puntero fino', () => {
    renderWithI18n(
      <GameShell
        session={buildSessionWithGuess()}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={noop}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    expect(screen.getByTestId('advance-round-kbd-hint')).toHaveTextContent(/Enter o barra espaciadora/i)
  })

  it('sin puntero fino no muestra leyenda ni aria-keyshortcuts', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => mockMediaQueryList(false, query))

    renderWithI18n(
      <GameShell
        session={buildSessionWithGuess()}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={noop}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    expect(screen.queryByTestId('advance-round-kbd-hint')).not.toBeInTheDocument()
    expect(screen.getByTestId('advance-round-button')).not.toHaveAttribute('aria-keyshortcuts')
  })
})
