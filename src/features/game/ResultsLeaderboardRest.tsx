import { useTranslation } from 'react-i18next'

import { Panel } from '../../components/ui'
import { answerAccuracyPercent } from '../../services'
import type { RankedPlayerEntry } from './results-podium'
import { resolvePositionLabel } from './results-position-label'

export interface ResultsLeaderboardRestProps {
  readonly entries: readonly RankedPlayerEntry[]
}

export function ResultsLeaderboardRest({ entries }: ResultsLeaderboardRestProps) {
  const { t } = useTranslation('results')

  if (entries.length === 0) {
    return null
  }

  return (
    <Panel tone="paper" padding="md">
      <h2 className="mb-2 font-display text-xs uppercase tracking-wide text-ink-soft">
        {t('leaderboardHeading')}
      </h2>
      <ol className="space-y-3">
        {entries.map((entry) => {
          const { player } = entry
          return (
            <li
              key={player.id}
              className="border-b-2 border-wood-dark/15 pb-3 last:border-b-0 last:pb-0"
              data-testid={`finished-rank-${entry.leaderboardIndex + 1}-${player.id}`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-xs uppercase tracking-wide text-ink-soft">
                    {resolvePositionLabel(entry.rankPosition, t)}
                    {entry.isScoreTied ? ` · ${t('tieLabel')}` : ''}
                  </span>
                  <span className="font-display text-base uppercase tracking-wide text-wood-dark">
                    {player.name}
                  </span>
                </div>
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
          )
        })}
      </ol>
    </Panel>
  )
}
