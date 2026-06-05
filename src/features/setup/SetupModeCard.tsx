import setupCardAiUrl from '../../assets/setup-card-ai.jpg'
import setupCardCapitalUrl from '../../assets/setup-card-capital.png'
import setupCardCountryUrl from '../../assets/setup-card-country.jpg'
import { cn } from '../../components/ui/cn'
import type { QuestionMode } from '../../types'

export interface SetupModeCardProps {
  readonly mode: QuestionMode
  readonly label: string
  readonly name: string
  readonly selected: boolean
  readonly testId: string
  readonly onSelect: () => void
}

const modeImageUrls: Record<QuestionMode, string> = {
  country: setupCardCountryUrl,
  capital: setupCardCapitalUrl,
  ai: setupCardAiUrl,
}

/**
 * Card vertical de modo en el lobby del setup. El radio nativo queda oculto
 * visualmente pero operable por teclado.
 */
export function SetupModeCard({
  mode,
  label,
  name,
  selected,
  testId,
  onSelect,
}: SetupModeCardProps) {
  return (
    <label
      data-testid={testId}
      className={cn(
        'group flex w-full cursor-pointer flex-col overflow-hidden rounded-panel border-2 bg-paper',
        'transition-[border-color,box-shadow,transform] duration-150 motion-reduce:transition-none',
        'hover:border-wood-dark/70 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
        'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wood-dark',
        selected ? 'border-action shadow-chunky' : 'border-wood-dark/40 shadow-chunky-sm',
      )}
    >
      <input
        type="radio"
        name={name}
        value={mode}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-paper-mute">
        <img
          src={modeImageUrls[mode]}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-full w-full object-cover opacity-90 [filter:sepia(0.18)_saturate(0.92)_contrast(1.02)_blur(0.3px)] transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
        <div className="pointer-events-none absolute inset-0 bg-paper-dark/25 mix-blend-multiply" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-wood-dark/65 via-wood-dark/10 to-transparent" />
      </div>
      <div className="flex flex-1 items-center justify-center px-1 py-2.5 md:px-2 md:py-4">
        <span className="text-center font-display text-xs uppercase leading-tight tracking-tight text-wood-dark md:text-lg">
          {label}
        </span>
      </div>
    </label>
  )
}
