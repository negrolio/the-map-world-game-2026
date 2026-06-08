import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { AiPromptSource } from '../../../shared/ai-trivia-api'
import { renderWithI18n } from '../../test/render-with-i18n'
import type {
  AiAttempt,
  GameConfig,
  GameSession,
  Player,
  Round,
} from '../../types'
import { ResultsView } from './ResultsView'

const argentinaSource: AiPromptSource = {
  title: 'Argentina — Wikipedia',
  locale: 'es',
  url: 'https://es.wikipedia.org/wiki/Argentina',
}

const aiConfig: GameConfig = {
  players: ['Ana'],
  questionMode: 'ai',
  regionFilter: 'world',
  antiCheatMode: 'strict',
  questionCount: 1,
}

const countryConfig: GameConfig = {
  players: ['Ana'],
  questionMode: 'country',
  regionFilter: 'world',
  antiCheatMode: 'normal',
  questionCount: 1,
}

const lonePlayer: Player = {
  id: 'player-1',
  name: 'Ana',
  turnOrder: 0,
  score: 1,
  correctAnswers: 1,
  wrongAnswers: 0,
}

function aiAttempt(selectedCountryCode: string, isCorrect: boolean): AiAttempt {
  return {
    playerId: 'player-1',
    selectedCountryCode,
    isCorrect,
    attemptedAtISO: '2026-01-01T00:00:00.000Z',
    scoreDelta: isCorrect ? 1 : 0,
  }
}

function aiFinishedRound(): Round {
  return {
    id: 'r-1',
    roundNumber: 1,
    targetCountryCode: 'AR',
    prompt: 'Adivinanza AR',
    attempts: [aiAttempt('AR', true)],
    guess: {
      playerId: 'player-1',
      selectedCountryCode: 'AR',
      isCorrect: true,
      answeredAtISO: '2026-01-01T00:00:01.000Z',
    },
    aiSource: argentinaSource,
  }
}

function countryFinishedRound(): Round {
  return {
    id: 'r-1',
    roundNumber: 1,
    targetCountryCode: 'AR',
    prompt: 'Argentina',
    guess: {
      playerId: 'player-1',
      selectedCountryCode: 'AR',
      isCorrect: true,
      answeredAtISO: '2026-01-01T00:00:01.000Z',
    },
  }
}

function buildAiFinishedSession(): GameSession {
  return {
    id: 'session-ai',
    status: 'finished',
    config: aiConfig,
    players: [lonePlayer],
    rounds: [aiFinishedRound()],
    activeRoundIndex: 0,
    incidentCount: 0,
    datasetVersion: 'test',
  }
}

function buildCountryFinishedSession(): GameSession {
  return {
    id: 'session-country',
    status: 'finished',
    config: countryConfig,
    players: [lonePlayer],
    rounds: [countryFinishedRound()],
    activeRoundIndex: 0,
    incidentCount: 0,
    datasetVersion: 'test',
  }
}

const playerTwo: Player = {
  id: 'player-2',
  name: 'Bob',
  turnOrder: 1,
  score: 0,
  correctAnswers: 0,
  wrongAnswers: 1,
}

function buildTwoPlayerSession(): GameSession {
  return {
    id: 'session-two',
    status: 'finished',
    config: { ...countryConfig, players: ['Ana', 'Bob'] },
    players: [lonePlayer, playerTwo],
    rounds: [countryFinishedRound()],
    activeRoundIndex: 0,
    incidentCount: 0,
    datasetVersion: 'test',
  }
}

describe('ResultsView — layout de cierre', () => {
  const noop = (): void => {}

  it('con 1 jugador muestra hero "Tu resultado" y un finished-rank', () => {
    renderWithI18n(
      <ResultsView
        session={buildCountryFinishedSession()}
        antiCheatNotice={null}
        onReplaySameConfig={noop}
        onGoToSetup={noop}
        onGoToHome={noop}
      />,
    )

    expect(screen.getByText('Tu resultado')).toBeInTheDocument()
    expect(screen.getByTestId('game-winner')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^finished-rank-/)).toHaveLength(1)
    expect(screen.queryByText('Podio')).toBeNull()
  })

  it('con 2 jugadores muestra podio y dos finished-rank', () => {
    renderWithI18n(
      <ResultsView
        session={buildTwoPlayerSession()}
        antiCheatNotice={null}
        onReplaySameConfig={noop}
        onGoToSetup={noop}
        onGoToHome={noop}
      />,
    )

    expect(screen.getByText('Ganador')).toBeInTheDocument()
    expect(screen.getByText('Podio')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^finished-rank-/)).toHaveLength(2)
    expect(screen.getByTestId('game-finished-status')).toHaveTextContent(
      /finalizada por rondas/i,
    )
  })

  it('metadata en chips conserva incidentes visibles', () => {
    renderWithI18n(
      <ResultsView
        session={{ ...buildCountryFinishedSession(), incidentCount: 2 }}
        antiCheatNotice={null}
        onReplaySameConfig={noop}
        onGoToSetup={noop}
        onGoToHome={noop}
      />,
    )

    expect(screen.getByTestId('anti-cheat-incidents')).toHaveTextContent(/2/)
  })
})

describe('ResultsView — sección AI', () => {
  const noop = (): void => {}

  it('no renderiza AiRoundsSummary en modo country', () => {
    renderWithI18n(
      <ResultsView
        session={buildCountryFinishedSession()}
        antiCheatNotice={null}
        onReplaySameConfig={noop}
        onGoToSetup={noop}
        onGoToHome={noop}
      />,
    )

    expect(screen.queryByTestId('ai-rounds-summary')).toBeNull()
    expect(screen.queryByText('Repaso de adivinanzas')).toBeNull()
  })

  it('renderiza AiRoundsSummary en modo AI', () => {
    renderWithI18n(
      <ResultsView
        session={buildAiFinishedSession()}
        antiCheatNotice={null}
        onReplaySameConfig={noop}
        onGoToSetup={noop}
        onGoToHome={noop}
      />,
    )

    expect(screen.getByTestId('ai-rounds-summary')).toBeInTheDocument()
    expect(screen.getByText('Repaso de adivinanzas')).toBeInTheDocument()
    expect(screen.getByTestId('ai-rounds-summary-entry-1')).toBeInTheDocument()
    expect(screen.getByText('Acertaste en intento 1')).toBeInTheDocument()
    expect(screen.getByText('+1 pts')).toBeInTheDocument()
  })
})
