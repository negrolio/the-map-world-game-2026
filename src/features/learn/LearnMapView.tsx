import { useTranslation } from 'react-i18next'

import { WorldMap } from '../../components/WorldMap'
import { Badge, ChunkyButton } from '../../components/ui'
import type { IsoCountryCode } from '../../types'
import { CountryLearnModal } from './CountryLearnModal'
import { useCountryLearn } from './use-country-learn'

export interface LearnMapViewProps {
  readonly onExitToHome: () => void
  readonly onExitToSetup: () => void
}

export function LearnMapView({ onExitToHome, onExitToSetup }: LearnMapViewProps) {
  const { t } = useTranslation('learn')
  const { t: tGame } = useTranslation('game')
  const { modalState, isModalOpen, requestedLocale, openCountry, closeModal, retry } =
    useCountryLearn()

  const handleCountryClick = (iso2: IsoCountryCode | null) => {
    if (isModalOpen || iso2 === null) {
      return
    }
    void openCountry(iso2)
  }

  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-paper text-ink"
      data-testid="learn-map-view"
    >
      <div className="absolute inset-0 z-0">
        <WorldMap
          fullBleed
          regionFilter="world"
          mapInteractionLocked={isModalOpen}
          onCountryClick={handleCountryClick}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-2 p-3"
        data-testid="learn-overlay-top"
      >
        <Badge tone="warning" className="pointer-events-auto">
          {t('badge')}
        </Badge>
        <nav
          className="pointer-events-auto flex flex-wrap gap-2"
          aria-label={tGame('navAria')}
        >
          <ChunkyButton type="button" tone="secondary" size="sm" onClick={onExitToHome}>
            {tGame('homeButton')}
          </ChunkyButton>
          <ChunkyButton type="button" tone="secondary" size="sm" onClick={onExitToSetup}>
            {tGame('setupButton')}
          </ChunkyButton>
        </nav>
      </div>

      {modalState ? (
        <CountryLearnModal
          state={modalState}
          requestedLocale={requestedLocale}
          onClose={closeModal}
          onRetry={retry}
        />
      ) : null}
    </main>
  )
}
