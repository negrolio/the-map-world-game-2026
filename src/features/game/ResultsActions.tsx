import { useTranslation } from 'react-i18next'

import { ChunkyButton } from '../../components/ui'

export interface ResultsActionsProps {
  readonly onReplaySameConfig: () => void
  readonly onGoToSetup: () => void
  readonly onGoToHome: () => void
}

export function ResultsActions({
  onReplaySameConfig,
  onGoToSetup,
  onGoToHome,
}: ResultsActionsProps) {
  const { t } = useTranslation('results')

  return (
    <div className="flex flex-wrap gap-3 border-t-2 border-wood-dark/15 pt-4">
      <ChunkyButton
        type="button"
        tone="primary"
        size="lg"
        data-testid="replay-same-config-button"
        onClick={onReplaySameConfig}
      >
        {t('replay')}
      </ChunkyButton>
      <ChunkyButton type="button" tone="success" size="lg" onClick={onGoToSetup}>
        {t('newGameSetup')}
      </ChunkyButton>
      <ChunkyButton type="button" tone="secondary" size="lg" onClick={onGoToHome}>
        {t('goHome')}
      </ChunkyButton>
    </div>
  )
}
