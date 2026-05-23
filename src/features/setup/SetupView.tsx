import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import type { AiTriviaTagId } from '../../../shared/ai-trivia-tags-schema'
import {
  Alert,
  Badge,
  ChunkyButton,
  FieldInput,
  FieldRadioGroup,
  FieldSelect,
  Panel,
} from '../../components/ui'
import type { AppLocale } from '../../i18n/app-locale'
import { SUPPORTED_LOCALES } from '../../i18n/app-locale'
import { PRODUCT_RULES } from '../../services'
import type {
  AntiCheatMode,
  GameConfig,
  QuestionMode,
  RegionFilter,
} from '../../types'
import { AiTriviaTagsPicker } from './AiTriviaTagsPicker'

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
  readonly onTagsChange: (next: readonly AiTriviaTagId[]) => void
  readonly onStartGame: () => void
  readonly onBackToHome: () => void
}

function translateDomainValidation(tVal: TFunction, error: SetupValidationError): string {
  const path = error.messageKey.replace(/^validation\./, '')
  return tVal(path, error.messageValues ?? {})
}

function translateSchemaIssue(tVal: TFunction, messageKey: string): string {
  return tVal(messageKey, {
    min: PRODUCT_RULES.players.min,
    max: PRODUCT_RULES.players.max,
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
    onTagsChange,
    onStartGame,
    onBackToHome,
  } = props

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

  const questionModeOptions = useMemo(
    () =>
      (
        [
          ['country', 'modeCountry'],
          ['capital', 'modeCapital'],
          ['ai', 'modeAi'],
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
  const showStrictForcedNotice = isAiMode && antiCheatMode !== 'strict'

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-5 px-6 py-12">
        <Badge tone="success">{t('badge')}</Badge>
        <h1 className="font-display text-3xl uppercase tracking-tight text-wood-dark md:text-5xl">
          {t('title')}
        </h1>
        <p className="max-w-2xl font-body text-sm text-ink-soft md:text-base">{t('lead')}</p>

        <Panel tone="paper" padding="lg" className="setup-panel-background grid gap-4">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              onStartGame()
            }}
          >
            <FieldSelect
              id="app-locale"
              label={t('languageLabel')}
              value={activeLocale}
              onChange={(event) => {
                void i18n.changeLanguage(event.target.value as AppLocale)
              }}
              options={languageOptions}
            />

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
              label={t('playerCountLabel')}
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

            <FieldRadioGroup
              legend={t('questionModeLegend')}
              name="question-mode"
              value={questionMode}
              options={questionModeOptions}
              onChange={onQuestionModeChange}
            />

            {isAiMode ? (
              <AiTriviaTagsPicker
                selectedTags={tags}
                onChange={onTagsChange}
                locale={activeLocale}
              />
            ) : null}

            <FieldSelect
              id="region-filter"
              label={t('regionLabel')}
              value={regionFilter}
              onChange={(event) => onRegionFilterChange(event.target.value as RegionFilter)}
              options={regionOptions}
            />

            <FieldRadioGroup
              legend={t('antiCheatLegend')}
              name="anti-cheat-mode"
              value={antiCheatMode}
              options={antiCheatOptions}
              onChange={onAntiCheatModeChange}
            />

            {showStrictForcedNotice ? (
              <Alert tone="info" data-testid="ai-strict-required-notice">
                {t('aiStrictRequired')}
              </Alert>
            ) : null}

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
              label={t('questionCountLabel')}
              aria-invalid={!canStartGame}
              aria-describedby="setup-feedback"
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

            {!validationResult.isValid ? (
              <Alert id="setup-feedback" tone="error" heading={t('invalidConfigHeading')}>
                <ul className="list-disc space-y-1 pl-5 text-xs">
                  {validationResult.errors.map((error, index) => (
                    <li key={`${error.field}-${index}`}>{translateDomainValidation(tVal, error)}</li>
                  ))}
                </ul>
              </Alert>
            ) : (
              <Alert id="setup-feedback" tone="success">
                {t('validConfig')}
              </Alert>
            )}

            {schemaOnlyErrors.length > 0 ? (
              <Alert tone="error">
                {schemaOnlyErrors.map((errorMessage, index) => (
                  <p key={`${errorMessage}-${index}`}>{translateSchemaIssue(tVal, errorMessage)}</p>
                ))}
              </Alert>
            ) : null}

            <Panel tone="paper-soft" padding="sm">
              <p className="mb-2 font-display text-xs uppercase tracking-wide text-ink-soft">
                {t('configPreviewHeading')}
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
            {t('startGame')}
          </ChunkyButton>
          <ChunkyButton type="button" tone="secondary" onClick={onBackToHome}>
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
