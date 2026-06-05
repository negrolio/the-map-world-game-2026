import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { MapAnswerFeedback } from '../../components'
import { GamePlayersHud, WorldMap } from '../../components'
import { Alert, Badge, ChunkyButton, OverlayBand } from '../../components/ui'
import { normalizeAppLocale, type AppLocale } from '../../i18n/app-locale'
import { MAX_AI_ATTEMPTS, getActivePlayerForRound } from '../../services'
import type { GameSession, IsoCountryCode } from '../../types'
import { AiAttemptsBanner } from './AiAttemptsBanner'
import { AiSourceLink } from './AiSourceLink'
import { resolveCountryNameByIso2 } from './resolve-country-name-by-iso2'

const DESKTOP_FINE_POINTER_MQ = '(hover: hover) and (pointer: fine)'

/**
 * Convierte una cadena con marcas `**foo**` en una secuencia de nodos React
 * donde los segmentos marcados se renderizan con `<strong>`. Mantenemos las
 * marcas literales en `src/i18n/resources/{es,en}.ts` para preservar el copy
 * del PRD UX feedback modo AI (§2) sin acoplarse a una dependencia markdown.
 */
function renderEmphasizedText(text: string): ReactNode {
  const segments = text.split(/\*\*(.+?)\*\*/g)
  return segments.map((segment, index) =>
    index % 2 === 0 ? (
      <Fragment key={`txt-${index}`}>{segment}</Fragment>
    ) : (
      <strong key={`em-${index}`}>{segment}</strong>
    ),
  )
}

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
  const { t, i18n } = useTranslation('game')
  const locale: AppLocale = normalizeAppLocale(i18n.language) ?? 'es'
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
  const isAiMode = session.config.questionMode === 'ai'
  const aiAttemptsUsed = activeRound?.attempts?.length ?? 0
  const lastAiAttempt = activeRound?.attempts?.[activeRound.attempts.length - 1]
  const aiInProgress = isAiMode && !roundGuess && aiAttemptsUsed > 0
  const targetCountryName = activeRound
    ? resolveCountryNameByIso2(activeRound.targetCountryCode, locale)
    : ''
  const feedbackKey = roundGuess
    ? `guess-${session.activeRoundIndex}-${roundGuess.selectedCountryCode}-${String(roundGuess.isCorrect)}`
    : isAiMode && aiInProgress && lastAiAttempt
      ? `attempt-${session.activeRoundIndex}-${aiAttemptsUsed}`
      : null
  // El cartel solo se cierra al presionar la X. Guardamos la última
  // `feedbackKey` descartada (en vez de un booleano) para que al cambiar la
  // key (nuevo intento o nuevo guess) el cartel reaparezca de inmediato sin
  // necesidad de un reset explícito.
  const [dismissedFeedbackKey, setDismissedFeedbackKey] = useState<string | null>(null)
  const showFeedbackMessage = feedbackKey !== null && dismissedFeedbackKey !== feedbackKey
  const dismissFeedback = (): void => {
    if (feedbackKey) {
      setDismissedFeedbackKey(feedbackKey)
    }
  }
  /**
   * F2 (PRD UX feedback modo AI, RF-F20..RF-F24): el `mapFeedback` ahora se
   * popula también durante una ronda AI **abierta** con `attempts.length > 0`
   * para pintar las selecciones erróneas en rojo. En ese caso forzamos
   * `targetIso2 = lastAttempt.selectedCountryCode` (no el target real) para
   * evitar que `geographyStyleForIso` revele el país objetivo con el palette
   * amarillo mientras el jugador aún tiene intentos. Al cerrar la ronda
   * (`roundGuess` presente) se restaura `targetIso2 = activeRound.targetCountryCode`
   * y se suma `wrongSelectionsIso2` con los intentos erróneos previos al
   * cierre (atenuados si `isCorrect === true`, plenos si fallo definitivo).
   * En country/capital `attempts` está ausente y `wrongSelectionsIso2`
   * permanece `undefined` (sin cambios).
   */
  const aiWrongSelectionsIso2: readonly IsoCountryCode[] | undefined =
    isAiMode && activeRound?.attempts && activeRound.attempts.length > 0
      ? activeRound.attempts
          .filter((attempt) => !attempt.isCorrect)
          .map((attempt) => attempt.selectedCountryCode)
      : undefined
  const mapFeedback: MapAnswerFeedback | null = ((): MapAnswerFeedback | null => {
    if (!activeRound) {
      return null
    }
    if (roundGuess) {
      const base: MapAnswerFeedback = {
        selectedIso2: roundGuess.selectedCountryCode,
        targetIso2: activeRound.targetCountryCode,
        isCorrect: roundGuess.isCorrect,
      }
      if (aiWrongSelectionsIso2 && aiWrongSelectionsIso2.length > 0) {
        return { ...base, wrongSelectionsIso2: aiWrongSelectionsIso2 }
      }
      return base
    }
    if (isAiMode && lastAiAttempt && aiWrongSelectionsIso2 && aiWrongSelectionsIso2.length > 0) {
      return {
        selectedIso2: lastAiAttempt.selectedCountryCode,
        targetIso2: lastAiAttempt.selectedCountryCode,
        isCorrect: false,
        wrongSelectionsIso2: aiWrongSelectionsIso2,
      }
    }
    return null
  })()
  const cameraFocus =
    roundGuess && activeRound
      ? {
          iso2: activeRound.targetCountryCode,
          token: `${session.activeRoundIndex}-${roundGuess.selectedCountryCode}-${String(roundGuess.isCorrect)}`,
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
            key={`prompt-${session.activeRoundIndex}`}
            className="mapgame-prompt-reveal font-display text-lg uppercase tracking-tight text-bone md:text-2xl"
            data-testid="round-prompt"
            data-target-iso2={activeRound.targetCountryCode}
          >
            {isAiMode
              ? t('promptAi')
              : session.config.questionMode === 'country'
                ? t('promptCountry')
                : t('promptCapital')}
            <span className="text-warning"> {activeRound.prompt}</span>
            {isAiMode ? null : t('promptSuffix')}
          </p>
        ) : null}
        {isAiMode && activeRound ? (
          <div className="flex flex-wrap items-center gap-2">
            <AiAttemptsBanner attemptsUsed={aiAttemptsUsed} />
          </div>
        ) : null}
        {turnPlayer && !roundGuess ? (
          <p className="font-body text-sm text-bone/90" data-testid="active-turn-player">
            {t('turnLine', { name: turnPlayer.name })}
          </p>
        ) : null}
        {showFeedbackMessage && isAiMode && aiInProgress && lastAiAttempt && !roundGuess ? (
          <div
            key={feedbackKey ?? undefined}
            data-testid="ai-attempt-feedback"
            role="status"
            aria-live="polite"
            className="mapgame-feedback-animate rounded-card border-2 border-wood-dark/80 bg-wood-dark/95 px-4 py-3 shadow-chunky-sm"
          >
            <div className="mapgame-feedback-animate-inner flex items-start gap-3">
            <p className="flex-1 font-display text-lg uppercase tracking-tight text-action md:text-2xl">
              {renderEmphasizedText(
                t('ai.tryAgain', {
                  country: resolveCountryNameByIso2(lastAiAttempt.selectedCountryCode, locale),
                  remaining: MAX_AI_ATTEMPTS - aiAttemptsUsed,
                }),
              )}
            </p>
            <button
              type="button"
              onClick={dismissFeedback}
              aria-label={t('feedbackDismiss')}
              data-testid="ai-attempt-feedback-dismiss"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border-2 border-wood-dark/60 bg-paper/10 font-display text-2xl leading-none text-bone transition hover:bg-paper/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning md:h-12 md:w-12 md:text-3xl"
            >
              <span aria-hidden="true">×</span>
            </button>
            </div>
          </div>
        ) : null}
        {showFeedbackMessage && roundGuess ? (
          <div
            key={feedbackKey ?? undefined}
            data-testid="guess-feedback"
            role="status"
            aria-live="polite"
            className="mapgame-feedback-animate rounded-card border-2 border-wood-dark/80 bg-wood-dark/95 px-4 py-3 shadow-chunky-sm"
          >
            <div className="mapgame-feedback-animate-inner flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <p
                className={
                  roundGuess.isCorrect
                    ? 'flex-1 font-display text-lg uppercase tracking-tight text-success md:text-2xl'
                    : 'flex-1 font-display text-lg uppercase tracking-tight text-action md:text-2xl'
                }
              >
                {roundGuess.isCorrect
                  ? isAiMode
                    ? renderEmphasizedText(t('ai.correct', { country: targetCountryName }))
                    : t('feedbackCorrect')
                  : isAiMode && aiAttemptsUsed >= MAX_AI_ATTEMPTS
                    ? renderEmphasizedText(t('ai.finalWrong', { country: targetCountryName }))
                    : renderEmphasizedText(t('feedbackWrong', { country: targetCountryName }))}
                <span className="font-body text-sm normal-case tracking-normal text-bone/85 md:text-base">
                  {t('feedbackAnswerBy')}
                  <span className="text-bone">
                    {session.players.find((player) => player.id === roundGuess.playerId)?.name ??
                      roundGuess.playerId}
                  </span>
                </span>
              </p>
              <button
                type="button"
                onClick={dismissFeedback}
                aria-label={t('feedbackDismiss')}
                data-testid="guess-feedback-dismiss"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border-2 border-wood-dark/60 bg-paper/10 font-display text-2xl leading-none text-bone transition hover:bg-paper/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning md:h-12 md:w-12 md:text-3xl"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            {isAiMode &&
            (roundGuess.isCorrect || aiAttemptsUsed >= MAX_AI_ATTEMPTS) &&
            activeRound?.aiSource ? (
              <AiSourceLink source={activeRound.aiSource} />
            ) : null}
            </div>
          </div>
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
          answerLocked={Boolean(roundGuess)}
          cameraFocus={cameraFocus}
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
