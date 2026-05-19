import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import homeCardGameUrl from '../../assets/home-card-game.png'
import homeCardLearnUrl from '../../assets/home-card-learn.png'
import { Badge, FieldSelect } from '../../components/ui'
import type { AppLocale } from '../../i18n/app-locale'
import { SUPPORTED_LOCALES, normalizeAppLocale } from '../../i18n/app-locale'
import { HomeModeCard } from './HomeModeCard'

export interface HomeViewProps {
  readonly onStartSetup: () => void
  readonly onStartLearn: () => void
}

/**
 * Portada del juego: dos cards de modo (partida y aprendizaje) e idioma en cabecera.
 */
export function HomeView({ onStartSetup, onStartLearn }: HomeViewProps) {
  const { t, i18n } = useTranslation('home')
  const { t: tCommon } = useTranslation('common')
  const { t: tSetup } = useTranslation('setup')

  const activeLocale = normalizeAppLocale(i18n.language) ?? 'es'

  const languageOptions = useMemo(
    () =>
      SUPPORTED_LOCALES.map((locale) => ({
        value: locale,
        label: locale === 'es' ? tSetup('languageOptionEs') : tSetup('languageOptionEn'),
      })),
    [tSetup],
  )

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-8 md:py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
            <Badge tone="warning">{t('badge')}</Badge>
            <h1 className="font-display text-4xl uppercase tracking-tight text-wood-dark md:text-5xl">
              {tCommon('appTitle')}
            </h1>
          </div>
          <div className="w-full shrink-0 sm:w-auto sm:min-w-[10rem]">
            <FieldSelect
              id="app-locale"
              label={tSetup('languageLabel')}
              value={activeLocale}
              onChange={(event) => {
                void i18n.changeLanguage(event.target.value as AppLocale)
              }}
              options={languageOptions}
              className="text-left"
            />
          </div>
        </header>

        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <HomeModeCard
            variant="primary"
            testId="home-card-game"
            title={t('gameCard.title')}
            description={t('gameCard.description')}
            imageUrl={homeCardGameUrl}
            aria-label={t('gameCard.ariaLabel')}
            onActivate={onStartSetup}
          />
          <HomeModeCard
            variant="secondary"
            testId="home-card-learn"
            title={t('learnCard.title')}
            description={t('learnCard.description')}
            imageUrl={homeCardLearnUrl}
            aria-label={t('learnCard.ariaLabel')}
            onActivate={onStartLearn}
          />
        </div>
      </div>
    </main>
  )
}
