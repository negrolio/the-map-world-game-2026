import type { ButtonHTMLAttributes } from 'react'

import { cn } from '../../components/ui/cn'

export type HomeModeCardVariant = 'primary' | 'secondary'

export interface HomeModeCardProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> {
  readonly title: string
  readonly description: string
  readonly imageUrl: string
  readonly imageAlt?: string
  readonly variant: HomeModeCardVariant
  readonly testId: string
  readonly onActivate: () => void
}

const variantStyles: Record<HomeModeCardVariant, string> = {
  primary: 'border-wood-dark shadow-chunky border-b-4 hover:shadow-chunky-lg',
  secondary: 'border-wood-dark/80 shadow-chunky-sm border-b-2 hover:shadow-chunky',
}

/**
 * Card clickeable de la home: imagen decorativa + título y reseña con overlay legible.
 */
export function HomeModeCard({
  title,
  description,
  imageUrl,
  imageAlt = '',
  variant,
  testId,
  onActivate,
  className,
  'aria-label': ariaLabel,
  ...buttonProps
}: HomeModeCardProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={ariaLabel}
      onClick={onActivate}
      className={cn(
        'group flex min-h-[220px] w-full flex-col overflow-hidden rounded-panel border-2 bg-paper text-left',
        'transition-[box-shadow,transform] duration-150',
        'hover:-translate-y-0.5',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wood-dark',
        variantStyles[variant],
        className,
      )}
      {...buttonProps}
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden">
        <img
          src={imageUrl}
          alt={imageAlt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-wood-dark/40 via-transparent to-transparent" />
      </div>
      <div className="flex flex-1 flex-col gap-2 bg-paper/95 px-4 py-4">
        <h2 className="font-display text-xl uppercase tracking-tight text-wood-dark md:text-2xl">
          {title}
        </h2>
        <p className="font-body text-sm leading-relaxed text-ink-soft md:text-base">{description}</p>
      </div>
    </button>
  )
}
