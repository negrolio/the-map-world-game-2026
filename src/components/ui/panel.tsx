import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from './cn'

export type PanelTone = 'paper' | 'paper-soft' | 'wood' | 'paper-on-wood'

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: PanelTone
  /** Optional ribbon-style title rendered on top of the panel. */
  readonly ribbonTitle?: ReactNode
  /** Optional inline element placed next to the title (e.g. counter). */
  readonly titleAside?: ReactNode
  readonly padding?: 'sm' | 'md' | 'lg'
}

const toneStyles: Record<PanelTone, string> = {
  paper:
    'bg-paper text-ink border-2 border-wood-dark shadow-chunky rounded-panel',
  'paper-soft':
    'bg-paper-mute text-ink border-2 border-wood-dark/70 shadow-chunky-sm rounded-card',
  wood: 'bg-wood-dark text-bone border-2 border-wood-dark/80 shadow-chunky-wood rounded-panel',
  'paper-on-wood':
    'bg-paper text-ink border-2 border-wood-dark shadow-chunky rounded-panel',
}

const paddingStyles = {
  sm: 'p-3',
  md: 'p-4 md:p-5',
  lg: 'p-5 md:p-6',
} as const

/**
 * Container surface for the redesign. Paper / wood metaphors from PRD §6.
 *
 * - `paper`: main panels (forms, ranking, results body).
 * - `paper-soft`: secondary blocks inside a panel (info rows, summaries).
 * - `wood`: dark surfaces used for HUD or overlays.
 * - `paper-on-wood`: same paper visual but composed inside a wood wrapper
 *   when used directly (consumer wraps in a dark container).
 *
 * The optional `ribbonTitle` renders a tilted badge sitting on top of the
 * panel, matching the PRD ribbon pattern without ornate SVGs.
 */
export function Panel({
  tone = 'paper',
  ribbonTitle,
  titleAside,
  padding = 'md',
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <div
      {...props}
      className={cn(
        'relative',
        toneStyles[tone],
        paddingStyles[padding],
        ribbonTitle ? 'mt-6' : '',
        className,
      )}
    >
      {ribbonTitle ? (
        <div className="pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2">
          <span className="pointer-events-auto inline-flex items-center gap-2 rounded-card border-2 border-wood-dark bg-action px-4 py-1.5 font-display text-sm uppercase tracking-wide text-bone shadow-chunky-sm">
            {ribbonTitle}
            {titleAside}
          </span>
        </div>
      ) : null}
      {children}
    </div>
  )
}
