import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { componentShell } from './components'
import { ChunkyButton } from './components/ui'
import { countriesCatalog, dataShell, datasetVersion } from './data'
import { getContinentForIso2 } from './data/countries'
import { GameShell } from './features/game/GameShell'
import { ResultsView } from './features/game/ResultsView'
import { HomeView } from './features/home/HomeView'
import { SetupView } from './features/setup/SetupView'
import { gameFeatureShell } from './features/game'
import { setupFeatureShell, validateSetupConfigSchema } from './features/setup'
import { normalizeAppLocale } from './i18n/app-locale'
import { translateApiErrorCode } from './i18n/translate-api-error'
import { serviceShell } from './services'
import {
  PRODUCT_RULES,
  advanceToNextRoundOrFinish,
  beginPlayingSession,
  buildQuestionPool,
  applyAntiCheatIncident,
  createGameSession,
  getActivePlayerIdForRound,
  submitRoundGuess,
  validateConfig,
} from './services'
import type {
  AntiCheatMode,
  FeatureShell,
  GameConfig,
  GameSession,
  IsoCountryCode,
  QuestionMode,
  RegionFilter,
} from './types'

type AppView = 'home' | 'setup' | 'game'

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
  const [setupSubmitMessage, setSetupSubmitMessage] = useState<string | null>(null)
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [guessSubmitError, setGuessSubmitError] = useState<string | null>(null)
  const [antiCheatNotice, setAntiCheatNotice] = useState<string | null>(null)
  const antiCheatLockUntilRef = useRef<number>(0)

  const shellModules: readonly FeatureShell[] = [
    setupFeatureShell,
    gameFeatureShell,
    serviceShell,
    dataShell,
    componentShell,
  ]

  const availableQuestionsForRegion = useMemo(() => {
    if (regionFilter === 'world') {
      return countriesCatalog.length
    }

    return countriesCatalog.filter((country) => country.continent === regionFilter).length
  }, [regionFilter])

  const setupDraft: GameConfig = useMemo(
    () => ({
      players,
      questionMode,
      regionFilter,
      antiCheatMode,
      questionCount,
    }),
    [antiCheatMode, players, questionCount, questionMode, regionFilter],
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

  function startGameWithConfig(config: GameConfig): void {
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
    startGameWithConfig(setupDraft)
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
          onReplaySameConfig={() => startGameWithConfig(gameSession.config)}
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

  if (currentView === 'setup') {
    return (
      <SetupView
        playerCount={playerCount}
        players={players}
        questionMode={questionMode}
        regionFilter={regionFilter}
        antiCheatMode={antiCheatMode}
        questionCount={questionCount}
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
        onStartGame={handleStartGame}
        onBackToHome={() => setCurrentView('home')}
      />
    )
  }

  return (
    <HomeView
      shellModules={shellModules}
      datasetVersion={datasetVersion}
      onStartSetup={() => setCurrentView('setup')}
    />
  )
}
