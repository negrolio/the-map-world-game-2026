import { useTranslation } from 'react-i18next'

import { Badge, Panel } from '../../components/ui'
import { cn } from '../../components/ui/cn'
import { answerAccuracyPercent } from '../../services'
import { FishboneIcon } from './FishboneIcon'
import {
  isHeroRankTestIdOwner,
  type RankedPlayerEntry,
  type ResultsLayout,
  resolvePodiumAward,
} from './results-podium'
import { resolvePositionLabel } from './results-position-label'
import { TrophyIcon } from './TrophyIcon'

export interface ResultsPodiumProps {
  readonly layout: ResultsLayout
}

const pedestalHeightByRank: Record<number, string> = {
  1: 'min-h-[5.5rem]',
  2: 'min-h-[4rem]',
  3: 'min-h-[3rem]',
}

const medalToneByMedal = {
  gold: 'warning',
  silver: 'paper',
  bronze: 'wood',
} as const

function podiumVisualOrder(entries: readonly RankedPlayerEntry[]): RankedPlayerEntry[] {
  if (entries.length <= 1) {
    return [...entries]
  }
  if (entries.length === 2) {
    return [...entries]
  }
  const second = entries[1]
  const first = entries[0]
  const third = entries[2]
  if (!second || !first || !third) {
    return [...entries]
  }
  return [second, first, third]
}

export function ResultsPodium({ layout }: ResultsPodiumProps) {
  const { t } = useTranslation('results')

  if (layout.podium.length === 0) {
    return null
  }

  const displayEntries = podiumVisualOrder(layout.podium)

  return (
    <Panel
      tone="paper"
      padding="md"
      ribbonTitle={t('podiumHeading')}
      className="results-reveal results-reveal-delayed"
    >
      <ol className="flex items-end justify-center gap-3 sm:gap-4">
        {displayEntries.map((entry) => {
          const { player, rankPosition, medal, isScoreTied } = entry
          const award = resolvePodiumAward(entry)
          const pedestalHeight =
            pedestalHeightByRank[rankPosition] ?? 'min-h-[2.5rem]'
          const showTestId = !isHeroRankTestIdOwner(entry, layout.hero)

          return (
            <li
              key={player.id}
              className="flex max-w-[8rem] flex-1 flex-col items-center gap-2 text-center"
              {...(showTestId
                ? {
                    'data-testid': `finished-rank-${entry.leaderboardIndex + 1}-${player.id}`,
                  }
                : {})}
            >
              {award === 'empty' ? (
                <FishboneIcon className="h-12 w-12 sm:h-14 sm:w-14" />
              ) : (
                <TrophyIcon
                  variant={award}
                  className="h-12 w-12 sm:h-14 sm:w-14"
                />
              )}
              {medal ? (
                <Badge tone={medalToneByMedal[medal]}>
                  {resolvePositionLabel(rankPosition, t)}
                  {isScoreTied ? ` · ${t('tieLabel')}` : ''}
                </Badge>
              ) : (
                <Badge tone="paper">
                  {resolvePositionLabel(rankPosition, t)}
                </Badge>
              )}
              <span className="font-display text-sm uppercase tracking-wide text-wood-dark">
                {player.name}
              </span>
              <span className="font-body text-xs text-ink-soft">
                {t('heroScore', { score: player.score })}
              </span>
              <div
                className={cn(
                  'flex w-full flex-col items-center justify-end rounded-t-card border-2 border-b-0 border-wood-dark bg-paper-mute px-2 pb-2 pt-3 shadow-chunky-sm',
                  pedestalHeight,
                )}
              >
                <span className="font-body text-xs text-ink-soft">
                  {t('heroAccuracy', {
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
