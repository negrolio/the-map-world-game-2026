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
      {/* MAP-UX-03: lista compacta siempre visible por debajo del breakpoint md (sin acordeon). Scroll local solo si hace falta. */}
      <div
        className="mb-3 max-h-[min(42vh,15rem)] overflow-y-auto rounded-md border border-slate-700 bg-slate-950/40 md:hidden"
        role="list"
        aria-label={`Lista de ${ordered.length} jugador${ordered.length === 1 ? '' : 'es'}`}
      >
        <div className="divide-y divide-slate-700/80 px-2 py-1">
          {ordered.map((player, index) => {
            const isTurn = activeId === player.id
            return (
              <div
                key={`mobile-${player.id}`}
                role="listitem"
                data-testid={`player-hud-mobile-${player.id}`}
                aria-current={isTurn ? 'true' : undefined}
                className={[
                  'flex min-h-[2.75rem] items-center gap-2 py-1.5 transition-colors',
                  isTurn ? 'bg-cyan-400/10 ring-1 ring-inset ring-cyan-400/40' : '',
                ].join(' ')}
              >
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100" title={player.name}>
                  <span className="text-slate-500">{index + 1}.</span> {player.name}
                </p>
                {isTurn ? (
                  <span className="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-cyan-200">
                    Turno
                  </span>
                ) : (
                  <span className="w-12 shrink-0" aria-hidden />
                )}
                <p className="shrink-0 whitespace-nowrap font-mono text-[11px] leading-tight text-slate-400 sm:text-xs">
                  <span className="text-cyan-200">{player.score}</span>
                  <span className="text-slate-500">pts</span>
                  <span className="text-slate-500">·</span>✓{player.correctAnswers}
                  <span className="text-slate-500">·</span>✗{player.wrongAnswers}
                </p>
              </div>
            )
          })}
        </div>
      </div>
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
