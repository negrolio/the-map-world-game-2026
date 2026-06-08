import { useTranslation } from 'react-i18next'

import type { AiPromptSource } from '../../../shared/ai-trivia-api'
import { Badge, Panel } from '../../components/ui'
import type { AppLocale } from '../../i18n/app-locale'
import {
  getAiScoreForAttempt,
  isAiAttemptNumber,
  isSafeWikipediaUrl,
} from '../../services'
import type { GameSession, Round } from '../../types'
import { resolveCountryNameByIso2 } from './resolve-country-name-by-iso2'

export interface AiRoundsSummaryProps {
  readonly session: GameSession
  readonly locale: AppLocale
}

interface RoundOutcome {
  readonly isSolved: boolean
  readonly winningAttemptNumber: number | null
  readonly scoreDelta: number
}

/**
 * Sección post-partida (modo AI) que repasa cada ronda jugada con:
 * - número y prompt,
 * - país objetivo (nombre localizado),
 * - link a fuente Wikipedia (anchor si `isSafeWikipediaUrl`, texto plano si no),
 * - indicador "Acertaste en intento N" / "Sin acierto",
 * - delta de score (+1 / +0.5 / +0.25 / 0).
 *
 * No tiene estado interno. Deriva todo de `session.rounds` y del catálogo
 * local. PRD UX feedback modo AI §4.6 (RF-F70..RF-F78).
 */
export function AiRoundsSummary({ session, locale }: AiRoundsSummaryProps) {
  const { t } = useTranslation('results')

  return (
    <Panel
      tone="paper"
      padding="md"
      ribbonTitle={t('ai.summaryHeading')}
      data-testid="ai-rounds-summary"
    >
      <ol className="space-y-4">
        {session.rounds.map((round) => (
          <AiRoundSummaryEntry
            key={round.id}
            round={round}
            locale={locale}
          />
        ))}
      </ol>
    </Panel>
  )
}

interface AiRoundSummaryEntryProps {
  readonly round: Round
  readonly locale: AppLocale
}

function AiRoundSummaryEntry({ round, locale }: AiRoundSummaryEntryProps) {
  const { t } = useTranslation('results')
  const targetCountryName = resolveCountryNameByIso2(round.targetCountryCode, locale)
  const outcome = resolveRoundOutcome(round)

  return (
    <li
      className="rounded-card border-2 border-wood-dark/15 bg-paper-mute/40 p-3 last:border-b-2"
      data-testid={`ai-rounds-summary-entry-${round.roundNumber}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <Badge tone="wood">{t('ai.roundNumber', { n: round.roundNumber })}</Badge>
          <span className="font-display text-base uppercase tracking-wide text-wood-dark">
            {targetCountryName}
          </span>
        </div>
        <p className="font-body text-sm text-ink">{round.prompt}</p>
        <div className="flex flex-wrap items-center gap-2">
          {outcome.isSolved && outcome.winningAttemptNumber !== null ? (
            <Badge tone="success" data-testid="ai-rounds-summary-attempt-badge">
              {t('ai.attemptLabel', { n: outcome.winningAttemptNumber })}
            </Badge>
          ) : (
            <Badge tone="warning" data-testid="ai-rounds-summary-not-solved-badge">
              {t('ai.notSolved')}
            </Badge>
          )}
          <Badge tone="info" data-testid="ai-rounds-summary-score-delta">
            {t('ai.scoreDelta', { value: formatScoreDelta(outcome.scoreDelta) })}
          </Badge>
        </div>
        {round.aiSource ? <AiRoundSummarySource source={round.aiSource} /> : null}
      </div>
    </li>
  )
}

interface AiRoundSummarySourceProps {
  readonly source: AiPromptSource
}

function AiRoundSummarySource({ source }: AiRoundSummarySourceProps) {
  const { t } = useTranslation('results')
  if (!isSafeWikipediaUrl(source.url)) {
    return (
      <p
        className="font-body text-xs text-ink-soft"
        data-testid="ai-rounds-summary-source-fallback"
      >
        <span className="font-semibold">{source.title}</span>
      </p>
    )
  }
  return (
    <p className="font-body text-xs text-ink-soft" data-testid="ai-rounds-summary-source-link">
      <a
        className="font-semibold text-wood-dark underline underline-offset-2 hover:text-wood"
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {source.title}
      </a>{' '}
      <span aria-hidden="true">↗</span>
      <span className="sr-only">{t('ai.sourceLink')}</span>
    </p>
  )
}

function resolveRoundOutcome(round: Round): RoundOutcome {
  const guess = round.guess
  if (!guess || !guess.isCorrect) {
    return { isSolved: false, winningAttemptNumber: null, scoreDelta: 0 }
  }
  const attemptsLength = round.attempts?.length ?? 0
  const winningAttemptNumber = attemptsLength > 0 ? attemptsLength : 1
  const scoreDelta = isAiAttemptNumber(winningAttemptNumber)
    ? getAiScoreForAttempt(winningAttemptNumber)
    : 0
  return { isSolved: true, winningAttemptNumber, scoreDelta }
}

function formatScoreDelta(value: number): string {
  if (value > 0) {
    return `+${value}`
  }
  return String(value)
}
