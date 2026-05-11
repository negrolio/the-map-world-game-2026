import type { HTMLAttributes } from 'react'

import { cn } from './cn'

export interface PlayerCardProps extends HTMLAttributes<HTMLDivElement> {
  readonly playerIndex: number
  readonly playerName: string
  readonly score: number
  readonly correctAnswers: number
  readonly wrongAnswers: number
  readonly isActive: boolean
  readonly density?: 'compact' | 'card'
}

const baseStyles =
  'min-w-0 rounded-card border-2 transition-colors'

const cardStyles = {
  active:
    'border-wood-dark bg-warning/30 text-wood-dark shadow-chunky-sm',
  idle: 'border-wood-dark/60 bg-paper-mute text-ink',
} as const

const compactStyles = {
  active:
    'border-wood-dark bg-warning/30 text-wood-dark',
  idle: 'border-transparent bg-transparent text-ink',
} as const

/**
 * Player ficha used in the HUD. Two densities:
 *  - `card`: grid item on tablet/desktop (md+).
 *  - `compact`: list row for mobile viewports.
 */
export function PlayerCard({
  playerIndex,
  playerName,
  score,
  correctAnswers,
  wrongAnswers,
  isActive,
  density = 'card',
  className,
  ...props
}: PlayerCardProps) {
  const palette = density === 'card' ? cardStyles : compactStyles
  const padding = density === 'card' ? 'px-3 py-2' : 'min-h-[2.75rem] py-1.5 px-2'

  return (
    <div
      {...props}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        baseStyles,
        padding,
        isActive ? palette.active : palette.idle,
        density === 'compact' ? 'flex items-center gap-2' : '',
        className,
      )}
    >
      {density === 'card' ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <p
              className="truncate font-display text-sm uppercase tracking-wide text-wood-dark"
              title={playerName}
            >
              {playerIndex + 1}. {playerName}
            </p>
            {isActive ? (
              <span className="shrink-0 rounded-control border-2 border-wood-dark bg-action px-1.5 py-0.5 text-[10px] font-bold uppercase text-bone">
                Turno
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-body text-xs text-ink-soft">
            <span className="font-bold text-wood-dark">{score}</span> pts · ✓ {correctAnswers} · ✗{' '}
            {wrongAnswers}
          </p>
        </>
      ) : (
        <>
          <p
            className="min-w-0 flex-1 truncate font-display text-sm uppercase tracking-wide text-wood-dark"
            title={playerName}
          >
            <span className="text-ink-soft">{playerIndex + 1}.</span> {playerName}
          </p>
          {isActive ? (
            <span className="shrink-0 rounded-control border-2 border-wood-dark bg-action px-1.5 py-0.5 text-[10px] font-bold uppercase text-bone">
              Turno
            </span>
          ) : (
            <span className="w-12 shrink-0" aria-hidden />
          )}
          <p className="shrink-0 whitespace-nowrap font-body text-[11px] leading-tight text-ink-soft sm:text-xs">
            <span className="font-bold text-wood-dark">{score}</span>
            <span className="text-ink-soft">pts</span>
            <span className="text-ink-soft">·</span>✓{correctAnswers}
            <span className="text-ink-soft">·</span>✗{wrongAnswers}
          </p>
        </>
      )}
    </div>
  )
}
