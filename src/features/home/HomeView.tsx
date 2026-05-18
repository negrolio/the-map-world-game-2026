import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge, ChunkyButton, FieldSelect, Panel } from '../../components/ui'
import type { AppLocale } from '../../i18n/app-locale'
import { SUPPORTED_LOCALES, normalizeAppLocale } from '../../i18n/app-locale'
import type { FeatureShell } from '../../types'

export interface HomeViewProps {
  readonly shellModules: readonly FeatureShell[]
  readonly datasetVersion: string
  readonly onStartSetup: () => void
  readonly onStartLearn: () => void
}

/**
 * Portada del juego. Comunica el nombre, una promesa breve y el CTA primario.
 * El listado de módulos queda como nota técnica secundaria en el pie.
 */
export function HomeView({
  shellModules,
  datasetVersion,
  onStartSetup,
  onStartLearn,
}: HomeViewProps) {
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
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <Badge tone="warning">{t('badge')}</Badge>
        <h1 className="font-display text-4xl uppercase tracking-tight text-wood-dark md:text-6xl">
          {tCommon('appTitle')}
        </h1>
        <p className="max-w-2xl font-body text-base text-ink-soft md:text-lg">{t('lead')}</p>

        <Panel tone="paper-soft" padding="md" className="w-full max-w-md text-left">
          <FieldSelect
            id="app-locale"
            label={tSetup('languageLabel')}
            value={activeLocale}
            onChange={(event) => {
              void i18n.changeLanguage(event.target.value as AppLocale)
            }}
            options={languageOptions}
          />
        </Panel>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <ChunkyButton type="button" tone="primary" size="lg" onClick={onStartLearn}>
            {t('startLearn')}
          </ChunkyButton>
          <ChunkyButton type="button" tone="secondary" size="lg" onClick={onStartSetup}>
            {t('startSetup')}
          </ChunkyButton>
          <ChunkyButton type="button" tone="secondary" size="lg">
            {t('viewTechnical')}
          </ChunkyButton>
        </div>

        <Panel
          tone="paper-soft"
          padding="sm"
          className="mt-6 w-full max-w-3xl text-left"
        >
          <p className="font-display text-xs uppercase tracking-wide text-ink-soft">
            {tCommon('technicalStatus')}
          </p>
          <p className="mt-1 font-body text-xs text-ink-soft">
            {tCommon('datasetVersionLabel')}:{' '}
            <span className="font-semibold text-wood-dark">{datasetVersion}</span>
          </p>
          <ul className="mt-2 flex flex-wrap items-center justify-start gap-2">
            {shellModules.map((shellModule) => (
              <li
                key={shellModule.id}
                className="rounded-control border-2 border-wood-dark/50 bg-paper px-2.5 py-0.5 font-body text-xs text-ink"
              >
                {shellModule.id}:{' '}
                <span className="font-semibold text-success-dark">
                  {shellModule.status}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  )
}
