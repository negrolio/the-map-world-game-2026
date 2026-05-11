import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from './cn'

export type ChunkyButtonTone =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'info'
  | 'warning'

export type ChunkyButtonSize = 'sm' | 'md' | 'lg'

export interface ChunkyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: ChunkyButtonTone
  readonly size?: ChunkyButtonSize
  readonly isLoading?: boolean
  readonly children: ReactNode
}

/**
 * Surface colors per tone. Static maps so Tailwind v4's content scanner picks
 * every class at build time.
 */
const toneStyles: Record<ChunkyButtonTone, string> = {
  primary:
    'bg-action text-bone border-wood-dark hover:bg-action-dark focus-visible:outline-action',
  secondary:
    'bg-paper text-ink border-wood-dark hover:bg-paper-dark focus-visible:outline-wood-dark',
  danger:
    'bg-action-dark text-bone border-wood-dark hover:bg-action focus-visible:outline-action-dark',
  success:
    'bg-success text-bone border-wood-dark hover:bg-success-dark focus-visible:outline-success-dark',
  info: 'bg-info text-bone border-wood-dark hover:bg-info-dark focus-visible:outline-info-dark',
  warning:
    'bg-warning text-ink border-wood-dark hover:bg-warning-dark focus-visible:outline-warning-dark',
}

const sizeStyles: Record<ChunkyButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

const baseStyles = [
  'relative inline-flex items-center justify-center',
  'font-display uppercase tracking-wide',
  'border-2 border-b-4 rounded-card',
  'shadow-chunky-sm',
  'transition-transform duration-75',
  'select-none whitespace-nowrap',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  'active:translate-y-[2px] active:shadow-none active:border-b-2',
  'disabled:opacity-60 disabled:cursor-not-allowed',
  'disabled:active:translate-y-0 disabled:active:shadow-chunky-sm disabled:active:border-b-4',
].join(' ')

/**
 * Chunky physical-feeling button used across all surfaces of the redesign.
 *
 * - Variants concentrate the per-tone Tailwind classes; consumers pass
 *   `tone` and `size` instead of repeating long utility strings.
 * - `active:` simulates the press by dropping the bottom shadow and lowering
 *   the element 2px, matching PRD §7 "Sombras y profundidad".
 * - Maintains accessibility: native button semantics, focus-visible ring,
 *   disabled cursor, loading state announces text replacement.
 */
export function ChunkyButton({
  tone = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ChunkyButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        baseStyles,
        toneStyles[tone],
        sizeStyles[size],
        isLoading ? 'cursor-wait' : '',
        className,
      )}
      disabled={disabled ?? isLoading}
    >
      {isLoading ? 'Cargando...' : children}
    </button>
  )
}
