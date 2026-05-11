import type { InputHTMLAttributes, ReactNode } from 'react'

import { cn } from './cn'

export interface FieldInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: ReactNode
  readonly labelId?: string
  readonly description?: ReactNode
  readonly invalid?: boolean
}

const inputBase =
  'w-full rounded-control border-2 border-wood-dark/70 bg-paper-mute px-3 py-2 font-body text-base text-ink shadow-chunky-sm transition-colors placeholder:text-ink-soft/60 hover:border-wood-dark focus:border-wood-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-wood-dark/40'

const inputInvalid = 'border-action shadow-[0_2px_0_0_var(--color-action-dark)]'

/**
 * Labeled text/number input styled with the redesign tokens. Keeps native
 * `<input>` accessibility (`aria-*`, `type`) and forwards rest props.
 */
export function FieldInput({
  label,
  labelId,
  description,
  invalid,
  id,
  className,
  ...props
}: FieldInputProps) {
  const resolvedLabelId = labelId ?? (id ? `${id}-label` : undefined)

  return (
    <label className="grid gap-1.5 text-sm">
      <span
        className="font-display text-sm uppercase tracking-wide text-wood-dark"
        id={resolvedLabelId}
      >
        {label}
      </span>
      <input
        id={id}
        aria-labelledby={resolvedLabelId}
        aria-invalid={invalid ? true : undefined}
        className={cn(inputBase, invalid ? inputInvalid : '', className)}
        {...props}
      />
      {description ? (
        <span className="text-xs text-ink-soft">{description}</span>
      ) : null}
    </label>
  )
}
