import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from './cn'

export type AlertTone = 'success' | 'error' | 'warning' | 'info' | 'neutral'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone: AlertTone
  readonly heading?: ReactNode
  /**
   * Role used for the live region. Use `alert` for errors that should be
   * announced immediately, `status` for non-blocking updates. Defaults to
   * `status` for non-error tones and `alert` for `error`.
   */
  readonly role?: 'alert' | 'status'
}

const toneStyles: Record<AlertTone, string> = {
  success:
    'bg-success/15 border-success text-wood-dark',
  error: 'bg-action/15 border-action text-wood-dark',
  warning: 'bg-warning/25 border-warning-dark text-wood-dark',
  info: 'bg-info/15 border-info-dark text-wood-dark',
  neutral: 'bg-paper-dark/60 border-wood-dark/60 text-wood-dark',
}

/**
 * Status / alert blocks. Color tone + text + accessible role so messages are
 * distinguishable beyond color alone (PRD §11 criterion 7).
 */
export function Alert({
  tone,
  heading,
  role,
  className,
  children,
  ...props
}: AlertProps) {
  const resolvedRole = role ?? (tone === 'error' ? 'alert' : 'status')

  return (
    <div
      {...props}
      role={resolvedRole}
      aria-live={resolvedRole === 'alert' ? 'assertive' : 'polite'}
      className={cn(
        'rounded-card border-2 px-3 py-2 text-sm shadow-chunky-sm',
        toneStyles[tone],
        className,
      )}
    >
      {heading ? <p className="font-display text-base">{heading}</p> : null}
      {children ? <div className={heading ? 'mt-1' : ''}>{children}</div> : null}
    </div>
  )
}
