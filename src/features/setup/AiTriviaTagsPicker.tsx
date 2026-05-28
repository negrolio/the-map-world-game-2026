import { useTranslation } from 'react-i18next'

import {
  AI_TRIVIA_TAGS,
  type AiTriviaTagEntry,
  type AiTriviaTagId,
} from '../../../shared/ai-trivia-tags-schema'
import { cn } from '../../components/ui/cn'
import type { AppLocale } from '../../i18n/app-locale'

export interface AiTriviaTagsPickerProps {
  readonly selectedTags: readonly AiTriviaTagId[]
  readonly onChange: (next: readonly AiTriviaTagId[]) => void
  readonly locale: AppLocale
  readonly className?: string
}

const optionBase =
  'inline-flex cursor-pointer items-center gap-2 rounded-control border-2 border-wood-dark/40 bg-paper-mute px-3 py-1.5 font-body text-sm text-ink transition-colors hover:border-wood-dark/70 focus-within:border-wood-dark'

const optionSelected = 'border-wood-dark bg-warning/35 text-wood-dark shadow-chunky-sm'

/**
 * Picker visual de tags temáticos del modo AI. Soporta multi-select y un
 * pseudo-tag "todas" que limpia la selección (significa "cualquier tag del
 * catálogo" según PRD RF-F03).
 *
 * Si todos los tags reales están seleccionados, el botón "todas" se activa
 * automáticamente para reflejar el estado equivalente (UX espejo).
 */
export function AiTriviaTagsPicker(props: AiTriviaTagsPickerProps) {
  const { selectedTags, onChange, locale, className } = props
  const { t } = useTranslation('setup')

  const allSelected = selectedTags.length === 0 ||
    selectedTags.length === AI_TRIVIA_TAGS.length

  const toggleTag = (tag: AiTriviaTagId): void => {
    const set = new Set(selectedTags)
    if (set.has(tag)) {
      set.delete(tag)
    } else {
      set.add(tag)
    }
    const next = AI_TRIVIA_TAGS.map((entry) => entry.id).filter((id) => set.has(id))
    if (next.length === AI_TRIVIA_TAGS.length) {
      onChange([])
      return
    }
    onChange(next)
  }

  const selectAll = (): void => {
    onChange([])
  }

  return (
    <fieldset className={cn('grid gap-2', className)}>
      <legend className="font-display text-sm uppercase tracking-wide text-wood-dark">
        {t('aiTagsLegend')}
      </legend>
      <p className="text-xs text-ink-soft">{t('aiTagsHelp')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={allSelected}
          className={cn(optionBase, allSelected ? optionSelected : '')}
          onClick={selectAll}
        >
          {t('aiTagAll')}
        </button>
        {AI_TRIVIA_TAGS.map((tag: AiTriviaTagEntry) => {
          const isSelected = !allSelected && selectedTags.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={isSelected}
              data-tag-id={tag.id}
              className={cn(optionBase, isSelected ? optionSelected : '')}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.labels[locale]}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
