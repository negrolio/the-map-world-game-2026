import { useEffect, useId, type HTMLAttributes, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import learnModalPaperUrl from '../../assets/learn-modal-paper.png'
import { Alert, Badge, ChunkyButton } from '../../components/ui'
import { cn } from '../../components/ui/cn'
import { translateApiErrorCode } from '../../i18n/translate-api-error'
import type { AppLocale } from '../../i18n/app-locale'
import type { CountryLearnModalState } from './use-country-learn'

/** Matches `learn-modal-paper.png` (525×930, pergamino recortado sin marco exterior). */
const LEARN_MODAL_FRAME_ASPECT = '525 / 930'

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
      <LearnModalPaperShell
        titleId={titleId}
        onClose={onClose}
        onClick={(event) => event.stopPropagation()}
      >
        {state.status === 'loading' ? (
          <CountryLearnModalSkeleton titleId={titleId} />
        ) : null}

        {state.status === 'error' ? (
          <div className="grid gap-3">
            <ModalTitle titleId={titleId} title={t('loadErrorLead')} />
            <Alert tone="error" role="alert" className="font-body leading-relaxed">
              {translateApiErrorCode(tErr, state.error.code)}
            </Alert>
            <ChunkyButton type="button" tone="primary" onClick={onRetry}>
              {t('retry')}
            </ChunkyButton>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <div className="grid gap-3">
            <ModalTitle titleId={titleId} title={state.profile.displayName} />
            {state.offline ? (
              <Alert tone="warning" role="status" className="font-body leading-relaxed">
                {t('offlineNotice')}
              </Alert>
            ) : null}
            {state.profile.contentLocale !== requestedLocale ? (
              <Badge tone="info">{t('contentInEnglishBadge')}</Badge>
            ) : null}
            {state.profile.flagUrl ? (
              <img
                src={state.profile.flagUrl}
                alt={t('flagAlt', { country: state.profile.displayName })}
                className="mx-auto max-h-40 w-auto object-contain sm:max-h-48"
              />
            ) : null}
            <p className="text-sm leading-relaxed text-ink md:text-base">
              {state.profile.summary}
            </p>
            <a
              href={state.profile.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="learn-modal-link w-fit text-xs uppercase text-info-dark underline decoration-info-dark/50 underline-offset-2 transition-colors hover:text-info hover:decoration-info"
            >
              {t('readOnWikipedia')}
            </a>
          </div>
        ) : null}
      </LearnModalPaperShell>
    </div>
  )
}

function LearnModalPaperShell({
  titleId,
  onClose,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  readonly titleId: string
  readonly onClose: () => void
  readonly children: ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="country-learn-modal"
      className={cn(
        'relative isolate box-border flex w-[min(calc(100vw-2rem),calc((100dvh-2rem)*525/930),calc((100vh-2rem)*525/930))] max-w-full shrink-0 flex-col overflow-visible drop-shadow-lg',
        className,
      )}
      style={{
        aspectRatio: LEARN_MODAL_FRAME_ASPECT,
        backgroundImage: `url(${learnModalPaperUrl})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
      {...props}
    >
      <ModalCloseButton onClose={onClose} />
      <div className="pointer-events-none absolute inset-0 flex flex-col px-[14%] pb-[14%] pt-[23%]">
        <div className="learn-modal-scroll-outside learn-modal-content pointer-events-auto min-h-0 flex-1 text-sm md:text-base">
          {children}
        </div>
      </div>
    </div>
  )
}

function ModalCloseButton({ onClose }: { readonly onClose: () => void }) {
  const { t } = useTranslation('learn')

  return (
    <button
      type="button"
      onClick={onClose}
      data-testid="country-learn-modal-close"
      aria-label={t('close')}
      className="absolute right-[9%] top-[8%] z-20 flex size-9 items-center justify-center rounded-full font-display text-2xl leading-none text-wood-dark transition-colors hover:bg-paper/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wood-dark"
    >
      <span aria-hidden>×</span>
    </button>
  )
}

function ModalTitle({
  titleId,
  title,
}: {
  readonly titleId: string
  readonly title: string
}) {
  return (
    <h2
      id={titleId}
      className="learn-modal-title shrink-0 pr-8 text-xl uppercase leading-tight text-wood-dark sm:text-2xl"
    >
      {title}
    </h2>
  )
}

function CountryLearnModalSkeleton({ titleId }: { readonly titleId: string }) {
  const { t } = useTranslation('learn')

  return (
    <div className="grid min-h-0 flex-1 gap-3" aria-busy="true" aria-live="polite">
      <ModalTitle titleId={titleId} title={t('loading')} />
      <div className="h-28 animate-pulse rounded bg-wood-dark/10" />
      <div className="h-4 animate-pulse rounded bg-wood-dark/10" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-wood-dark/10" />
      <div className="h-4 w-4/6 animate-pulse rounded bg-wood-dark/10" />
    </div>
  )
}
