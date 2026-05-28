import { screen, within } from '@testing-library/react'
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
import { AiRoundsSummary } from './AiRoundsSummary'

const argentinaSource: AiPromptSource = {
  title: 'Argentina — Wikipedia',
  locale: 'es',
  url: 'https://es.wikipedia.org/wiki/Argentina',
}

const brasilSource: AiPromptSource = {
  title: 'Brasil — Wikipedia',
  locale: 'es',
  url: 'https://es.wikipedia.org/wiki/Brasil',
}

const japonSourceUnsafe: AiPromptSource = {
  title: 'Página dudosa',
  locale: 'es',
  url: 'https://evil.example.com/jp',
}

const aiConfig: GameConfig = {
  players: ['Ana'],
  questionMode: 'ai',
  regionFilter: 'world',
  antiCheatMode: 'strict',
  questionCount: 3,
}

const lonePlayer: Player = {
  id: 'player-1',
  name: 'Ana',
  turnOrder: 0,
  score: 1.25,
  correctAnswers: 2,
  wrongAnswers: 1,
}

function buildAttempt(
  selectedCountryCode: string,
  isCorrect: boolean,
  scoreDelta: number,
): AiAttempt {
  return {
    playerId: 'player-1',
    selectedCountryCode,
    isCorrect,
    attemptedAtISO: '2026-01-01T00:00:00.000Z',
    scoreDelta,
  }
}

function buildAiSession(rounds: readonly Round[]): GameSession {
  return {
    id: 'session-summary',
    status: 'finished',
    config: aiConfig,
    players: [lonePlayer],
    rounds,
    activeRoundIndex: rounds.length - 1,
    incidentCount: 0,
    datasetVersion: 'test',
  }
}

describe('AiRoundsSummary', () => {
  it('lista las tres rondas con prompt, país objetivo y testid por roundNumber', () => {
    const rounds: readonly Round[] = [
      {
        id: 'r-1',
        roundNumber: 1,
        targetCountryCode: 'AR',
        prompt: 'Adivinanza ronda 1',
        attempts: [buildAttempt('AR', true, 1)],
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'AR',
          isCorrect: true,
          answeredAtISO: '2026-01-01T00:00:01.000Z',
        },
        aiSource: argentinaSource,
      },
      {
        id: 'r-2',
        roundNumber: 2,
        targetCountryCode: 'BR',
        prompt: 'Adivinanza ronda 2',
        attempts: [
          buildAttempt('JP', false, 0),
          buildAttempt('AR', false, 0),
          buildAttempt('BR', true, 0.25),
        ],
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'BR',
          isCorrect: true,
          answeredAtISO: '2026-01-01T00:00:02.000Z',
        },
        aiSource: brasilSource,
      },
      {
        id: 'r-3',
        roundNumber: 3,
        targetCountryCode: 'JP',
        prompt: 'Adivinanza ronda 3',
        attempts: [
          buildAttempt('AR', false, 0),
          buildAttempt('BR', false, 0),
          buildAttempt('UY', false, 0),
        ],
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'UY',
          isCorrect: false,
          answeredAtISO: '2026-01-01T00:00:03.000Z',
        },
        aiSource: japonSourceUnsafe,
      },
    ]

    renderWithI18n(<AiRoundsSummary session={buildAiSession(rounds)} locale="es" />)

    expect(screen.getByTestId('ai-rounds-summary')).toBeInTheDocument()
    expect(screen.getByText('Repaso de adivinanzas')).toBeInTheDocument()
    expect(screen.getByText('Adivinanza ronda 1')).toBeInTheDocument()
    expect(screen.getByText('Adivinanza ronda 2')).toBeInTheDocument()
    expect(screen.getByText('Adivinanza ronda 3')).toBeInTheDocument()

    const entry1 = screen.getByTestId('ai-rounds-summary-entry-1')
    expect(within(entry1).getByText('Ronda 1')).toBeInTheDocument()
    expect(within(entry1).getByText('Argentina')).toBeInTheDocument()

    const entry2 = screen.getByTestId('ai-rounds-summary-entry-2')
    expect(within(entry2).getByText('Ronda 2')).toBeInTheDocument()
    expect(within(entry2).getByText('Brasil')).toBeInTheDocument()

    const entry3 = screen.getByTestId('ai-rounds-summary-entry-3')
    expect(within(entry3).getByText('Ronda 3')).toBeInTheDocument()
    expect(within(entry3).getByText('Japón')).toBeInTheDocument()
  })

  it('muestra "Acertaste en intento 1" con delta +1 para acierto en intento 1', () => {
    const rounds: readonly Round[] = [
      {
        id: 'r-1',
        roundNumber: 1,
        targetCountryCode: 'AR',
        prompt: 'Prompt',
        attempts: [buildAttempt('AR', true, 1)],
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'AR',
          isCorrect: true,
          answeredAtISO: '2026-01-01T00:00:01.000Z',
        },
        aiSource: argentinaSource,
      },
    ]

    renderWithI18n(<AiRoundsSummary session={buildAiSession(rounds)} locale="es" />)

    const entry = screen.getByTestId('ai-rounds-summary-entry-1')
    expect(within(entry).getByText('Acertaste en intento 1')).toBeInTheDocument()
    expect(within(entry).getByText('+1 pts')).toBeInTheDocument()
  })

  it('muestra "Acertaste en intento 3" con delta +0.25 para acierto en intento 3', () => {
    const rounds: readonly Round[] = [
      {
        id: 'r-2',
        roundNumber: 2,
        targetCountryCode: 'BR',
        prompt: 'Prompt',
        attempts: [
          buildAttempt('JP', false, 0),
          buildAttempt('AR', false, 0),
          buildAttempt('BR', true, 0.25),
        ],
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'BR',
          isCorrect: true,
          answeredAtISO: '2026-01-01T00:00:02.000Z',
        },
        aiSource: brasilSource,
      },
    ]

    renderWithI18n(<AiRoundsSummary session={buildAiSession(rounds)} locale="es" />)

    const entry = screen.getByTestId('ai-rounds-summary-entry-2')
    expect(within(entry).getByText('Acertaste en intento 3')).toBeInTheDocument()
    expect(within(entry).getByText('+0.25 pts')).toBeInTheDocument()
  })

  it('muestra "Sin acierto" con delta 0 para fallo definitivo (3 intentos erróneos)', () => {
    const rounds: readonly Round[] = [
      {
        id: 'r-3',
        roundNumber: 3,
        targetCountryCode: 'JP',
        prompt: 'Prompt',
        attempts: [
          buildAttempt('AR', false, 0),
          buildAttempt('BR', false, 0),
          buildAttempt('UY', false, 0),
        ],
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'UY',
          isCorrect: false,
          answeredAtISO: '2026-01-01T00:00:03.000Z',
        },
        aiSource: argentinaSource,
      },
    ]

    renderWithI18n(<AiRoundsSummary session={buildAiSession(rounds)} locale="es" />)

    const entry = screen.getByTestId('ai-rounds-summary-entry-3')
    expect(within(entry).getByText('Sin acierto')).toBeInTheDocument()
    expect(within(entry).getByText('0 pts')).toBeInTheDocument()
    expect(within(entry).queryByText(/Acertaste/)).toBeNull()
  })

  it('renderiza anchor target="_blank" rel="noopener noreferrer" para URL Wikipedia válida', () => {
    const rounds: readonly Round[] = [
      {
        id: 'r-1',
        roundNumber: 1,
        targetCountryCode: 'AR',
        prompt: 'Prompt',
        attempts: [buildAttempt('AR', true, 1)],
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'AR',
          isCorrect: true,
          answeredAtISO: '2026-01-01T00:00:01.000Z',
        },
        aiSource: argentinaSource,
      },
    ]

    renderWithI18n(<AiRoundsSummary session={buildAiSession(rounds)} locale="es" />)

    const entry = screen.getByTestId('ai-rounds-summary-entry-1')
    const sourceLinkWrapper = within(entry).getByTestId('ai-rounds-summary-source-link')
    const anchor = within(sourceLinkWrapper).getByRole('link', { name: /Argentina — Wikipedia/i })
    expect(anchor.getAttribute('href')).toBe(argentinaSource.url)
    expect(anchor.getAttribute('target')).toBe('_blank')
    expect(anchor.getAttribute('rel')).toContain('noopener')
    expect(anchor.getAttribute('rel')).toContain('noreferrer')
  })

  it('renderiza texto plano (sin anchor) para URL no Wikipedia', () => {
    const rounds: readonly Round[] = [
      {
        id: 'r-3',
        roundNumber: 3,
        targetCountryCode: 'JP',
        prompt: 'Prompt',
        attempts: [
          buildAttempt('AR', false, 0),
          buildAttempt('BR', false, 0),
          buildAttempt('UY', false, 0),
        ],
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'UY',
          isCorrect: false,
          answeredAtISO: '2026-01-01T00:00:03.000Z',
        },
        aiSource: japonSourceUnsafe,
      },
    ]

    renderWithI18n(<AiRoundsSummary session={buildAiSession(rounds)} locale="es" />)

    const entry = screen.getByTestId('ai-rounds-summary-entry-3')
    expect(within(entry).getByTestId('ai-rounds-summary-source-fallback')).toBeInTheDocument()
    expect(within(entry).queryByTestId('ai-rounds-summary-source-link')).toBeNull()
    expect(within(entry).queryByRole('link')).toBeNull()
    expect(within(entry).getByText('Página dudosa')).toBeInTheDocument()
  })

  it('omite el bloque de fuente cuando aiSource es undefined', () => {
    const rounds: readonly Round[] = [
      {
        id: 'r-1',
        roundNumber: 1,
        targetCountryCode: 'AR',
        prompt: 'Prompt',
        attempts: [buildAttempt('AR', true, 1)],
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'AR',
          isCorrect: true,
          answeredAtISO: '2026-01-01T00:00:01.000Z',
        },
      },
    ]

    renderWithI18n(<AiRoundsSummary session={buildAiSession(rounds)} locale="es" />)

    const entry = screen.getByTestId('ai-rounds-summary-entry-1')
    expect(within(entry).queryByTestId('ai-rounds-summary-source-link')).toBeNull()
    expect(within(entry).queryByTestId('ai-rounds-summary-source-fallback')).toBeNull()
  })

  it('asume intento N=1 cuando guess.isCorrect=true y attempts está ausente (RF-F72 fallback)', () => {
    const rounds: readonly Round[] = [
      {
        id: 'r-1',
        roundNumber: 1,
        targetCountryCode: 'AR',
        prompt: 'Prompt',
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'AR',
          isCorrect: true,
          answeredAtISO: '2026-01-01T00:00:01.000Z',
        },
      },
    ]

    renderWithI18n(<AiRoundsSummary session={buildAiSession(rounds)} locale="es" />)

    const entry = screen.getByTestId('ai-rounds-summary-entry-1')
    expect(within(entry).getByText('Acertaste en intento 1')).toBeInTheDocument()
    expect(within(entry).getByText('+1 pts')).toBeInTheDocument()
  })

  it('respeta locale en inglés para nombre de país y copy', () => {
    const rounds: readonly Round[] = [
      {
        id: 'r-1',
        roundNumber: 1,
        targetCountryCode: 'BR',
        prompt: 'Prompt EN',
        attempts: [buildAttempt('BR', true, 1)],
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'BR',
          isCorrect: true,
          answeredAtISO: '2026-01-01T00:00:01.000Z',
        },
      },
    ]

    renderWithI18n(<AiRoundsSummary session={buildAiSession(rounds)} locale="en" />)

    const entry = screen.getByTestId('ai-rounds-summary-entry-1')
    expect(within(entry).getByText('Brazil')).toBeInTheDocument()
  })
})
