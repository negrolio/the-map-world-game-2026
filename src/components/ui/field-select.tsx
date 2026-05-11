import type { ReactNode, SelectHTMLAttributes } from 'react'

import { cn } from './cn'

export interface FieldSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label: ReactNode
  readonly labelId?: string
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>
}

const selectBase =
  'w-full appearance-none rounded-control border-2 border-wood-dark/70 bg-paper-mute px-3 py-2 pr-8 font-body text-base text-ink shadow-chunky-sm transition-colors hover:border-wood-dark focus:border-wood-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-wood-dark/40'

/**
 * Labeled select styled with redesign tokens. Renders a custom caret using
 * an inline background-image so the control matches the chunky look.
 */
export function FieldSelect({
  label,
  labelId,
  options,
  id,
  className,
  ...props
}: FieldSelectProps) {
  const resolvedLabelId = labelId ?? (id ? `${id}-label` : undefined)

  return (
    <label className="grid gap-1.5 text-sm">
      <span
        className="font-display text-sm uppercase tracking-wide text-wood-dark"
        id={resolvedLabelId}
      >
        {label}
      </span>
      <div className="relative">
        <select
          id={id}
          aria-labelledby={resolvedLabelId}
          className={cn(selectBase, className)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-display text-wood-dark"
        >
          ▾
        </span>
      </div>
    </label>
  )
}
