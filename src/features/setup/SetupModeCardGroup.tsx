import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import type { QuestionMode } from '../../types'
import { SetupModeCard } from './SetupModeCard'

const SETUP_MODE_ORDER = ['country', 'capital', 'ai'] as const satisfies readonly QuestionMode[]

const SETUP_MODE_TEST_IDS: Record<QuestionMode, string> = {
  country: 'setup-mode-country',
  capital: 'setup-mode-capital',
  ai: 'setup-mode-ai',
}

const SETUP_MODE_LABEL_KEYS: Record<QuestionMode, 'modeCountry' | 'modeCapital' | 'modeAi'> = {
  country: 'modeCountry',
  capital: 'modeCapital',
  ai: 'modeAi',
}

export interface SetupModeCardGroupProps {
  readonly legend: string
  readonly value: QuestionMode
  readonly onChange: (next: QuestionMode) => void
  readonly className?: string
}

/**
 * Radiogroup accesible de modos de partida para el lobby del setup.
 */
export function SetupModeCardGroup({ legend, value, onChange, className }: SetupModeCardGroupProps) {
  const { t } = useTranslation('setup')
  const legendId = useId()
  const radioName = 'setup-question-mode'

  return (
    <fieldset className={className ?? 'grid gap-3 md:gap-4'} aria-labelledby={legendId}>
      <legend
        id={legendId}
        className="w-full text-center font-display text-base uppercase tracking-wide text-wood-dark md:text-lg"
      >
        {legend}
      </legend>
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        {SETUP_MODE_ORDER.map((mode) => (
          <SetupModeCard
            key={mode}
            mode={mode}
            label={t(SETUP_MODE_LABEL_KEYS[mode])}
            name={radioName}
            selected={value === mode}
            testId={SETUP_MODE_TEST_IDS[mode]}
            onSelect={() => onChange(mode)}
          />
        ))}
      </div>
    </fieldset>
  )
}
