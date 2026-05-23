import { useTranslation } from 'react-i18next'

import { Alert, Badge, ChunkyButton, Panel } from '../../components/ui'

export interface AiPromptsLoadingViewProps {
  readonly requestedItems: number
  readonly onCancel: () => void
}

/**
 * Pantalla intermedia mientras se generan los riddles del backend AI. Es
 * informativa pura: sin progress real (el endpoint v1 devuelve todo junto).
 * Se mantiene componible para que L9 conecte streaming sin tocar `App.tsx`.
 */
export function AiPromptsLoadingView(props: AiPromptsLoadingViewProps) {
  const { requestedItems, onCancel } = props
  const { t } = useTranslation('game')

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-5 px-6 py-12">
        <Badge tone="success">{t('ai.loadingBadge')}</Badge>
        <h1 className="font-display text-3xl uppercase tracking-tight text-wood-dark md:text-4xl">
          {t('ai.loadingTitle')}
        </h1>
        <Panel tone="paper" padding="lg" className="grid gap-3">
          <p className="font-body text-sm text-ink-soft md:text-base">
            {t('ai.loadingLead', { count: requestedItems })}
          </p>
          <Alert tone="info" role="status">
            {t('ai.loadingHint')}
          </Alert>
        </Panel>
        <div>
          <ChunkyButton type="button" tone="secondary" onClick={onCancel}>
            {t('ai.cancel')}
          </ChunkyButton>
        </div>
      </section>
    </main>
  )
}
