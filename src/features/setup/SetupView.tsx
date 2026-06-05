import { useEffect, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import type { AiTriviaTagId } from '../../../shared/ai-trivia-tags-schema'
import {
  Alert,
  ChunkyButton,
  FieldInput,
  FieldRadioGroup,
  FieldSelect,
  Panel,
} from '../../components/ui'
import { cn } from '../../components/ui/cn'
import type { AppLocale } from '../../i18n/app-locale'
import { SUPPORTED_LOCALES } from '../../i18n/app-locale'
import { PRODUCT_RULES, getMaxPlayersForMode } from '../../services'
import type {
  AntiCheatMode,
  QuestionMode,
  RegionFilter,
} from '../../types'
import { AiTriviaTagsPicker } from './AiTriviaTagsPicker'
import { SetupModeCardGroup } from './SetupModeCardGroup'

export interface SetupValidationLimits {
  readonly min: number
  readonly max: number
}

export interface SetupValidationError {
  readonly field: string
  readonly messageKey: string
  readonly messageValues?: Readonly<Record<string, string | number>>
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
  readonly tags: readonly AiTriviaTagId[]
  readonly availableQuestionsForRegion: number
  readonly validationResult: SetupValidationResult
  readonly schemaIsValid: boolean
  readonly schemaOnlyErrors: readonly string[]
  readonly canStartGame: boolean
  readonly setupSubmitMessage: string | null
  readonly setupNotice?: string | null
  readonly onPlayerCountChange: (next: number) => void
  readonly onPlayerNameChange: (index: number, name: string) => void
  readonly onQuestionModeChange: (mode: QuestionMode) => void
  readonly onRegionFilterChange: (region: RegionFilter) => void
  readonly onAntiCheatModeChange: (mode: AntiCheatMode) => void
  readonly onQuestionCountChange: (count: number) => void
  readonly onTagsChange: (next: readonly AiTriviaTagId[]) => void
  readonly onStartGame: () => void
  readonly onBackToHome: () => void
}

const SETUP_NOTICE_DISMISS_MS = 5000

function translateDomainValidation(tVal: TFunction, error: SetupValidationError): string {
  const path = error.messageKey.replace(/^validation\./, '')
  return tVal(path, error.messageValues ?? {})
}

function translateSchemaIssue(tVal: TFunction, messageKey: string): string {
  const maxPlayers =
    messageKey === 'schema.aiPlayersMax'
      ? PRODUCT_RULES.ai.maxPlayers
      : PRODUCT_RULES.players.max

  return tVal(messageKey, {
    min: PRODUCT_RULES.players.min,
    max: maxPlayers,
    count: PRODUCT_RULES.ai.fixedQuestionCount,
  })
}

export function SetupView(props: SetupViewProps) {
  const { t, i18n } = useTranslation('setup')
  const { t: tVal } = useTranslation('validation')

  const {
    playerCount,
    players,
    questionMode,
    regionFilter,
    antiCheatMode,
    questionCount,
    tags,
    availableQuestionsForRegion,
    validationResult,
    schemaIsValid,
    schemaOnlyErrors,
    canStartGame,
    setupSubmitMessage,
    setupNotice = null,
    onPlayerCountChange,
    onPlayerNameChange,
    onQuestionModeChange,
    onRegionFilterChange,
    onAntiCheatModeChange,
    onQuestionCountChange,
    onTagsChange,
    onStartGame,
    onBackToHome,
  } = props

  const [hiddenNotice, setHiddenNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!setupNotice) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setHiddenNotice(setupNotice)
    }, SETUP_NOTICE_DISMISS_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [setupNotice])

  const visibleNotice =
    setupNotice && setupNotice !== hiddenNotice ? setupNotice : null

  const regionOptions = useMemo(
    () =>
      (
        [
          ['world', 'regionWorld'],
          ['africa', 'regionAfrica'],
          ['americas', 'regionAmericas'],
          ['asia', 'regionAsia'],
          ['europe', 'regionEurope'],
          ['oceania', 'regionOceania'],
        ] as const
      ).map(([value, labelKey]) => ({
        value,
        label: t(labelKey),
      })),
    [t],
  )

  const antiCheatOptions = useMemo(
    () =>
      (
        [
          ['normal', 'antiCheatNormal'],
          ['strict', 'antiCheatStrict'],
        ] as const
      ).map(([value, labelKey]) => ({
        value,
        label: t(labelKey),
      })),
    [t],
  )

  const languageOptions = useMemo(
    () =>
      SUPPORTED_LOCALES.map((locale) => ({
        value: locale,
        label: locale === 'es' ? t('languageOptionEs') : t('languageOptionEn'),
      })),
    [t],
  )

  const activeLocale = (i18n.language.startsWith('en') ? 'en' : 'es') as AppLocale
  const isAiMode = questionMode === 'ai'
  const playerCountMax = getMaxPlayersForMode(questionMode)

  const playerCountOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = []
    for (let count = PRODUCT_RULES.players.min; count <= playerCountMax; count += 1) {
      options.push({ value: String(count), label: String(count) })
    }
    return options
  }, [playerCountMax])

  const [questionCountInput, setQuestionCountInput] = useState(String(questionCount))
  const [prevQuestionCount, setPrevQuestionCount] = useState(questionCount)
  if (questionCount !== prevQuestionCount) {
    setPrevQuestionCount(questionCount)
    setQuestionCountInput(String(questionCount))
  }

  const [optionsOpen, setOptionsOpen] = useState(false)
  const hasConfigErrors = !validationResult.isValid || schemaOnlyErrors.length > 0
  const panelVisible = optionsOpen || hasConfigErrors

  const startGameButton = (
    <ChunkyButton
      type="button"
      tone="primary"
      size="lg"
      className="w-full"
      disabled={!canStartGame}
      onClick={onStartGame}
    >
      {t('startGame')}
    </ChunkyButton>
  )

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-8 md:gap-14 md:py-12">
        <div className="flex flex-col gap-6 md:min-h-[78vh] md:justify-center md:gap-8">
          <div className="flex flex-col items-center gap-2 text-center md:gap-3">
            <h1 className="font-display text-3xl uppercase tracking-tight text-wood-dark md:text-5xl">
              {t('title')}
            </h1>
          </div>

          <SetupModeCardGroup
            legend={t('modeLegend')}
            value={questionMode}
            onChange={onQuestionModeChange}
          />

          <div className="mx-auto flex w-full max-w-md flex-col gap-3">
            {startGameButton}
            <ChunkyButton
              type="button"
              tone="secondary"
              className="w-full"
              data-testid="setup-options-toggle"
              aria-expanded={panelVisible}
              aria-controls="setup-options-panel"
              onClick={() => setOptionsOpen((open) => !open)}
            >
              {t(isAiMode ? 'optionsToggleAi' : 'optionsToggle')}
              <svg
                viewBox="0 0 20 20"
                className={cn(
                  'h-4 w-4 transition-transform duration-150 motion-reduce:transition-none',
                  panelVisible ? 'rotate-180' : '',
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </ChunkyButton>
          </div>

          {visibleNotice ? (
            <Alert tone="info" aria-live="polite" data-testid="setup-notice">
              {visibleNotice}
            </Alert>
          ) : null}
        </div>

        {panelVisible ? (
          <Panel
            id="setup-options-panel"
            tone="paper"
            padding="lg"
            className="setup-panel-background grid gap-4"
          >
            <div className="grid gap-4">
            {isAiMode ? (
              <AiTriviaTagsPicker
                selectedTags={tags}
                onChange={onTagsChange}
                locale={activeLocale}
              />
            ) : null}

            <FieldSelect
              id="app-locale"
              label={t('languageLabel')}
              value={activeLocale}
              onChange={(event) => {
                void i18n.changeLanguage(event.target.value as AppLocale)
              }}
              options={languageOptions}
            />

            <FieldSelect
              id="player-count"
              value={String(playerCount)}
              onChange={(event) => {
                onPlayerCountChange(Number.parseInt(event.target.value, 10))
              }}
              options={playerCountOptions}
              label={t('playerCountLabel', {
                min: PRODUCT_RULES.players.min,
                max: playerCountMax,
              })}
            />

            <div className="grid gap-2">
              <p className="font-display text-sm uppercase tracking-wide text-wood-dark">
                {t('playerNamesHeading')}
              </p>
              <div className="grid gap-2">
                {players.map((playerName, index) => (
                  <FieldInput
                    key={`player-name-${index + 1}`}
                    id={`player-name-${index + 1}`}
                    type="text"
                    value={playerName}
                    onChange={(event) => onPlayerNameChange(index, event.target.value)}
                    label={t('playerLabel', { n: index + 1 })}
                    invalid={!schemaIsValid}
                  />
                ))}
              </div>
            </div>

            <FieldSelect
              id="region-filter"
              label={t('regionLabel')}
              value={regionFilter}
              onChange={(event) => onRegionFilterChange(event.target.value as RegionFilter)}
              options={regionOptions}
            />

            {!isAiMode ? (
              <FieldRadioGroup
                legend={t('antiCheatLegend')}
                name="anti-cheat-mode"
                value={antiCheatMode}
                options={antiCheatOptions}
                onChange={onAntiCheatModeChange}
              />
            ) : null}

            {!isAiMode ? (
              <>
                <FieldInput
                  id="question-count"
                  type="number"
                  inputMode="numeric"
                  min={validationResult.questionLimits.min}
                  max={validationResult.questionLimits.max}
                  value={questionCountInput}
                  onChange={(event) => {
                    const raw = event.target.value
                    setQuestionCountInput(raw)
                    const nextValue = Number.parseInt(raw, 10)
                    if (!Number.isNaN(nextValue)) {
                      onQuestionCountChange(nextValue)
                    }
                  }}
                  onBlur={() => {
                    const parsed = Number.parseInt(questionCountInput, 10)
                    const fallback = Number.isNaN(parsed)
                      ? validationResult.questionLimits.min
                      : parsed
                    onQuestionCountChange(fallback)
                    setQuestionCountInput(String(fallback))
                  }}
                  label={t('questionCountLabel')}
                  aria-invalid={!canStartGame}
                  aria-describedby={!validationResult.isValid ? 'setup-feedback' : undefined}
                />

                <Panel tone="paper-soft" padding="sm" className="grid gap-1 text-xs text-ink-soft">
                  <p>{t('questionsAvailable', { count: availableQuestionsForRegion })}</p>
                  <p>
                    {t('questionRange', {
                      min: validationResult.questionLimits.min,
                      max: validationResult.questionLimits.max,
                    })}
                  </p>
                </Panel>
              </>
            ) : null}

            {!validationResult.isValid ? (
              <Alert id="setup-feedback" tone="error" heading={t('invalidConfigHeading')}>
                <ul className="list-disc space-y-1 pl-5 text-xs">
                  {validationResult.errors.map((error, index) => (
                    <li key={`${error.field}-${index}`}>{translateDomainValidation(tVal, error)}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}

            {schemaOnlyErrors.length > 0 ? (
              <Alert tone="error">
                {schemaOnlyErrors.map((errorMessage, index) => (
                  <p key={`${errorMessage}-${index}`}>{translateSchemaIssue(tVal, errorMessage)}</p>
                ))}
              </Alert>
            ) : null}
            </div>
          </Panel>
        ) : null}

        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <ChunkyButton type="button" tone="secondary" className="w-full" onClick={onBackToHome}>
            {t('backHome')}
          </ChunkyButton>
        </div>

        {setupSubmitMessage ? (
          <Alert tone="info">{setupSubmitMessage}</Alert>
        ) : null}
      </section>
    </main>
  )
}
