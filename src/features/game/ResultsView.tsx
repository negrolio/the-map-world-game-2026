import { Alert, Badge, ChunkyButton, Panel } from '../../components/ui'
import { datasetVersion } from '../../data'
import { answerAccuracyPercent, buildGameResult } from '../../services'
import type { GameSession } from '../../types'

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
  const outcome = session.result ?? buildGameResult(session.players, session.rounds.length)
  const winnerPlayer = outcome.winnerPlayerId
    ? outcome.leaderboard.find((player) => player.id === outcome.winnerPlayerId)
    : undefined

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2">
          <Badge tone="warning">Resultados</Badge>
          <h1 className="font-display text-3xl uppercase tracking-tight text-wood-dark md:text-4xl">
            Partida terminada
          </h1>
          <p className="font-body text-sm text-ink-soft" data-testid="game-finished-status">
            Estado:{' '}
            {session.status === 'aborted' ? 'abortada por anti-cheat' : 'finalizada por rondas'}.
            {' '}
            {outcome.totalRounds}{' '}
            {outcome.totalRounds === 1 ? 'ronda jugada' : 'rondas jugadas'}. Puntaje: +10 por
            acierto, −5 por error. Dataset version: {datasetVersion}.
          </p>
          <p className="font-body text-sm text-ink-soft" data-testid="anti-cheat-incidents">
            Incidentes anti-cheat registrados: {session.incidentCount}
          </p>
          {antiCheatNotice ? (
            <Alert tone="warning">{antiCheatNotice}</Alert>
          ) : null}
          {winnerPlayer ? (
            <Alert tone="info" data-testid="game-winner">
              Mejor puntaje según la tabla: <strong>{winnerPlayer.name}</strong> (
              {winnerPlayer.score} pts,{' '}
              {answerAccuracyPercent(winnerPlayer.correctAnswers, winnerPlayer.wrongAnswers)}%
              aciertos sobre respuestas dadas).
            </Alert>
          ) : null}
        </header>
        <Panel tone="paper" padding="md">
          <h2 className="mb-2 font-display text-xs uppercase tracking-wide text-ink-soft">
            Tabla de posiciones
          </h2>
          <ol className="list-decimal space-y-3 pl-6 marker:font-display marker:text-wood-dark">
            {outcome.leaderboard.map((player, rankIndex) => (
              <li
                key={player.id}
                className="border-b-2 border-wood-dark/15 pb-3 pl-1 last:border-b-0 last:pb-0"
                data-testid={`finished-rank-${rankIndex + 1}-${player.id}`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <span className="font-display text-base uppercase tracking-wide text-wood-dark">
                    {player.name}
                  </span>
                  <span className="font-body text-sm text-ink-soft">
                    <span className="font-bold text-wood-dark">{player.score}</span> pts · ✓{' '}
                    {player.correctAnswers} · ✗ {player.wrongAnswers} ·{' '}
                    <span className="text-wood">
                      {answerAccuracyPercent(player.correctAnswers, player.wrongAnswers)}% precisión
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
        <div className="flex flex-wrap gap-3">
          <ChunkyButton
            type="button"
            tone="primary"
            size="lg"
            data-testid="replay-same-config-button"
            onClick={onReplaySameConfig}
          >
            Rejugar misma configuración
          </ChunkyButton>
          <ChunkyButton type="button" tone="success" onClick={onGoToSetup}>
            Nueva partida (setup)
          </ChunkyButton>
          <ChunkyButton type="button" tone="secondary" onClick={onGoToHome}>
            Ir al home
          </ChunkyButton>
        </div>
      </section>
    </main>
  )
}
