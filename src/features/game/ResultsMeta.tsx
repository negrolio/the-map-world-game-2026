import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, Badge, Panel } from '../../components/ui'
import type { GameStatus } from '../../types'

export interface ResultsMetaProps {
  readonly status: GameStatus
  readonly totalRounds: number
  readonly incidentCount: number
  readonly datasetVersion: string
  readonly antiCheatNotice: string | null
}

export function ResultsMeta({
  status,
  totalRounds,
  incidentCount,
  datasetVersion,
  antiCheatNotice,
}: ResultsMetaProps) {
  const { t } = useTranslation('results')
  const { t: tCommon } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  const isAborted = status === 'aborted'
  const statusText = isAborted ? t('statusAborted') : t('statusFinished')
  const roundsLabel = totalRounds === 1 ? t('roundsOne') : t('roundsMany')

  return (
    <div className="flex flex-col gap-3">
      {antiCheatNotice ? (
        <Alert tone="warning">{antiCheatNotice}</Alert>
      ) : null}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          data-testid="toggle-results-meta"
          className="inline-flex w-fit items-center gap-1.5 rounded-control border-2 border-wood-dark/40 bg-paper px-2.5 py-1 font-display text-xs uppercase tracking-wide text-ink-soft transition hover:border-wood-dark hover:text-wood-dark"
        >
          <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
          {isOpen ? t('metaToggleHide') : t('metaToggleShow')}
        </button>
        <Panel id={panelId} tone="paper-soft" padding="sm" hidden={!isOpen}>
          <div className="flex flex-wrap gap-2">
            <Badge
              tone={isAborted ? 'warning' : 'wood'}
              data-testid="game-finished-status"
            >
              {t('statusLabel')} {statusText}
            </Badge>
            <Badge tone="paper">
              {t('metaRoundsChip', { count: totalRounds, rounds: roundsLabel })}
            </Badge>
            <Badge
              tone={incidentCount > 0 ? 'warning' : 'paper'}
              data-testid="anti-cheat-incidents"
            >
              {incidentCount > 0
                ? t('metaIncidentsChip', { count: incidentCount })
                : t('metaIncidentsChipZero')}
              <span className="sr-only">
                {t('incidentsLabel')} {incidentCount}
              </span>
            </Badge>
          </div>
          <p className="mt-3 font-body text-xs text-ink-soft">
            {t('metaScoringFootnote')}
          </p>
          <p className="mt-1 font-body text-xs text-ink-soft">
            {t('metaDatasetCaption', { version: datasetVersion })}
            <span className="sr-only">
              {tCommon('datasetVersionLabel')}: {datasetVersion}
            </span>
          </p>
        </Panel>
      </div>
    </div>
  )
}
