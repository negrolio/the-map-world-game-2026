import type { ReactNode } from 'react'

import { cn } from './cn'

export interface FieldRadioOption<T extends string> {
  readonly value: T
  readonly label: ReactNode
}

export interface FieldRadioGroupProps<T extends string> {
  readonly legend: ReactNode
  readonly name: string
  readonly value: T
  readonly options: ReadonlyArray<FieldRadioOption<T>>
  readonly onChange: (next: T) => void
  readonly className?: string
}

const optionBase =
  'inline-flex cursor-pointer items-center gap-2 rounded-control border-2 border-wood-dark/40 bg-paper-mute px-3 py-1.5 font-body text-sm text-ink transition-colors hover:border-wood-dark/70 focus-within:border-wood-dark'

const optionSelected =
  'border-wood-dark bg-warning/35 text-wood-dark shadow-chunky-sm'

/**
 * Accessible radio group rendered as toggleable chips. The underlying
 * `<input type="radio">` elements stay native (covered visually but reachable
 * via keyboard, screen reader and click on the label).
 */
export function FieldRadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  className,
}: FieldRadioGroupProps<T>) {
  return (
    <fieldset className={cn('grid gap-2', className)}>
      <legend className="font-display text-sm uppercase tracking-wide text-wood-dark">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option.value === value
          return (
            <label
              key={option.value}
              className={cn(optionBase, isSelected ? optionSelected : '')}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="size-4 accent-action"
              />
              {option.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
