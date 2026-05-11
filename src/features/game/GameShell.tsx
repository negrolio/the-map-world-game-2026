import { GamePlayersHud, WorldMap } from '../../components'
import { Alert, Badge, ChunkyButton, OverlayBand } from '../../components/ui'
import { getActivePlayerForRound } from '../../services'
import type { GameSession, IsoCountryCode } from '../../types'

export interface GameShellProps {
  readonly session: GameSession
  readonly guessSubmitError: string | null
  readonly antiCheatNotice: string | null
  readonly onCountryClick: (iso2: IsoCountryCode | null) => void
  readonly onAdvanceRound: () => void
  readonly onExitToSetup: () => void
  readonly onExitToHome: () => void
}

/**
 * F2.1 + F2.2 + F2.3 + F2.4 + F2.7 — Shell de partida a pantalla completa con
 * mapa edge-to-edge y overlay armónico en dos bandas (top + bottom).
 */
export function GameShell({
  session,
  guessSubmitError,
  antiCheatNotice,
  onCountryClick,
  onAdvanceRound,
  onExitToSetup,
  onExitToHome,
}: GameShellProps) {
  const activeRound = session.rounds[session.activeRoundIndex]
  const turnPlayer = getActivePlayerForRound(session)
  const roundGuess = activeRound?.guess
  const mapFeedback =
    roundGuess && activeRound
      ? {
          selectedIso2: roundGuess.selectedCountryCode,
          targetIso2: activeRound.targetCountryCode,
          isCorrect: roundGuess.isCorrect,
        }
      : null
  const isLastRound = session.activeRoundIndex >= session.rounds.length - 1

  return (
    <main
      data-testid="game-shell"
      className="relative h-screen w-screen overflow-hidden bg-paper text-bone"
      style={{ height: '100dvh' }}
    >
      <h1 className="sr-only">Mapa mundial — 110m</h1>

      {/* F2.3 + F2.4 + F2.7 — Banda superior: navegación + ronda. Primer foco con Tab. */}
      <OverlayBand position="top" data-testid="game-overlay-top">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">Partida (mapa)</Badge>
            {activeRound ? (
              <Badge tone="paper" data-testid="round-counter">
                Ronda {activeRound.roundNumber} / {session.rounds.length}
              </Badge>
            ) : null}
          </div>
          <nav
            aria-label="Navegación de partida"
            className="flex items-center gap-2"
            data-testid="game-overlay-nav"
          >
            <ChunkyButton
              type="button"
              tone="secondary"
              size="sm"
              onClick={onExitToSetup}
              aria-label="Volver al setup"
            >
              Setup
            </ChunkyButton>
            <ChunkyButton
              type="button"
              tone="secondary"
              size="sm"
              onClick={onExitToHome}
              aria-label="Ir al home"
            >
              Home
            </ChunkyButton>
          </nav>
        </div>
        {activeRound ? (
          <p
            className="font-display text-lg uppercase tracking-tight text-bone md:text-2xl"
            data-testid="round-prompt"
            data-target-iso2={activeRound.targetCountryCode}
          >
            {session.config.questionMode === 'country'
              ? '¿Dónde está '
              : '¿Dónde queda la capital '}
            <span className="text-warning">{activeRound.prompt}</span>?
          </p>
        ) : null}
        {turnPlayer && !roundGuess ? (
          <p className="font-body text-sm text-bone/90" data-testid="active-turn-player">
            Turno de{' '}
            <span className="font-display uppercase tracking-wide text-warning">
              {turnPlayer.name}
            </span>{' '}
            — respondé tocando el mapa.
          </p>
        ) : null}
        {roundGuess ? (
          <p
            data-testid="guess-feedback"
            role="status"
            aria-live="polite"
            className={
              roundGuess.isCorrect
                ? 'font-body text-sm font-semibold text-success'
                : 'font-body text-sm font-semibold text-action'
            }
          >
            {roundGuess.isCorrect
              ? 'Correcto.'
              : `Incorrecto. El objetivo era el país con ISO2 ${activeRound?.targetCountryCode}.`}
            {' · Respuesta de '}
            <span className="text-bone">
              {session.players.find((player) => player.id === roundGuess.playerId)?.name ??
                roundGuess.playerId}
            </span>
          </p>
        ) : null}
        {guessSubmitError ? (
          <Alert tone="error" className="bg-action/30 text-bone">
            {guessSubmitError}
          </Alert>
        ) : null}
        {antiCheatNotice ? (
          <Alert tone="warning" className="bg-warning/30 text-bone">
            {antiCheatNotice}
          </Alert>
        ) : null}
      </OverlayBand>

      {/* Mapa base — entre top y bottom en orden DOM, foco intermedio con Tab. */}
      <div className="absolute inset-0 z-0">
        <WorldMap
          key={session.id}
          fullBleed
          regionFilter={session.config.regionFilter}
          mapFeedback={mapFeedback}
          onCountryClick={onCountryClick}
        />
      </div>

      {/* F2.3 + F2.4 + F2.7 — Banda inferior: HUD + acción primaria. Último foco con Tab. */}
      <OverlayBand position="bottom" data-testid="game-overlay-bottom">
        <GamePlayersHud session={session} roundAnswered={Boolean(roundGuess)} />
        {roundGuess ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <ChunkyButton
              type="button"
              tone="primary"
              size="lg"
              data-testid="advance-round-button"
              onClick={onAdvanceRound}
            >
              {isLastRound ? 'Ver resultado final' : 'Siguiente pregunta'}
            </ChunkyButton>
          </div>
        ) : null}
      </OverlayBand>
    </main>
  )
}
