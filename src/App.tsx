import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AiTriviaTagId } from '../shared/ai-trivia-tags-schema'
import { ChunkyButton } from './components/ui'
import { countriesCatalog } from './data'
import { getContinentForIso2 } from './data/countries'
import { AiPromptsErrorView } from './features/game/AiPromptsErrorView'
import { AiPromptsLoadingView } from './features/game/AiPromptsLoadingView'
import { GameShell } from './features/game/GameShell'
import { ResultsView } from './features/game/ResultsView'
import { HomeView } from './features/home/HomeView'
import { LearnMapView } from './features/learn'
import { SetupView } from './features/setup/SetupView'
import { validateSetupConfigSchema } from './features/setup'
import { normalizeAppLocale } from './i18n/app-locale'
import { translateApiErrorCode } from './i18n/translate-api-error'
import {
  PRODUCT_RULES,
  addSeenRiddleId,
  advanceToNextRoundOrFinish,
  applyAntiCheatIncident,
  beginPlayingSession,
  buildQuestionPool,
  createGameSession,
  fetchAiPrompts,
  getActivePlayerIdForRound,
  getSeenRiddleIds,
  mapAiItemsToPool,
  submitRoundGuess,
  validateConfig,
} from './services'
import type {
  AntiCheatMode,
  GameConfig,
  GameSession,
  IsoCountryCode,
  QuestionMode,
  RegionFilter,
} from './types'

type AppView = 'home' | 'setup' | 'game' | 'learn'

type AiStartupState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly requestedItems: number; readonly config: GameConfig }
  | { readonly kind: 'error'; readonly errorCode: string; readonly canRetry: boolean; readonly config: GameConfig }

export function App() {
  const { t: tApp } = useTranslation('app')
  const { t: tGame } = useTranslation('game')
  const { t: tErr } = useTranslation('errors')
  const { i18n } = useTranslation()

  const [currentView, setCurrentView] = useState<AppView>('home')
  const [playerCount, setPlayerCount] = useState<number>(1)
  const [players, setPlayers] = useState<readonly string[]>(['Jugador 1'])
  const [questionMode, setQuestionMode] = useState<QuestionMode>('country')
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('world')
  const [antiCheatMode, setAntiCheatMode] = useState<AntiCheatMode>('normal')
  const [questionCount, setQuestionCount] = useState<number>(5)
  const [tags, setTags] = useState<readonly AiTriviaTagId[]>([])
  const [setupSubmitMessage, setSetupSubmitMessage] = useState<string | null>(null)
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [guessSubmitError, setGuessSubmitError] = useState<string | null>(null)
  const [antiCheatNotice, setAntiCheatNotice] = useState<string | null>(null)
  const [aiStartup, setAiStartup] = useState<AiStartupState>({ kind: 'idle' })
  const antiCheatLockUntilRef = useRef<number>(0)
  const aiStartupAbortRef = useRef<AbortController | null>(null)

  const availableQuestionsForRegion = useMemo(() => {
    if (regionFilter === 'world') {
      return countriesCatalog.length
    }

    return countriesCatalog.filter((country) => country.continent === regionFilter).length
  }, [regionFilter])

  const effectiveAntiCheatMode: AntiCheatMode = questionMode === 'ai' ? 'strict' : antiCheatMode

  const setupDraft: GameConfig = useMemo(
    () => ({
      players,
      questionMode,
      regionFilter,
      antiCheatMode: effectiveAntiCheatMode,
      questionCount,
      ...(questionMode === 'ai' ? { tags } : {}),
    }),
    [effectiveAntiCheatMode, players, questionCount, questionMode, regionFilter, tags],
  )

  const validationResult = useMemo(
    () =>
      validateConfig({
        config: setupDraft,
        poolSize: availableQuestionsForRegion,
      }),
    [availableQuestionsForRegion, setupDraft],
  )
  const schemaValidationResult = useMemo(
    () => validateSetupConfigSchema(setupDraft),
    [setupDraft],
  )
  const canStartGame = validationResult.isValid && schemaValidationResult.isValid
  const schemaOnlyErrors = useMemo(() => {
    const domainKeys = new Set(validationResult.errors.map((error) => error.messageKey))
    return schemaValidationResult.errors.filter((errorMessage) => !domainKeys.has(errorMessage))
  }, [schemaValidationResult.errors, validationResult.errors])

  async function startGameWithConfig(config: GameConfig): Promise<void> {
    const sessionResponse = createGameSession(config)
    if (!sessionResponse.success) {
      setSetupSubmitMessage(
        translateApiErrorCode(tErr, sessionResponse.error.code, {
          min: PRODUCT_RULES.players.min,
          max: PRODUCT_RULES.players.max,
        }),
      )
      return
    }

    const poolSeed = import.meta.env.MODE === 'test' ? 12_345 : Date.now()
    const appLocale = normalizeAppLocale(i18n.language) ?? 'es'

    if (config.questionMode === 'ai') {
      aiStartupAbortRef.current?.abort()
      const abortController = new AbortController()
      aiStartupAbortRef.current = abortController
      setSetupSubmitMessage(null)
      setGuessSubmitError(null)
      setAntiCheatNotice(null)
      setAiStartup({ kind: 'loading', requestedItems: config.questionCount, config })
      setCurrentView('game')

      const candidatePool = buildQuestionPool({
        countries: countriesCatalog,
        regionFilter: config.regionFilter,
        questionMode: 'country',
        locale: appLocale,
        requestedQuestionCount: config.questionCount,
        seed: poolSeed,
      })
      const candidateIso2s = candidatePool.selectedQuestions.map((item) => item.answerCountryCode)
      const validSet = new Set(candidateIso2s)

      const promptsResult = await fetchAiPrompts({
        items: candidateIso2s.map((iso2) => ({ iso2 })),
        tags: config.tags ?? [],
        locale: appLocale,
        excludedIds: getSeenRiddleIds(appLocale),
        signal: abortController.signal,
      })

      if (abortController.signal.aborted) {
        return
      }
      aiStartupAbortRef.current = null

      if (!promptsResult.ok) {
        setAiStartup({
          kind: 'error',
          errorCode: promptsResult.error.code,
          canRetry:
            promptsResult.error.code === 'LLM_UNAVAILABLE' ||
            promptsResult.error.code === 'LLM_RATE_LIMITED' ||
            promptsResult.error.code === 'CONVEX_UNAVAILABLE' ||
            promptsResult.error.code === 'INTERNAL_ERROR',
          config,
        })
        return
      }

      for (const item of promptsResult.data.items) {
        addSeenRiddleId(appLocale, item.riddleId)
      }

      const { pool, droppedCount } = mapAiItemsToPool({
        items: promptsResult.data.items,
        validIso2Set: validSet,
      })

      if (pool.length === 0) {
        setAiStartup({
          kind: 'error',
          errorCode: 'INSUFFICIENT_GROUNDING_BATCH',
          canRetry: true,
          config,
        })
        return
      }

      const playingSession = beginPlayingSession(sessionResponse.data, pool)

      setAiStartup({ kind: 'idle' })
      setGameSession(playingSession)
      if (pool.length < config.questionCount || droppedCount > 0) {
        setSetupSubmitMessage(tApp('aiPromptsReducedNotice', { count: pool.length }))
      } else {
        setSetupSubmitMessage(null)
      }
      return
    }

    const pool = buildQuestionPool({
      countries: countriesCatalog,
      regionFilter: config.regionFilter,
      questionMode: config.questionMode,
      locale: appLocale,
      requestedQuestionCount: config.questionCount,
      seed: poolSeed,
    })

    const playingSession = beginPlayingSession(sessionResponse.data, pool.selectedQuestions)

    setSetupSubmitMessage(null)
    setGuessSubmitError(null)
    setAntiCheatNotice(null)
    setAiStartup({ kind: 'idle' })
    setGameSession(playingSession)
    setCurrentView('game')
  }

  function handlePlayerCountChange(nextPlayerCount: number): void {
    const boundedCount = Math.min(
      PRODUCT_RULES.players.max,
      Math.max(PRODUCT_RULES.players.min, nextPlayerCount),
    )

    setPlayerCount(boundedCount)
    setPlayers((currentPlayers) => {
      if (currentPlayers.length === boundedCount) {
        return currentPlayers
      }

      if (currentPlayers.length > boundedCount) {
        return currentPlayers.slice(0, boundedCount)
      }

      const expandedPlayers = [...currentPlayers]
      for (let index = currentPlayers.length; index < boundedCount; index += 1) {
        expandedPlayers.push(i18n.t('playerDefault', { ns: 'common', n: index + 1 }))
      }

      return expandedPlayers
    })
  }

  function handlePlayerNameChange(index: number, nextName: string): void {
    setPlayers((currentPlayers) =>
      currentPlayers.map((playerName, playerIndex) =>
        playerIndex === index ? nextName : playerName,
      ),
    )
  }

  function handleRegionFilterChange(nextRegionFilter: RegionFilter): void {
    setRegionFilter(nextRegionFilter)

    const nextAvailableQuestions =
      nextRegionFilter === 'world'
        ? countriesCatalog.length
        : countriesCatalog.filter((country) => country.continent === nextRegionFilter).length

    setQuestionCount((currentQuestionCount) => Math.min(currentQuestionCount, nextAvailableQuestions))
  }

  function handleStartGame(): void {
    if (!canStartGame) {
      setSetupSubmitMessage(tApp('fixConfigBeforeStart'))
      return
    }
    void startGameWithConfig(setupDraft)
  }

  function handleCancelAiStartup(): void {
    aiStartupAbortRef.current?.abort()
    aiStartupAbortRef.current = null
    setAiStartup({ kind: 'idle' })
    setCurrentView('setup')
  }

  function handleRetryAiStartup(): void {
    if (aiStartup.kind !== 'error') return
    void startGameWithConfig(aiStartup.config)
  }

  const handleCountryMapClick = useCallback((iso2: IsoCountryCode | null): void => {
    if (!gameSession || gameSession.status !== 'playing') {
      return
    }

    const activeRound = gameSession.rounds[gameSession.activeRoundIndex]
    if (!activeRound || activeRound.guess || iso2 === null) {
      return
    }

    const sessionRegion = gameSession.config.regionFilter
    if (sessionRegion !== 'world') {
      const continent = getContinentForIso2(iso2)
      if (continent !== sessionRegion) {
        setGuessSubmitError(tApp('wrongRegionGuess'))
        return
      }
    }

    const activePlayerId = getActivePlayerIdForRound(gameSession)
    if (!activePlayerId) {
      return
    }

    const response = submitRoundGuess({
      session: gameSession,
      selectedCountryCode: iso2,
      playerId: activePlayerId,
      answeredAtISO: new Date().toISOString(),
    })

    if (response.success) {
      setGuessSubmitError(null)
      setGameSession(response.data.session)
    } else {
      setGuessSubmitError(translateApiErrorCode(tErr, response.error.code))
    }
  }, [gameSession, tApp, tErr])

  function exitGameTo(view: AppView): void {
    setGameSession(null)
    setGuessSubmitError(null)
    setAntiCheatNotice(null)
    setCurrentView(view)
  }

  function handleAdvanceRound(): void {
    if (!gameSession) {
      return
    }

    const response = advanceToNextRoundOrFinish(gameSession)
    if (response.success) {
      setGuessSubmitError(null)
      setGameSession(response.data)
    } else {
      setGuessSubmitError(translateApiErrorCode(tErr, response.error.code))
    }
  }

  const handleAntiCheatIncident = useCallback((source: 'window_blur' | 'document_hidden'): void => {
    setGameSession((currentSession) => {
      if (!currentSession || currentSession.status !== 'playing') {
        return currentSession
      }

      const policyResult = applyAntiCheatIncident(currentSession, source)
      setGuessSubmitError(null)
      setAntiCheatNotice(
        policyResult.didAbortGame ? tGame('antiCheatStrict') : tGame('antiCheatNormal'),
      )
      return policyResult.nextSession
    })
  }, [tGame])

  useEffect(() => {
    if (!gameSession || gameSession.status !== 'playing') {
      return
    }

    const handleWindowBlur = () => {
      const now = Date.now()
      if (now < antiCheatLockUntilRef.current) {
        return
      }
      antiCheatLockUntilRef.current = now + 750
      handleAntiCheatIncident('window_blur')
    }

    const handleVisibilityChange = () => {
      const now = Date.now()
      if (!document.hidden || now < antiCheatLockUntilRef.current) {
        return
      }
      antiCheatLockUntilRef.current = now + 750
      handleAntiCheatIncident('document_hidden')
    }

    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [gameSession, handleAntiCheatIncident])

  // F2.1 — Shell de partida a pantalla completa: bloquear scroll del documento mientras
  // currentView === 'game' && status === 'playing'. La altura/ancho del shell se controla
  // por CSS (100dvh/100svh + overflow:hidden), pero algunos navegadores móviles y barras
  // dinámicas pueden seguir permitiendo scroll del body si éste no se fija explícitamente.
  useEffect(() => {
    const isFullScreenGame =
      currentView === 'game' && gameSession?.status === 'playing'
    if (!isFullScreenGame) {
      return
    }
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [currentView, gameSession?.status])

  if (currentView === 'game') {
    if (aiStartup.kind === 'loading') {
      return (
        <AiPromptsLoadingView
          requestedItems={aiStartup.requestedItems}
          onCancel={handleCancelAiStartup}
        />
      )
    }

    if (aiStartup.kind === 'error') {
      return (
        <AiPromptsErrorView
          errorCode={aiStartup.errorCode}
          canRetry={aiStartup.canRetry}
          onRetry={handleRetryAiStartup}
          onBackToSetup={() => {
            setAiStartup({ kind: 'idle' })
            exitGameTo('setup')
          }}
          onBackToHome={() => {
            setAiStartup({ kind: 'idle' })
            exitGameTo('home')
          }}
        />
      )
    }

    if (!gameSession) {
      return (
        <main className="min-h-screen bg-paper text-ink">
          <section className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-10">
            <p className="font-body text-ink-soft">
              {tApp('noSession')}
            </p>
            <ChunkyButton type="button" tone="primary" onClick={() => exitGameTo('setup')}>
              {tApp('goSetup')}
            </ChunkyButton>
          </section>
        </main>
      )
    }

    if (gameSession.status === 'finished' || gameSession.status === 'aborted') {
      return (
        <ResultsView
          session={gameSession}
          antiCheatNotice={antiCheatNotice}
          onReplaySameConfig={() => {
            void startGameWithConfig(gameSession.config)
          }}
          onGoToSetup={() => exitGameTo('setup')}
          onGoToHome={() => exitGameTo('home')}
        />
      )
    }

    return (
      <GameShell
        session={gameSession}
        guessSubmitError={guessSubmitError}
        antiCheatNotice={antiCheatNotice}
        onCountryClick={handleCountryMapClick}
        onAdvanceRound={handleAdvanceRound}
        onExitToSetup={() => exitGameTo('setup')}
        onExitToHome={() => exitGameTo('home')}
      />
    )
  }

  if (currentView === 'learn') {
    return (
      <LearnMapView
        onExitToHome={() => setCurrentView('home')}
        onExitToSetup={() => setCurrentView('setup')}
      />
    )
  }

  if (currentView === 'setup') {
    return (
      <SetupView
        playerCount={playerCount}
        players={players}
        questionMode={questionMode}
        regionFilter={regionFilter}
        antiCheatMode={effectiveAntiCheatMode}
        questionCount={questionCount}
        tags={tags}
        setupDraft={setupDraft}
        availableQuestionsForRegion={availableQuestionsForRegion}
        validationResult={validationResult}
        schemaIsValid={schemaValidationResult.isValid}
        schemaOnlyErrors={schemaOnlyErrors}
        canStartGame={canStartGame}
        setupSubmitMessage={setupSubmitMessage}
        onPlayerCountChange={handlePlayerCountChange}
        onPlayerNameChange={handlePlayerNameChange}
        onQuestionModeChange={setQuestionMode}
        onRegionFilterChange={handleRegionFilterChange}
        onAntiCheatModeChange={setAntiCheatMode}
        onQuestionCountChange={setQuestionCount}
        onTagsChange={setTags}
        onStartGame={handleStartGame}
        onBackToHome={() => setCurrentView('home')}
      />
    )
  }

  return (
    <HomeView
      onStartSetup={() => setCurrentView('setup')}
      onStartLearn={() => setCurrentView('learn')}
    />
  )
}
