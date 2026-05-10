import { useEffect, useMemo, useRef, useState } from 'react'

import { Button, componentShell, GamePlayersHud, WorldMap } from './components'
import { countriesCatalog, dataShell, datasetVersion } from './data'
import { getContinentForIso2 } from './data/countries'
import { gameFeatureShell } from './features/game'
import { setupFeatureShell, validateSetupConfigSchema } from './features/setup'
import { serviceShell } from './services'
import {
  PRODUCT_RULES,
  advanceToNextRoundOrFinish,
  beginPlayingSession,
  buildQuestionPool,
  answerAccuracyPercent,
  applyAntiCheatIncident,
  buildGameResult,
  createGameSession,
  getActivePlayerForRound,
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
    const domainMessages = new Set(validationResult.errors.map((error) => error.message))
    return schemaValidationResult.errors.filter((errorMessage) => !domainMessages.has(errorMessage))
  }, [schemaValidationResult.errors, validationResult.errors])

  function startGameWithConfig(config: GameConfig): void {
    const sessionResponse = createGameSession(config)
    if (!sessionResponse.success) {
      setSetupSubmitMessage(sessionResponse.error.message)
      return
    }

    const poolSeed = import.meta.env.MODE === 'test' ? 12_345 : Date.now()
    const pool = buildQuestionPool({
      countries: countriesCatalog,
      regionFilter: config.regionFilter,
      questionMode: config.questionMode,
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
        expandedPlayers.push(`Jugador ${index + 1}`)
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
      setSetupSubmitMessage('Corregí la configuración antes de iniciar la partida.')
      return
    }
    startGameWithConfig(setupDraft)
  }

  function handleCountryMapClick(iso2: IsoCountryCode | null): void {
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
        setGuessSubmitError(
          'Ese país no pertenece al continente de esta partida. Elegí uno dentro de la región resaltada.',
        )
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
      setGuessSubmitError(response.error.message)
    }
  }

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
      setGuessSubmitError(response.error.message)
    }
  }

  function handleAntiCheatIncident(source: 'window_blur' | 'document_hidden'): void {
    setGameSession((currentSession) => {
      if (!currentSession || currentSession.status !== 'playing') {
        return currentSession
      }

      const policyResult = applyAntiCheatIncident(currentSession, source)
      setGuessSubmitError(null)
      setAntiCheatNotice(
        policyResult.didAbortGame
          ? 'Anti-cheat estricto: la partida fue abortada por pérdida de foco/visibilidad.'
          : 'Anti-cheat normal: se registró un incidente por pérdida de foco/visibilidad.',
      )
      return policyResult.nextSession
    })
  }

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
  }, [gameSession])

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
        <main className="min-h-screen bg-slate-950 text-slate-100">
          <section className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-10">
            <p className="text-slate-300">No hay sesión activa. Volvé al setup para iniciar una partida.</p>
            <Button type="button" onClick={() => exitGameTo('setup')}>
              Ir al setup
            </Button>
          </section>
        </main>
      )
    }

    if (gameSession.status === 'finished' || gameSession.status === 'aborted') {
      const outcome =
        gameSession.result ??
        buildGameResult(gameSession.players, gameSession.rounds.length)
      const winnerPlayer = outcome.winnerPlayerId
        ? outcome.leaderboard.find((player) => player.id === outcome.winnerPlayerId)
        : undefined

      return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
          <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
            <header className="flex flex-col gap-2">
              <p className="inline-flex w-fit rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-sm font-medium text-amber-200">
                Resultados
              </p>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Partida terminada</h1>
              <p className="text-sm text-slate-400" data-testid="game-finished-status">
                Estado: {gameSession.status === 'aborted' ? 'abortada por anti-cheat' : 'finalizada por rondas'}.
                {' '}
                {outcome.totalRounds}{' '}
                {outcome.totalRounds === 1 ? 'ronda jugada' : 'rondas jugadas'}. Puntaje: +10 por acierto, −5
                por error. Dataset version: {datasetVersion}.
              </p>
              <p className="text-sm text-slate-400" data-testid="anti-cheat-incidents">
                Incidentes anti-cheat registrados: {gameSession.incidentCount}
              </p>
              {antiCheatNotice ? (
                <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  {antiCheatNotice}
                </p>
              ) : null}
              {winnerPlayer ? (
                <p
                  className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100"
                  data-testid="game-winner"
                >
                  Mejor puntaje según la tabla: <strong>{winnerPlayer.name}</strong> ({winnerPlayer.score} pts,{' '}
                  {answerAccuracyPercent(winnerPlayer.correctAnswers, winnerPlayer.wrongAnswers)}% aciertos sobre
                  respuestas dadas).
                </p>
              ) : null}
            </header>
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tabla de posiciones
              </h2>
              <ol className="list-decimal space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 pl-8 marker:text-slate-500">
                {outcome.leaderboard.map((player, rankIndex) => (
                  <li
                    key={player.id}
                    className="border-b border-slate-800 pb-3 pl-1 last:border-b-0 last:pb-0"
                    data-testid={`finished-rank-${rankIndex + 1}-${player.id}`}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <span className="font-medium text-slate-100">{player.name}</span>
                      <span className="text-sm text-slate-400">
                        <span className="font-mono text-cyan-200">{player.score}</span> pts · ✓{' '}
                        {player.correctAnswers} · ✗ {player.wrongAnswers} ·{' '}
                        <span className="text-slate-300">
                          {answerAccuracyPercent(player.correctAnswers, player.wrongAnswers)}% precisión
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                data-testid="replay-same-config-button"
                onClick={() => startGameWithConfig(gameSession.config)}
              >
                Rejugar misma configuración
              </Button>
              <Button type="button" onClick={() => exitGameTo('setup')}>
                Nueva partida (setup)
              </Button>
              <Button type="button" variant="secondary" onClick={() => exitGameTo('home')}>
                Ir al home
              </Button>
            </div>
          </section>
        </main>
      )
    }

    const activeRound = gameSession.rounds[gameSession.activeRoundIndex]
    const turnPlayer = getActivePlayerForRound(gameSession)
    const roundGuess = activeRound?.guess
    const mapFeedback =
      roundGuess && activeRound
        ? {
            selectedIso2: roundGuess.selectedCountryCode,
            targetIso2: activeRound.targetCountryCode,
            isCorrect: roundGuess.isCorrect,
          }
        : null
    const isLastRound = gameSession.activeRoundIndex >= gameSession.rounds.length - 1

    return (
      // F2.1 + F2.2 + F2.3 + F2.4 + F2.7 — Shell de partida a pantalla completa
      // con mapa edge-to-edge y overlay armónico en dos bandas (top + bottom).
      //
      // Arquitectura por capas (orden de hijos DOM = orden de foco con Tab):
      //  1) Banda superior (z-10, pointer-events-auto): primer foco con Tab.
      //     Contiene navegación (Setup, Home) + estado de ronda y feedback.
      //  2) Mapa base (z-0, ocupa toda la superficie): foco al hacer Tab dentro
      //     de WorldMap (controles de zoom y geografías focusables).
      //  3) Banda inferior (z-10, pointer-events-auto): último foco. HUD de
      //     jugadores + acción primaria (Siguiente / Resultado).
      //
      // pointer-events: las bandas son interactivas; el área no cubierta por las
      // bandas (centro del mapa) queda libre para clic / pan / zoom directos al
      // mapa, sin interceptación opaca.
      //
      // F2.1: h-screen (100vh) como fallback y `style={{ height: '100dvh' }}` para
      // soporte de unidades dinámicas de viewport. `overflow:hidden` evita scroll
      // de DOCUMENTO durante `playing`.
      //
      // Nota a11y: `Mapa mundial — 110m` queda como h1 sr-only para mantener
      // jerarquía semántica y lectores; visualmente la cabecera prioriza la
      // pregunta de la ronda.
      <main
        data-testid="game-shell"
        className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100"
        style={{ height: '100dvh' }}
      >
        <h1 className="sr-only">Mapa mundial — 110m</h1>

        {/* F2.3 + F2.4 + F2.7 — Banda superior: navegación + ronda. Primer foco con Tab. */}
        <div
          data-testid="game-overlay-top"
          className="pointer-events-auto absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-slate-950/95 via-slate-950/70 to-transparent px-4 pb-4 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-6"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="inline-flex w-fit rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                  Partida (mapa)
                </p>
                {activeRound ? (
                  <p
                    className="rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200"
                    data-testid="round-counter"
                  >
                    Ronda {activeRound.roundNumber} / {gameSession.rounds.length}
                  </p>
                ) : null}
              </div>
              <nav
                aria-label="Navegación de partida"
                className="flex items-center gap-2"
                data-testid="game-overlay-nav"
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => exitGameTo('setup')}
                  aria-label="Volver al setup"
                  className="px-3 py-1.5 text-xs"
                >
                  Setup
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => exitGameTo('home')}
                  aria-label="Ir al home"
                  className="px-3 py-1.5 text-xs"
                >
                  Home
                </Button>
              </nav>
            </div>
            {activeRound ? (
              <p className="text-lg font-semibold text-slate-50 md:text-xl" data-testid="round-prompt">
                {gameSession.config.questionMode === 'country' ? '¿Dónde está ' : '¿Dónde queda la capital '}
                <span className="text-cyan-200">{activeRound.prompt}</span>?
              </p>
            ) : null}
            {turnPlayer && !roundGuess ? (
              <p className="text-sm text-slate-200" data-testid="active-turn-player">
                Turno de <span className="font-semibold text-cyan-200">{turnPlayer.name}</span> — respondé tocando el mapa.
              </p>
            ) : null}
            {roundGuess ? (
              <p
                data-testid="guess-feedback"
                role="status"
                aria-live="polite"
                className={
                  roundGuess.isCorrect
                    ? 'text-sm font-medium text-emerald-300'
                    : 'text-sm font-medium text-rose-300'
                }
              >
                {roundGuess.isCorrect
                  ? 'Correcto.'
                  : `Incorrecto. El objetivo era el país con ISO2 ${activeRound?.targetCountryCode}.`}
                {' · Respuesta de '}
                <span className="text-slate-200">
                  {gameSession.players.find((player) => player.id === roundGuess.playerId)?.name ??
                    roundGuess.playerId}
                </span>
              </p>
            ) : null}
            {guessSubmitError ? (
              <p role="alert" className="text-sm text-rose-300">
                {guessSubmitError}
              </p>
            ) : null}
            {antiCheatNotice ? (
              <p role="status" aria-live="polite" className="text-sm text-amber-200">
                {antiCheatNotice}
              </p>
            ) : null}
          </div>
        </div>

        {/* Mapa base — entre top y bottom en orden DOM, foco intermedio con Tab. */}
        <div className="absolute inset-0 z-0">
          <WorldMap
            key={gameSession.id}
            fullBleed
            regionFilter={gameSession.config.regionFilter}
            mapFeedback={mapFeedback}
            onCountryClick={handleCountryMapClick}
          />
        </div>

        {/* F2.3 + F2.4 + F2.7 — Banda inferior: HUD + acción primaria. Último foco con Tab. */}
        <div
          data-testid="game-overlay-bottom"
          className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-4 sm:px-6"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
            <GamePlayersHud session={gameSession} roundAnswered={Boolean(roundGuess)} />
            {roundGuess ? (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button type="button" data-testid="advance-round-button" onClick={handleAdvanceRound}>
                  {isLastRound ? 'Ver resultado final' : 'Siguiente pregunta'}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    )
  }

  if (currentView === 'setup') {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-5 px-6 py-12">
          <p className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-200">
            Setup de partida
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Game Setup Panel</h1>
          <p className="max-w-2xl text-sm text-slate-300 md:text-base">
            Configurá jugadores y reglas base para preparar el inicio de la partida.
          </p>

          <form
            className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 md:p-6"
            onSubmit={(event) => {
              event.preventDefault()
              handleStartGame()
            }}
          >
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-200" id="player-count-label">
                Cantidad de jugadores (1-6)
              </span>
              <input
                id="player-count"
                type="number"
                min={PRODUCT_RULES.players.min}
                max={PRODUCT_RULES.players.max}
                value={playerCount}
                onChange={(event) => {
                  const nextValue = Number.parseInt(event.target.value, 10)
                  handlePlayerCountChange(Number.isNaN(nextValue) ? PRODUCT_RULES.players.min : nextValue)
                }}
                aria-labelledby="player-count-label"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>

            <div className="grid gap-2">
              <p className="text-sm font-medium text-slate-200">Nombres de jugadores</p>
              <div className="grid gap-2">
                {players.map((playerName, index) => (
                  <label key={`player-name-${index + 1}`} className="grid gap-1 text-xs text-slate-400">
                    <span id={`player-name-label-${index + 1}`}>Jugador {index + 1}</span>
                    <input
                      id={`player-name-${index + 1}`}
                      type="text"
                      value={playerName}
                      onChange={(event) => handlePlayerNameChange(index, event.target.value)}
                      aria-labelledby={`player-name-label-${index + 1}`}
                      aria-invalid={!schemaValidationResult.isValid}
                      className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                ))}
              </div>
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-slate-200">Modo de preguntas</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="question-mode"
                    checked={questionMode === 'country'}
                    onChange={() => setQuestionMode('country')}
                  />
                  País
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="question-mode"
                    checked={questionMode === 'capital'}
                    onChange={() => setQuestionMode('capital')}
                  />
                  Capital
                </label>
              </div>
            </fieldset>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-200" id="region-filter-label">
                Cobertura geográfica
              </span>
              <select
                id="region-filter"
                value={regionFilter}
                onChange={(event) => handleRegionFilterChange(event.target.value as RegionFilter)}
                aria-labelledby="region-filter-label"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              >
                <option value="world">Mundo</option>
                <option value="africa">África</option>
                <option value="americas">Américas</option>
                <option value="asia">Asia</option>
                <option value="europe">Europa</option>
                <option value="oceania">Oceanía</option>
              </select>
            </label>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-slate-200">Anti-cheat</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="anti-cheat-mode"
                    checked={antiCheatMode === 'normal'}
                    onChange={() => setAntiCheatMode('normal')}
                  />
                  Normal
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="anti-cheat-mode"
                    checked={antiCheatMode === 'strict'}
                    onChange={() => setAntiCheatMode('strict')}
                  />
                  Estricto
                </label>
              </div>
            </fieldset>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-200" id="question-count-label">
                Número de preguntas
              </span>
              <input
                id="question-count"
                type="number"
                min={validationResult.questionLimits.min}
                max={validationResult.questionLimits.max}
                value={questionCount}
                onChange={(event) => {
                  const nextValue = Number.parseInt(event.target.value, 10)
                  setQuestionCount(
                    Number.isNaN(nextValue) ? validationResult.questionLimits.min : nextValue,
                  )
                }}
                aria-labelledby="question-count-label"
                aria-invalid={!canStartGame}
                aria-describedby="setup-feedback"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>

            <div className="rounded-md border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
              Preguntas disponibles para este filtro: {availableQuestionsForRegion}
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
              Rango permitido de preguntas: {validationResult.questionLimits.min} a{' '}
              {validationResult.questionLimits.max}
            </div>

            {!validationResult.isValid ? (
              <div
                id="setup-feedback"
                role="alert"
                aria-live="polite"
                className="rounded-md border border-rose-700/60 bg-rose-950/30 p-3 text-sm text-rose-200"
              >
                <p className="font-semibold">Configuración inválida</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  {validationResult.errors.map((error, index) => (
                    <li key={`${error.field}-${index}`}>{error.message}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div
                id="setup-feedback"
                role="status"
                aria-live="polite"
                className="rounded-md border border-emerald-700/50 bg-emerald-950/30 p-3 text-xs text-emerald-200"
              >
                Configuración válida para iniciar partida.
              </div>
            )}

            {schemaOnlyErrors.length > 0 ? (
              <div role="alert" aria-live="polite" className="rounded-md border border-rose-700/60 bg-rose-950/30 p-3 text-xs text-rose-200">
                {schemaOnlyErrors.map((errorMessage, index) => (
                  <p key={`${errorMessage}-${index}`}>{errorMessage}</p>
                ))}
              </div>
            ) : null}

            <div className="rounded-md border border-slate-700 bg-slate-950 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Config listo para validar/iniciar</p>
              <pre className="overflow-x-auto text-xs text-slate-200">{JSON.stringify(setupDraft, null, 2)}</pre>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!canStartGame} onClick={handleStartGame}>
              Iniciar partida
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCurrentView('home')}>
              Volver al home
            </Button>
          </div>
          {setupSubmitMessage ? (
            <p role="status" aria-live="polite" className="text-sm text-cyan-200">
              {setupSubmitMessage}
            </p>
          ) : null}
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
          Home MVP
        </p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          The Map World Game 2026
        </h1>
        <p className="max-w-2xl text-base text-slate-300 md:text-lg">
          Tailwind CSS quedó integrado correctamente. Esta pantalla usa
          utilidades para validar el setup inicial del frontend.
        </p>
        <p className="text-xs text-slate-400">Dataset version: {datasetVersion}</p>
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {shellModules.map((shellModule) => (
            <li
              key={shellModule.id}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
            >
              {shellModule.id}:{' '}
              <span className="font-semibold text-emerald-300">
                {shellModule.status}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-3">
          <Button type="button" onClick={() => setCurrentView('setup')}>
            Comenzar setup
          </Button>
          <Button type="button" variant="secondary">
            Ver estado técnico
          </Button>
        </div>
      </section>
    </main>
  )
}
