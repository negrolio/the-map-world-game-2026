import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { GamePlayersHud, WorldMap } from '../../components'
import { Alert, Badge, ChunkyButton, OverlayBand } from '../../components/ui'
import { getActivePlayerForRound } from '../../services'
import type { GameSession, IsoCountryCode } from '../../types'

const DESKTOP_FINE_POINTER_MQ = '(hover: hover) and (pointer: fine)'

function shouldIgnoreGlobalAdvanceHotkey(activeElement: Element | null): boolean {
  if (!(activeElement instanceof HTMLElement)) {
    return false
  }
  if (activeElement.closest('[data-testid="advance-round-button"]')) {
    return true
  }
  const tag = activeElement.tagName
  return (
    tag === 'BUTTON' ||
    tag === 'A' ||
    tag === 'INPUT' ||
    tag === 'SELECT' ||
    tag === 'TEXTAREA' ||
    activeElement.isContentEditable
  )
}

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
  const { t } = useTranslation('game')
  const [desktopFinePointer, setDesktopFinePointer] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia(DESKTOP_FINE_POINTER_MQ).matches
  })

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia(DESKTOP_FINE_POINTER_MQ)
    const apply = (): void => {
      setDesktopFinePointer(mql.matches)
    }
    apply()
    mql.addEventListener('change', apply)
    return () => {
      mql.removeEventListener('change', apply)
    }
  }, [])

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

  useEffect(() => {
    if (!roundGuess || !desktopFinePointer) {
      return
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }
      if (shouldIgnoreGlobalAdvanceHotkey(document.activeElement)) {
        return
      }
      event.preventDefault()
      onAdvanceRound()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [roundGuess, desktopFinePointer, onAdvanceRound])

  return (
    <main
      data-testid="game-shell"
      className="relative h-screen w-screen overflow-hidden bg-paper text-bone"
      style={{ height: '100dvh' }}
    >
      <h1 className="sr-only">{t('srTitle')}</h1>

      {/* F2.3 + F2.4 + F2.7 — Banda superior: navegación + ronda. Primer foco con Tab. */}
      <OverlayBand position="top" data-testid="game-overlay-top">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{t('badge')}</Badge>
            {activeRound ? (
              <Badge tone="paper" data-testid="round-counter">
                {t('roundCounter', {
                  current: activeRound.roundNumber,
                  total: session.rounds.length,
                })}
              </Badge>
            ) : null}
          </div>
          <nav
            aria-label={t('navAria')}
            className="flex items-center gap-2"
            data-testid="game-overlay-nav"
          >
            <ChunkyButton
              type="button"
              tone="secondary"
              size="sm"
              onClick={onExitToSetup}
              aria-label={t('setupAria')}
            >
              {t('setupButton')}
            </ChunkyButton>
            <ChunkyButton
              type="button"
              tone="secondary"
              size="sm"
              onClick={onExitToHome}
              aria-label={t('homeAria')}
            >
              {t('homeButton')}
            </ChunkyButton>
          </nav>
        </div>
        {activeRound ? (
          <p
            className="font-display text-lg uppercase tracking-tight text-bone md:text-2xl"
            data-testid="round-prompt"
            data-target-iso2={activeRound.targetCountryCode}
          >
            {session.config.questionMode === 'country' ? t('promptCountry') : t('promptCapital')}
            <span className="text-warning">{activeRound.prompt}</span>
            {t('promptSuffix')}
          </p>
        ) : null}
        {turnPlayer && !roundGuess ? (
          <p className="font-body text-sm text-bone/90" data-testid="active-turn-player">
            {t('turnLine', { name: turnPlayer.name })}
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
              ? t('feedbackCorrect')
              : t('feedbackWrong', { iso2: activeRound?.targetCountryCode ?? '' })}
            {t('feedbackAnswerBy')}
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

      {/* F2.3 + F2.4 + F2.7 — Banda inferior: acción primaria encima del HUD de jugadores. */}
      <OverlayBand position="bottom" data-testid="game-overlay-bottom">
        {roundGuess ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <ChunkyButton
              type="button"
              tone="primary"
              size="lg"
              data-testid="advance-round-button"
              onClick={onAdvanceRound}
              className="whitespace-normal text-center"
              aria-keyshortcuts={desktopFinePointer ? 'Enter Space' : undefined}
            >
              <span className="flex flex-col items-center gap-0.5 leading-tight">
                <span>{isLastRound ? t('advanceFinal') : t('advanceNext')}</span>
                {desktopFinePointer ? (
                  <span
                    className="max-w-[14rem] font-body text-[0.65rem] font-normal normal-case tracking-normal text-bone/85"
                    data-testid="advance-round-kbd-hint"
                  >
                    {t('kbdHint')}
                  </span>
                ) : null}
              </span>
            </ChunkyButton>
          </div>
        ) : null}
        <GamePlayersHud session={session} roundAnswered={Boolean(roundGuess)} />
      </OverlayBand>
    </main>
  )
}
