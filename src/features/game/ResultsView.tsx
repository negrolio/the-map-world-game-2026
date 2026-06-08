import { useTranslation } from 'react-i18next'

import { datasetVersion } from '../../data'
import { normalizeAppLocale, type AppLocale } from '../../i18n/app-locale'
import { buildGameResult } from '../../services'
import type { GameSession } from '../../types'
import { AiRoundsSummary } from './AiRoundsSummary'
import { ResultsActions } from './ResultsActions'
import { ResultsHero } from './ResultsHero'
import { ResultsLeaderboardRest } from './ResultsLeaderboardRest'
import { ResultsMeta } from './ResultsMeta'
import { ResultsPodium } from './ResultsPodium'
import { buildResultsLayout } from './results-podium'

export interface ResultsViewProps {
  readonly session: GameSession
  readonly antiCheatNotice: string | null
  readonly onReplaySameConfig: () => void
  readonly onGoToSetup: () => void
  readonly onGoToHome: () => void
}

export function ResultsView({
  session,
  antiCheatNotice,
  onReplaySameConfig,
  onGoToSetup,
  onGoToHome,
}: ResultsViewProps) {
  const { t, i18n } = useTranslation('results')
  const locale: AppLocale = normalizeAppLocale(i18n.language) ?? 'es'

  const outcome = session.result ?? buildGameResult(session.players, session.rounds.length)
  const layout = buildResultsLayout(outcome.leaderboard)
  const isSoloPlayer = outcome.leaderboard.length === 1

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-3xl uppercase tracking-tight text-wood-dark md:text-4xl">
            {t('title')}
          </h1>
        </header>

        {layout ? (
          <>
            <ResultsHero entry={layout.hero} isSoloPlayer={isSoloPlayer} />
            <ResultsPodium layout={layout} />
            <ResultsLeaderboardRest entries={layout.rest} />
          </>
        ) : null}

        {session.config.questionMode === 'ai' ? (
          <AiRoundsSummary session={session} locale={locale} />
        ) : null}

        <ResultsMeta
          status={session.status}
          totalRounds={outcome.totalRounds}
          incidentCount={session.incidentCount}
          datasetVersion={datasetVersion}
          antiCheatNotice={antiCheatNotice}
        />

        <ResultsActions
          onReplaySameConfig={onReplaySameConfig}
          onGoToSetup={onGoToSetup}
          onGoToHome={onGoToHome}
        />
      </section>
    </main>
  )
}
