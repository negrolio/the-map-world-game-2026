import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AiPromptSource } from '../../../shared/ai-trivia-api'
import type { GameConfig, GameSession, Player } from '../../types'
import { renderWithI18n } from '../../test/render-with-i18n'
import { GameShell } from './GameShell'

/**
 * Mock del `WorldMap` para tests del shell. El mapa real depende de
 * `react-simple-maps` + `world-atlas/countries-110m.json` y aporta poco aquí:
 * los tests del shell validan copy del cartel y la construcción del
 * `mapFeedback`. Exponemos el feedback como atributo JSON sobre el stub para
 * poder asertar `wrongSelectionsIso2` desde Vitest (PRD UX feedback modo AI,
 * Tarea 3.5). El resto del barrel `../../components` se reexporta tal cual.
 */
vi.mock('../../components', async () => {
  const actual =
    await vi.importActual<typeof import('../../components')>('../../components')
  return {
    ...actual,
    WorldMap: ({
      mapFeedback,
      cameraFocus,
    }: {
      readonly mapFeedback?: import('../../components').MapAnswerFeedback | null
      readonly cameraFocus?: { readonly iso2: string; readonly token: string } | null
    }) => (
      <div
        data-testid="mock-world-map"
        data-feedback={mapFeedback ? JSON.stringify(mapFeedback) : ''}
        data-camera-focus={cameraFocus ? JSON.stringify(cameraFocus) : ''}
      />
    ),
  }
})

const sampleAiSource: AiPromptSource = {
  title: 'Congreso de Tucumán',
  locale: 'es',
  url: 'https://es.wikipedia.org/wiki/Congreso_de_Tucum%C3%A1n',
}

const aiConfig: GameConfig = {
  players: ['Ana'],
  questionMode: 'ai',
  regionFilter: 'world',
  antiCheatMode: 'strict',
  questionCount: 1,
}

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

describe('GameShell — gating AiSourceLink (F1)', () => {
  const noop = (): void => {}
  const answeredAt = '2026-01-01T00:00:00.000Z'

  function buildAiSession(round: GameSession['rounds'][number]): GameSession {
    return {
      id: 'ai-session',
      status: 'playing',
      config: aiConfig,
      players: [lonePlayer],
      rounds: [round],
      activeRoundIndex: 0,
      incidentCount: 0,
      datasetVersion: 't',
    }
  }

  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      mockMediaQueryList(false, query),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('no muestra AiSourceLink con ronda abierta y attempts < MAX', () => {
    const session = buildAiSession({
      id: 'r-1',
      roundNumber: 1,
      targetCountryCode: 'AR',
      prompt: '¿Dónde quedó el congreso del 9 de julio?',
      aiSource: sampleAiSource,
      attempts: [
        {
          playerId: 'player-1',
          selectedCountryCode: 'UY',
          isCorrect: false,
          attemptedAtISO: answeredAt,
          scoreDelta: 0,
        },
      ],
    })

    renderWithI18n(
      <GameShell
        session={session}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={noop}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    expect(screen.queryByTestId('ai-source-link')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ai-source-link-safe-fallback')).not.toBeInTheDocument()
  })

  it('muestra AiSourceLink al acertar en intento 2', () => {
    const session = buildAiSession({
      id: 'r-1',
      roundNumber: 1,
      targetCountryCode: 'AR',
      prompt: '¿Dónde quedó el congreso del 9 de julio?',
      aiSource: sampleAiSource,
      attempts: [
        {
          playerId: 'player-1',
          selectedCountryCode: 'UY',
          isCorrect: false,
          attemptedAtISO: answeredAt,
          scoreDelta: 0,
        },
      ],
      guess: {
        playerId: 'player-1',
        selectedCountryCode: 'AR',
        isCorrect: true,
        answeredAtISO: answeredAt,
      },
    })

    renderWithI18n(
      <GameShell
        session={session}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={noop}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    expect(screen.getByTestId('ai-source-link')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Congreso de Tucumán/i })).toBeInTheDocument()
  })

  it('muestra AiSourceLink al agotar 3 intentos', () => {
    const session = buildAiSession({
      id: 'r-1',
      roundNumber: 1,
      targetCountryCode: 'AR',
      prompt: '¿Dónde quedó el congreso del 9 de julio?',
      aiSource: sampleAiSource,
      attempts: [
        {
          playerId: 'player-1',
          selectedCountryCode: 'UY',
          isCorrect: false,
          attemptedAtISO: answeredAt,
          scoreDelta: 0,
        },
        {
          playerId: 'player-1',
          selectedCountryCode: 'BR',
          isCorrect: false,
          attemptedAtISO: answeredAt,
          scoreDelta: 0,
        },
        {
          playerId: 'player-1',
          selectedCountryCode: 'JP',
          isCorrect: false,
          attemptedAtISO: answeredAt,
          scoreDelta: 0,
        },
      ],
      guess: {
        playerId: 'player-1',
        selectedCountryCode: 'JP',
        isCorrect: false,
        answeredAtISO: answeredAt,
      },
    })

    renderWithI18n(
      <GameShell
        session={session}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={noop}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    expect(screen.getByTestId('ai-source-link')).toBeInTheDocument()
  })
})

describe('GameShell — cameraFocus post-respuesta (MAP-UX-07)', () => {
  const noop = (): void => {}

  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      mockMediaQueryList(false, query),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('no pasa cameraFocus con ronda abierta', () => {
    const session: GameSession = {
      id: 's-open',
      status: 'playing',
      config: baseConfig,
      players: [lonePlayer],
      rounds: [
        {
          id: 'r-1',
          roundNumber: 1,
          targetCountryCode: 'AR',
          prompt: 'Argentina',
        },
      ],
      activeRoundIndex: 0,
      incidentCount: 0,
      datasetVersion: 't',
    }

    renderWithI18n(
      <GameShell
        session={session}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={noop}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    expect(screen.getByTestId('mock-world-map')).toHaveAttribute('data-camera-focus', '')
  })

  it('pasa cameraFocus con el pais correcto al cerrar la ronda', () => {
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

    const raw = screen.getByTestId('mock-world-map').getAttribute('data-camera-focus') ?? ''
    expect(raw).not.toBe('')
    const parsed = JSON.parse(raw) as { iso2: string; token: string }
    expect(parsed.iso2).toBe('AR')
    expect(parsed.token).toBe('0-UY-false')
  })
})

describe('GameShell — feedback intermedio AI y mapFeedback con wrongSelectionsIso2 (F2)', () => {
  const noop = (): void => {}
  const attemptedAt = '2026-01-01T00:00:00.000Z'

  function buildAiSession(round: GameSession['rounds'][number]): GameSession {
    return {
      id: 'ai-session',
      status: 'playing',
      config: aiConfig,
      players: [lonePlayer],
      rounds: [round],
      activeRoundIndex: 0,
      incidentCount: 0,
      datasetVersion: 't',
    }
  }

  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      mockMediaQueryList(false, query),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('cartel intermedio AI con 1 attempt erróneo muestra país clickeado + remaining (2)', () => {
    const session = buildAiSession({
      id: 'r-1',
      roundNumber: 1,
      targetCountryCode: 'AR',
      prompt: '¿Dónde quedó el congreso del 9 de julio?',
      aiSource: sampleAiSource,
      attempts: [
        {
          playerId: 'player-1',
          selectedCountryCode: 'UY',
          isCorrect: false,
          attemptedAtISO: attemptedAt,
          scoreDelta: 0,
        },
      ],
    })

    renderWithI18n(
      <GameShell
        session={session}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={noop}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    const feedback = screen.getByTestId('ai-attempt-feedback')
    expect(feedback).toHaveTextContent(/Mal!/i)
    expect(feedback).toHaveTextContent(/Uruguay/i)
    expect(feedback).toHaveTextContent(/Te quedan 2 intento/i)
  })

  it('cartel "Bien!" con 2 attempts previos erróneos muestra país correcto y mapFeedback con wrongSelectionsIso2', () => {
    const session = buildAiSession({
      id: 'r-1',
      roundNumber: 1,
      targetCountryCode: 'AR',
      prompt: '¿Dónde quedó el congreso del 9 de julio?',
      aiSource: sampleAiSource,
      attempts: [
        {
          playerId: 'player-1',
          selectedCountryCode: 'UY',
          isCorrect: false,
          attemptedAtISO: attemptedAt,
          scoreDelta: 0,
        },
        {
          playerId: 'player-1',
          selectedCountryCode: 'BR',
          isCorrect: false,
          attemptedAtISO: attemptedAt,
          scoreDelta: 0,
        },
        {
          playerId: 'player-1',
          selectedCountryCode: 'AR',
          isCorrect: true,
          attemptedAtISO: attemptedAt,
          scoreDelta: 0.25,
        },
      ],
      guess: {
        playerId: 'player-1',
        selectedCountryCode: 'AR',
        isCorrect: true,
        answeredAtISO: attemptedAt,
      },
    })

    renderWithI18n(
      <GameShell
        session={session}
        guessSubmitError={null}
        antiCheatNotice={null}
        onCountryClick={noop}
        onAdvanceRound={noop}
        onExitToSetup={noop}
        onExitToHome={noop}
      />,
    )

    const feedback = screen.getByTestId('guess-feedback')
    expect(feedback).toHaveTextContent(/Bien!/i)
    expect(feedback).toHaveTextContent(/Argentina/i)

    const mockMap = screen.getByTestId('mock-world-map')
    const raw = mockMap.getAttribute('data-feedback') ?? ''
    expect(raw).not.toBe('')
    const parsed = JSON.parse(raw) as {
      selectedIso2: string
      targetIso2: string
      isCorrect: boolean
      wrongSelectionsIso2?: readonly string[]
    }
    expect(parsed.selectedIso2).toBe('AR')
    expect(parsed.targetIso2).toBe('AR')
    expect(parsed.isCorrect).toBe(true)
    expect(parsed.wrongSelectionsIso2).toEqual(['UY', 'BR'])
  })
})
