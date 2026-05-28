import { useTranslation } from 'react-i18next'

import { WritingHandLoader } from '../../components/illustrations/WritingHandLoader'
import { Badge, ChunkyButton } from '../../components/ui'

export interface AiPromptsLoadingViewProps {
  /**
   * Se mantiene la prop por compatibilidad con `App.tsx` y por si una iteración
   * futura reactiva un copy con count. El componente actual no lo renderiza.
   */
  readonly requestedItems: number
  readonly onCancel: () => void
}

/**
 * Pantalla intermedia mientras se generan los riddles del backend AI. Es
 * informativa pura: sin progress real (el endpoint v1 devuelve todo junto).
 * Se mantiene componible para que L9 conecte streaming sin tocar `App.tsx`.
 *
 * Layout compacto: solo badge, título, loader y botón de cancelar. Los textos
 * secundarios ("pedimos N adivinanzas" + hint) se removieron tras feedback UX
 * de smoke (el loader animado ya comunica el estado de espera).
 */
export function AiPromptsLoadingView(props: AiPromptsLoadingViewProps) {
  const { onCancel } = props
  const { t } = useTranslation('game')

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <Badge tone="success">{t('ai.loadingBadge')}</Badge>
        <h1 className="font-display text-2xl uppercase tracking-tight text-wood-dark md:text-3xl">
          {t('ai.loadingTitle')}
        </h1>
        <WritingHandLoader className="mx-auto" />
        <div>
          <ChunkyButton type="button" tone="secondary" onClick={onCancel}>
            {t('ai.cancel')}
          </ChunkyButton>
        </div>
      </section>
    </main>
  )
}
