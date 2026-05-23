import { useTranslation } from 'react-i18next'

import { Badge } from '../../components/ui'
import { MAX_AI_ATTEMPTS } from '../../services'

export interface AiAttemptsBannerProps {
  readonly attemptsUsed: number
  readonly className?: string
}

/**
 * Indicador "Intento N de 3" para la HUD de partida en modo AI. Refleja el
 * próximo intento (attemptsUsed + 1) acotado a MAX_AI_ATTEMPTS.
 */
export function AiAttemptsBanner(props: AiAttemptsBannerProps) {
  const { attemptsUsed, className } = props
  const { t } = useTranslation('game')
  const current = Math.min(attemptsUsed + 1, MAX_AI_ATTEMPTS)
  return (
    <Badge tone="paper" data-testid="ai-attempts-banner" className={className}>
      {t('ai.attemptsLabel', { current, total: MAX_AI_ATTEMPTS })}
    </Badge>
  )
}
