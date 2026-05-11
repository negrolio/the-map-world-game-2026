import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from './cn'

export type BadgeTone =
  | 'paper'
  | 'wood'
  | 'success'
  | 'info'
  | 'warning'
  | 'action'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone
  readonly icon?: ReactNode
}

const toneStyles: Record<BadgeTone, string> = {
  paper: 'bg-paper text-ink border-wood-dark',
  wood: 'bg-wood-dark text-bone border-wood-dark/60',
  success: 'bg-success text-bone border-success-dark',
  info: 'bg-info text-bone border-info-dark',
  warning: 'bg-warning text-wood-dark border-warning-dark',
  action: 'bg-action text-bone border-action-dark',
}

/**
 * Compact label / pill used for round counters, statuses, categories.
 * Mirrors the chunky look (thick border, optional shadow) at smaller scale.
 */
export function Badge({
  tone = 'paper',
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-control border-2 px-2.5 py-0.5 font-display text-xs uppercase tracking-wide',
        toneStyles[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
