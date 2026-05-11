import { getActivePlayerIdForRound, sortPlayersByTurnOrder } from '../services/turn-engine'
import type { GameSession } from '../types'
import { Panel, PlayerCard } from './ui'

export interface GamePlayersHudProps {
  readonly session: GameSession
  /** Si true, la ronda ya tiene respuesta: no se resalta “en turno” hasta avanzar. */
  readonly roundAnswered: boolean
}

/**
 * HUD local: hasta 6 jugadores, métricas visibles; turno activo resaltado (F4.2–F4.3).
 *
 * - Lista compacta apilada en mobile (debajo del breakpoint md).
 * - Grilla 2-3 columnas en desktop.
 */
export function GamePlayersHud({ session, roundAnswered }: GamePlayersHudProps) {
  const ordered = sortPlayersByTurnOrder(session.players)
  const activeId = roundAnswered ? undefined : getActivePlayerIdForRound(session)
  const activePlayerName = activeId
    ? ordered.find((player) => player.id === activeId)?.name
    : undefined

  return (
    <Panel
      tone="wood"
      padding="sm"
      aria-label="Jugadores y puntajes"
      data-testid="game-players-hud"
      className="text-bone"
    >
      <p className="mb-2 font-display text-xs uppercase tracking-wide text-bone/80">
        Jugadores
      </p>
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        data-testid="hud-active-player-announcement"
      >
        {activePlayerName
          ? `Turno actual: ${activePlayerName}.`
          : 'Ronda respondida. Esperando avance a la siguiente pregunta.'}
      </p>

      {/* MAP-UX-03: lista compacta siempre visible debajo de md (sin acordeón). */}
      <div
        className="mb-3 max-h-[min(42vh,15rem)] divide-y-2 divide-bone/15 overflow-y-auto rounded-card border-2 border-wood-dark/40 bg-paper-mute/95 md:hidden"
        role="list"
        aria-label={`Lista de ${ordered.length} jugador${ordered.length === 1 ? '' : 'es'}`}
      >
        {ordered.map((player, index) => {
          const isTurn = activeId === player.id
          return (
            <PlayerCard
              key={`mobile-${player.id}`}
              role="listitem"
              data-testid={`player-hud-mobile-${player.id}`}
              density="compact"
              playerIndex={index}
              playerName={player.name}
              score={player.score}
              correctAnswers={player.correctAnswers}
              wrongAnswers={player.wrongAnswers}
              isActive={isTurn}
            />
          )
        })}
      </div>

      <div className="hidden gap-3 pb-1 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
        {ordered.map((player, index) => {
          const isTurn = activeId === player.id
          return (
            <PlayerCard
              key={player.id}
              data-testid={`player-hud-${player.id}`}
              density="card"
              playerIndex={index}
              playerName={player.name}
              score={player.score}
              correctAnswers={player.correctAnswers}
              wrongAnswers={player.wrongAnswers}
              isActive={isTurn}
            />
          )
        })}
      </div>
    </Panel>
  )
}
