import { useTranslation } from 'react-i18next'

import { Panel } from '../../components/ui'
import { answerAccuracyPercent } from '../../services'
import { FishboneIcon } from './FishboneIcon'
import { type RankedPlayerEntry, resolveHeroAward } from './results-podium'
import { resolvePositionLabel } from './results-position-label'
import { TrophyIcon } from './TrophyIcon'

export interface ResultsHeroProps {
  readonly entry: RankedPlayerEntry
  readonly isSoloPlayer: boolean
}

export function ResultsHero({ entry, isSoloPlayer }: ResultsHeroProps) {
  const { t } = useTranslation('results')
  const { player } = entry
  const accuracy = answerAccuracyPercent(player.correctAnswers, player.wrongAnswers)
  const award = resolveHeroAward(entry, isSoloPlayer, accuracy)

  const ribbonTitle = isSoloPlayer ? t('heroSoloTitle') : t('heroWinnerRibbon')
  const lead = isSoloPlayer ? t('heroSoloLead') : t('heroWinnerLead')

  return (
    <Panel
      tone="paper"
      padding="lg"
      ribbonTitle={ribbonTitle}
      className="results-reveal"
      data-testid="game-winner"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        {award === 'empty' ? (
          <FishboneIcon className="h-20 w-20 shrink-0" />
        ) : (
          <TrophyIcon variant={award} className="h-20 w-20 shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="font-body text-sm text-ink-soft">{lead}</p>
          <p className="font-display text-2xl uppercase tracking-wide text-wood-dark md:text-3xl">
            {player.name}
            {!isSoloPlayer && entry.isScoreTied ? (
              <span className="ml-2 text-base text-ink-soft">({t('tieLabel')})</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <span className="font-display text-xl text-action">
              {t('heroScore', { score: player.score })}
            </span>
            <span className="font-body text-sm text-ink-soft">
              {t('heroAccuracy', { accuracy })}
            </span>
            {!isSoloPlayer ? (
              <span className="font-display text-xs uppercase tracking-wide text-ink-soft">
                {resolvePositionLabel(entry.rankPosition, t)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <span
        className="sr-only"
        data-testid={`finished-rank-${entry.leaderboardIndex + 1}-${player.id}`}
      >
        {player.name}
      </span>
    </Panel>
  )
}
