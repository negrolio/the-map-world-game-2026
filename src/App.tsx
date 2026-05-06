import { useMemo, useState } from 'react'

import { Button, componentShell } from './components'
import { countriesCatalog, dataShell, datasetVersion } from './data'
import { gameFeatureShell } from './features/game'
import { setupFeatureShell, validateSetupConfigSchema } from './features/setup'
import { serviceShell } from './services'
import { PRODUCT_RULES, validateConfig } from './services'
import type { AntiCheatMode, FeatureShell, GameConfig, QuestionMode, RegionFilter } from './types'

type AppView = 'home' | 'setup'

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('home')
  const [playerCount, setPlayerCount] = useState<number>(1)
  const [players, setPlayers] = useState<readonly string[]>(['Jugador 1'])
  const [questionMode, setQuestionMode] = useState<QuestionMode>('country')
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('world')
  const [antiCheatMode, setAntiCheatMode] = useState<AntiCheatMode>('normal')
  const [questionCount, setQuestionCount] = useState<number>(5)
  const [setupSubmitMessage, setSetupSubmitMessage] = useState<string | null>(null)

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

    setSetupSubmitMessage('Configuración validada en borde UI. Lista para iniciar la partida.')
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
