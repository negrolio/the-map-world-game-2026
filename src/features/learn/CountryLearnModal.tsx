import { useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, Badge, ChunkyButton, Panel } from '../../components/ui'
import { translateApiErrorCode } from '../../i18n/translate-api-error'
import type { AppLocale } from '../../i18n/app-locale'
import type { CountryLearnModalState } from './use-country-learn'

export interface CountryLearnModalProps {
  readonly state: CountryLearnModalState
  readonly requestedLocale: AppLocale
  readonly onClose: () => void
  readonly onRetry: () => void
}

export function CountryLearnModal({
  state,
  requestedLocale,
  onClose,
  onRetry,
}: CountryLearnModalProps) {
  const { t } = useTranslation('learn')
  const { t: tErr } = useTranslation('errors')
  const titleId = useId()

  useEffect(() => {
    const closeButton = document.querySelector<HTMLButtonElement>(
      '[data-testid="country-learn-modal-close"]',
    )
    closeButton?.focus()
  }, [state.status])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-30 flex items-end justify-center bg-wood-dark/50 p-4 sm:items-center"
      data-testid="country-learn-modal-backdrop"
      onClick={onClose}
    >
      <Panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tone="paper"
        padding="lg"
        className="max-h-[min(85vh,640px)] w-full max-w-lg overflow-hidden shadow-chunky"
        data-testid="country-learn-modal"
        onClick={(event) => event.stopPropagation()}
      >
        {state.status === 'loading' ? (
          <CountryLearnModalSkeleton titleId={titleId} onClose={onClose} />
        ) : null}

        {state.status === 'error' ? (
          <div className="grid gap-4">
            <ModalHeader titleId={titleId} title={t('loadErrorLead')} onClose={onClose} />
            <Alert tone="error" role="alert">
              {translateApiErrorCode(tErr, state.error.code)}
            </Alert>
            <div className="flex flex-wrap gap-2">
              <ChunkyButton type="button" tone="primary" onClick={onRetry}>
                {t('retry')}
              </ChunkyButton>
              <ChunkyButton
                type="button"
                tone="secondary"
                data-testid="country-learn-modal-close"
                onClick={onClose}
              >
                {t('close')}
              </ChunkyButton>
            </div>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <div className="grid max-h-[min(75vh,560px)] gap-4 overflow-y-auto">
            <ModalHeader titleId={titleId} title={state.profile.title} onClose={onClose} />
            {state.offline ? (
              <Alert tone="warning" role="status">
                {t('offlineNotice')}
              </Alert>
            ) : null}
            {state.profile.locale !== requestedLocale ? (
              <Badge tone="info">{t('contentInEnglishBadge')}</Badge>
            ) : null}
            {state.profile.flagUrl ? (
              <img
                src={state.profile.flagUrl}
                alt={t('flagAlt', { country: state.profile.title })}
                className="mx-auto max-h-40 w-auto rounded-card border-2 border-wood-dark/40 object-contain"
              />
            ) : null}
            <p className="font-body text-sm leading-relaxed text-ink md:text-base">
              {state.profile.summary}
            </p>
            <a
              href={state.profile.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-sm uppercase tracking-wide text-info-dark underline"
            >
              {t('readOnWikipedia')}
            </a>
          </div>
        ) : null}
      </Panel>
    </div>
  )
}

function ModalHeader({
  titleId,
  title,
  onClose,
}: {
  readonly titleId: string
  readonly title: string
  readonly onClose: () => void
}) {
  const { t } = useTranslation('learn')

  return (
    <div className="flex items-start justify-between gap-3">
      <h2 id={titleId} className="font-display text-xl uppercase tracking-tight text-wood-dark">
        {title}
      </h2>
      <ChunkyButton
        type="button"
        tone="secondary"
        size="sm"
        data-testid="country-learn-modal-close"
        onClick={onClose}
      >
        {t('close')}
      </ChunkyButton>
    </div>
  )
}

function CountryLearnModalSkeleton({
  titleId,
  onClose,
}: {
  readonly titleId: string
  readonly onClose: () => void
}) {
  const { t } = useTranslation('learn')

  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <ModalHeader titleId={titleId} title={t('loading')} onClose={onClose} />
      <div className="h-32 animate-pulse rounded-card bg-paper-mute" />
      <div className="h-4 animate-pulse rounded bg-paper-mute" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-paper-mute" />
      <div className="h-4 w-4/6 animate-pulse rounded bg-paper-mute" />
    </div>
  )
}
