import { useTranslation } from 'react-i18next'

import { Alert, Badge, ChunkyButton, Panel } from '../../components/ui'
import { translateApiErrorCode } from '../../i18n/translate-api-error'

export interface AiPromptsErrorViewProps {
  readonly errorCode: string
  readonly canRetry: boolean
  readonly onRetry: () => void
  readonly onBackToSetup: () => void
  readonly onBackToHome: () => void
}

/**
 * Pantalla de error para la fase de carga AI. Mapea el `errorCode` por i18n
 * (`errors.*`) y permite reintentar o volver al setup.
 */
export function AiPromptsErrorView(props: AiPromptsErrorViewProps) {
  const { errorCode, canRetry, onRetry, onBackToSetup, onBackToHome } = props
  const { t } = useTranslation('game')
  const { t: tErr } = useTranslation('errors')

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-5 px-6 py-12">
        <Badge tone="warning">{t('ai.errorBadge')}</Badge>
        <h1 className="font-display text-3xl uppercase tracking-tight text-wood-dark md:text-4xl">
          {t('ai.errorTitle')}
        </h1>
        <Panel tone="paper" padding="lg" className="grid gap-3">
          <Alert tone="error" data-testid="ai-prompts-error-message">
            {translateApiErrorCode(tErr, errorCode)}
          </Alert>
        </Panel>
        <div className="flex flex-wrap gap-3">
          {canRetry ? (
            <ChunkyButton type="button" tone="primary" onClick={onRetry}>
              {t('ai.retry')}
            </ChunkyButton>
          ) : null}
          <ChunkyButton type="button" tone="secondary" onClick={onBackToSetup}>
            {t('ai.backToSetup')}
          </ChunkyButton>
          <ChunkyButton type="button" tone="secondary" onClick={onBackToHome}>
            {t('ai.backToHome')}
          </ChunkyButton>
        </div>
      </section>
    </main>
  )
}
