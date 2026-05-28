import { useTranslation } from 'react-i18next'

import type { AiPromptSource } from '../../../shared/ai-trivia-api'
import { isSafeWikipediaUrl } from '../../services/safe-wikipedia-url'

export interface AiSourceLinkProps {
  readonly source: AiPromptSource
}

/**
 * Link a la fuente Wikipedia declarada por el LLM. Valida defensivamente la
 * URL antes de renderizar (https + wikipedia.org) vía `isSafeWikipediaUrl`.
 * Si no pasa la validación se omite el link y solo se muestra el título
 * (sin enlace).
 */
export function AiSourceLink(props: AiSourceLinkProps) {
  const { source } = props
  const { t } = useTranslation('game')
  if (!isSafeWikipediaUrl(source.url)) {
    return (
      <p className="font-body text-xs text-bone/90" data-testid="ai-source-link-safe-fallback">
        {t('ai.sourceLabel')}
        <span className="font-semibold">{source.title}</span>
      </p>
    )
  }
  return (
    <p className="font-body text-xs text-bone/90" data-testid="ai-source-link">
      {t('ai.sourceLabel')}
      <a
        className="font-semibold text-warning underline underline-offset-2 hover:text-warning/80"
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {source.title}
      </a>{' '}
      <span aria-hidden="true">↗</span>
      <span className="sr-only">{t('ai.sourceLink')}</span>
    </p>
  )
}
