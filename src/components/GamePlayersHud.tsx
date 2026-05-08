import { getActivePlayerIdForRound, sortPlayersByTurnOrder } from '../services/turn-engine'
import type { GameSession } from '../types'

export interface GamePlayersHudProps {
  readonly session: GameSession
  /** Si true, la ronda ya tiene respuesta: no se resalta “en turno” hasta avanzar. */
  readonly roundAnswered: boolean
}

/**
 * HUD local: hasta 6 jugadores, métricas visibles; turno activo resaltado (F4.2–F4.3).
 */
export function GamePlayersHud({ session, roundAnswered }: GamePlayersHudProps) {
  const ordered = sortPlayersByTurnOrder(session.players)
  const activeId = roundAnswered ? undefined : getActivePlayerIdForRound(session)
  const activePlayerName = activeId
    ? ordered.find((player) => player.id === activeId)?.name
    : undefined

  return (
    <section
      aria-label="Jugadores y puntajes"
      className="rounded-xl border border-slate-800 bg-slate-900/50 p-3"
      data-testid="game-players-hud"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Jugadores</p>
      <p className="sr-only" role="status" aria-live="polite" data-testid="hud-active-player-announcement">
        {activePlayerName
          ? `Turno actual: ${activePlayerName}.`
          : 'Ronda respondida. Esperando avance a la siguiente pregunta.'}
      </p>
      <details className="mb-3 rounded-md border border-slate-700 bg-slate-950/40 md:hidden">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-200">
          Ver jugadores ({ordered.length})
        </summary>
        <div className="grid gap-2 border-t border-slate-700 px-3 py-2">
          {ordered.map((player, index) => {
            const isTurn = activeId === player.id
            return (
              <div
                key={`mobile-${player.id}`}
                data-testid={`player-hud-mobile-${player.id}`}
                className={[
                  'rounded-lg border px-3 py-2 transition-colors',
                  isTurn
                    ? 'border-cyan-400/70 bg-cyan-400/10 ring-2 ring-cyan-400/50'
                    : 'border-slate-700/80 bg-slate-950/40',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-100" title={player.name}>
                    {index + 1}. {player.name}
                  </p>
                  {isTurn ? (
                    <span className="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-cyan-200">
                      Turno
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  <span className="text-cyan-200">{player.score}</span> pts · ✓ {player.correctAnswers} · ✗{' '}
                  {player.wrongAnswers}
                </p>
              </div>
            )
          })}
        </div>
      </details>
      <div className="hidden gap-3 pb-1 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
        {ordered.map((player, index) => {
          const isTurn = activeId === player.id
          return (
            <div
              key={player.id}
              data-testid={`player-hud-${player.id}`}
              aria-current={isTurn ? 'true' : undefined}
              className={[
                'min-w-[148px] shrink-0 snap-start rounded-lg border px-3 py-2 transition-colors md:min-w-0',
                isTurn
                  ? 'border-cyan-400/70 bg-cyan-400/10 ring-2 ring-cyan-400/50'
                  : 'border-slate-700/80 bg-slate-950/40',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-100" title={player.name}>
                  {index + 1}. {player.name}
                </p>
                {isTurn ? (
                  <span className="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-cyan-200">
                    Turno
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs text-slate-400">
                <span className="text-cyan-200">{player.score}</span> pts · ✓ {player.correctAnswers} · ✗{' '}
                {player.wrongAnswers}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
