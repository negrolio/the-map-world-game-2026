import {
  Alert,
  Badge,
  ChunkyButton,
  FieldInput,
  FieldRadioGroup,
  FieldSelect,
  Panel,
} from '../../components/ui'
import { PRODUCT_RULES } from '../../services'
import type {
  AntiCheatMode,
  GameConfig,
  QuestionMode,
  RegionFilter,
} from '../../types'

export interface SetupValidationLimits {
  readonly min: number
  readonly max: number
}

export interface SetupValidationError {
  readonly field: string
  readonly message: string
}

export interface SetupValidationResult {
  readonly isValid: boolean
  readonly errors: readonly SetupValidationError[]
  readonly questionLimits: SetupValidationLimits
}

export interface SetupViewProps {
  readonly playerCount: number
  readonly players: readonly string[]
  readonly questionMode: QuestionMode
  readonly regionFilter: RegionFilter
  readonly antiCheatMode: AntiCheatMode
  readonly questionCount: number
  readonly setupDraft: GameConfig
  readonly availableQuestionsForRegion: number
  readonly validationResult: SetupValidationResult
  readonly schemaIsValid: boolean
  readonly schemaOnlyErrors: readonly string[]
  readonly canStartGame: boolean
  readonly setupSubmitMessage: string | null
  readonly onPlayerCountChange: (next: number) => void
  readonly onPlayerNameChange: (index: number, name: string) => void
  readonly onQuestionModeChange: (mode: QuestionMode) => void
  readonly onRegionFilterChange: (region: RegionFilter) => void
  readonly onAntiCheatModeChange: (mode: AntiCheatMode) => void
  readonly onQuestionCountChange: (count: number) => void
  readonly onStartGame: () => void
  readonly onBackToHome: () => void
}

const REGION_OPTIONS = [
  { value: 'world', label: 'Mundo' },
  { value: 'africa', label: 'África' },
  { value: 'americas', label: 'Américas' },
  { value: 'asia', label: 'Asia' },
  { value: 'europe', label: 'Europa' },
  { value: 'oceania', label: 'Oceanía' },
] as const

const QUESTION_MODE_OPTIONS = [
  { value: 'country' as const, label: 'País' },
  { value: 'capital' as const, label: 'Capital' },
]

const ANTI_CHEAT_OPTIONS = [
  { value: 'normal' as const, label: 'Normal' },
  { value: 'strict' as const, label: 'Estricto' },
]

export function SetupView(props: SetupViewProps) {
  const {
    playerCount,
    players,
    questionMode,
    regionFilter,
    antiCheatMode,
    questionCount,
    setupDraft,
    availableQuestionsForRegion,
    validationResult,
    schemaIsValid,
    schemaOnlyErrors,
    canStartGame,
    setupSubmitMessage,
    onPlayerCountChange,
    onPlayerNameChange,
    onQuestionModeChange,
    onRegionFilterChange,
    onAntiCheatModeChange,
    onQuestionCountChange,
    onStartGame,
    onBackToHome,
  } = props

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-5 px-6 py-12">
        <Badge tone="success">Setup de partida</Badge>
        <h1 className="font-display text-3xl uppercase tracking-tight text-wood-dark md:text-5xl">
          Game Setup Panel
        </h1>
        <p className="max-w-2xl font-body text-sm text-ink-soft md:text-base">
          Configurá jugadores y reglas base para preparar el inicio de la partida.
        </p>

        <Panel tone="paper" padding="lg" className="setup-panel-background grid gap-4">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              onStartGame()
            }}
          >
            <FieldInput
              id="player-count"
              type="number"
              min={PRODUCT_RULES.players.min}
              max={PRODUCT_RULES.players.max}
              value={playerCount}
              onChange={(event) => {
                const nextValue = Number.parseInt(event.target.value, 10)
                onPlayerCountChange(
                  Number.isNaN(nextValue) ? PRODUCT_RULES.players.min : nextValue,
                )
              }}
              label="Cantidad de jugadores (1-6)"
            />

            <div className="grid gap-2">
              <p className="font-display text-sm uppercase tracking-wide text-wood-dark">
                Nombres de jugadores
              </p>
              <div className="grid gap-2">
                {players.map((playerName, index) => (
                  <FieldInput
                    key={`player-name-${index + 1}`}
                    id={`player-name-${index + 1}`}
                    type="text"
                    value={playerName}
                    onChange={(event) => onPlayerNameChange(index, event.target.value)}
                    label={`Jugador ${index + 1}`}
                    invalid={!schemaIsValid}
                  />
                ))}
              </div>
            </div>

            <FieldRadioGroup
              legend="Modo de preguntas"
              name="question-mode"
              value={questionMode}
              options={QUESTION_MODE_OPTIONS}
              onChange={onQuestionModeChange}
            />

            <FieldSelect
              id="region-filter"
              label="Cobertura geográfica"
              value={regionFilter}
              onChange={(event) => onRegionFilterChange(event.target.value as RegionFilter)}
              options={REGION_OPTIONS}
            />

            <FieldRadioGroup
              legend="Anti-cheat"
              name="anti-cheat-mode"
              value={antiCheatMode}
              options={ANTI_CHEAT_OPTIONS}
              onChange={onAntiCheatModeChange}
            />

            <FieldInput
              id="question-count"
              type="number"
              min={validationResult.questionLimits.min}
              max={validationResult.questionLimits.max}
              value={questionCount}
              onChange={(event) => {
                const nextValue = Number.parseInt(event.target.value, 10)
                onQuestionCountChange(
                  Number.isNaN(nextValue) ? validationResult.questionLimits.min : nextValue,
                )
              }}
              label="Número de preguntas"
              aria-invalid={!canStartGame}
              aria-describedby="setup-feedback"
            />

            <Panel tone="paper-soft" padding="sm" className="grid gap-1 text-xs text-ink-soft">
              <p>
                Preguntas disponibles para este filtro: {availableQuestionsForRegion}
              </p>
              <p>
                Rango permitido de preguntas: {validationResult.questionLimits.min} a{' '}
                {validationResult.questionLimits.max}
              </p>
            </Panel>

            {!validationResult.isValid ? (
              <Alert id="setup-feedback" tone="error" heading="Configuración inválida">
                <ul className="list-disc space-y-1 pl-5 text-xs">
                  {validationResult.errors.map((error, index) => (
                    <li key={`${error.field}-${index}`}>{error.message}</li>
                  ))}
                </ul>
              </Alert>
            ) : (
              <Alert id="setup-feedback" tone="success">
                Configuración válida para iniciar partida.
              </Alert>
            )}

            {schemaOnlyErrors.length > 0 ? (
              <Alert tone="error">
                {schemaOnlyErrors.map((errorMessage, index) => (
                  <p key={`${errorMessage}-${index}`}>{errorMessage}</p>
                ))}
              </Alert>
            ) : null}

            <Panel tone="paper-soft" padding="sm">
              <p className="mb-2 font-display text-xs uppercase tracking-wide text-ink-soft">
                Config listo para validar/iniciar
              </p>
              <pre className="overflow-x-auto font-body text-xs text-wood-dark">
                {JSON.stringify(setupDraft, null, 2)}
              </pre>
            </Panel>
          </form>
        </Panel>

        <div className="flex flex-wrap items-center gap-3">
          <ChunkyButton
            type="submit"
            tone="primary"
            size="lg"
            disabled={!canStartGame}
            onClick={onStartGame}
          >
            Iniciar partida
          </ChunkyButton>
          <ChunkyButton type="button" tone="secondary" onClick={onBackToHome}>
            Volver al home
          </ChunkyButton>
        </div>
        {setupSubmitMessage ? (
          <Alert tone="info">{setupSubmitMessage}</Alert>
        ) : null}
      </section>
    </main>
  )
}
