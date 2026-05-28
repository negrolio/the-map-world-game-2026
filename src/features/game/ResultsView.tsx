import { useTranslation } from 'react-i18next'

import { Alert, Badge, ChunkyButton, Panel } from '../../components/ui'
import { datasetVersion } from '../../data'
import { normalizeAppLocale, type AppLocale } from '../../i18n/app-locale'
import { answerAccuracyPercent, buildGameResult } from '../../services'
import type { GameSession } from '../../types'
import { AiRoundsSummary } from './AiRoundsSummary'

export interface ResultsViewProps {
  readonly session: GameSession
  readonly antiCheatNotice: string | null
  readonly onReplaySameConfig: () => void
  readonly onGoToSetup: () => void
  readonly onGoToHome: () => void
}

export function ResultsView({
  session,
  antiCheatNotice,
  onReplaySameConfig,
  onGoToSetup,
  onGoToHome,
}: ResultsViewProps) {
  const { t, i18n } = useTranslation('results')
  const { t: tCommon } = useTranslation('common')
  const locale: AppLocale = normalizeAppLocale(i18n.language) ?? 'es'

  const outcome = session.result ?? buildGameResult(session.players, session.rounds.length)
  const winnerPlayer = outcome.winnerPlayerId
    ? outcome.leaderboard.find((player) => player.id === outcome.winnerPlayerId)
    : undefined

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2">
          <Badge tone="warning">{t('badge')}</Badge>
          <h1 className="font-display text-3xl uppercase tracking-tight text-wood-dark md:text-4xl">
            {t('title')}
          </h1>
          <p className="font-body text-sm text-ink-soft" data-testid="game-finished-status">
            {t('statusLabel')}{' '}
            {session.status === 'aborted' ? t('statusAborted') : t('statusFinished')}.{' '}
            {outcome.totalRounds}{' '}
            {outcome.totalRounds === 1 ? t('roundsOne') : t('roundsMany')}. {t('scoringNote')}{' '}
            {tCommon('datasetVersionLabel')}: {datasetVersion}.
          </p>
          <p className="font-body text-sm text-ink-soft" data-testid="anti-cheat-incidents">
            {t('incidentsLabel')} {session.incidentCount}
          </p>
          {antiCheatNotice ? (
            <Alert tone="warning">{antiCheatNotice}</Alert>
          ) : null}
          {winnerPlayer ? (
            <Alert tone="info" data-testid="game-winner">
              {t('winnerLead')} <strong>{winnerPlayer.name}</strong>{' '}
              {t('winnerStats', {
                score: winnerPlayer.score,
                accuracy: answerAccuracyPercent(
                  winnerPlayer.correctAnswers,
                  winnerPlayer.wrongAnswers,
                ),
              })}
            </Alert>
          ) : null}
        </header>
        <Panel tone="paper" padding="md">
          <h2 className="mb-2 font-display text-xs uppercase tracking-wide text-ink-soft">
            {t('leaderboardHeading')}
          </h2>
          <ol className="list-decimal space-y-3 pl-6 marker:font-display marker:text-wood-dark">
            {outcome.leaderboard.map((player, rankIndex) => (
              <li
                key={player.id}
                className="border-b-2 border-wood-dark/15 pb-3 pl-1 last:border-b-0 last:pb-0"
                data-testid={`finished-rank-${rankIndex + 1}-${player.id}`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <span className="font-display text-base uppercase tracking-wide text-wood-dark">
                    {player.name}
                  </span>
                  <span className="font-body text-sm text-ink-soft">
                    {t('leaderboardStats', {
                      score: player.score,
                      correct: player.correctAnswers,
                      wrong: player.wrongAnswers,
                      accuracy: answerAccuracyPercent(
                        player.correctAnswers,
                        player.wrongAnswers,
                      ),
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
        {session.config.questionMode === 'ai' ? (
          <AiRoundsSummary session={session} locale={locale} />
        ) : null}
        <div className="flex flex-wrap gap-3">
          <ChunkyButton
            type="button"
            tone="primary"
            size="lg"
            data-testid="replay-same-config-button"
            onClick={onReplaySameConfig}
          >
            {t('replay')}
          </ChunkyButton>
          <ChunkyButton type="button" tone="success" onClick={onGoToSetup}>
            {t('newGameSetup')}
          </ChunkyButton>
          <ChunkyButton type="button" tone="secondary" onClick={onGoToHome}>
            {t('goHome')}
          </ChunkyButton>
        </div>
      </section>
    </main>
  )
}
