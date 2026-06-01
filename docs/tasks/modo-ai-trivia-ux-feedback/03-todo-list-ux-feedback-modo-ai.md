# Todo list — UX feedback modo AI trivia (ejecución)

**Fecha:** 2026-05-27
**Idioma del documento:** español
**Estado:** **cerrado** — Fases 1–7 completadas (2026-05-28); smoke con env real cubierto durante la iteración (cierre formal 2026-05-29).

**Referencias obligadas:**

- Decisión: [`00-decision-ux-feedback-modo-ai.md`](./00-decision-ux-feedback-modo-ai.md)
- PRD: [`01-prd-ux-feedback-modo-ai.md`](./01-prd-ux-feedback-modo-ai.md)
- Plan técnico: [`02-plan-implementacion-ux-feedback-modo-ai.md`](./02-plan-implementacion-ux-feedback-modo-ai.md)
- Reglas: `.cursor/rules/core.mdc`, `.cursor/rules/dependency-security.mdc`, `.cursor/rules/privacy.mdc`, `.cursor/rules/docs-tasks-conventions.mdc`

> Este documento **traduce** el plan técnico a un checklist accionable agrupado por fases. Las decisiones de fondo viven en el ADR y el PRD; aquí solo trackeamos ejecución.

---

## 0. Regla de ejecución entre tareas (obligatoria)

Después de implementar **cada tarea** (cada checkbox de nivel `- [ ]` con encabezado `### Tarea …`), **antes de pasar a la siguiente**, completar el siguiente ritual sobre los cambios introducidos por esa tarea:

1. **Review** — releer todos los archivos modificados/creados, mirar el diff (`git status` + `git diff`), confirmar que no hay cambios fuera de alcance ni archivos accidentales.
2. **Analizar los cambios** — verificar que coinciden con la tarea (RF/RNF del PRD, contrato definido en el plan técnico) y con las reglas del repo (`core.mdc`, `privacy.mdc`, `dependency-security.mdc`). Confirmar que no se introdujeron `any`, default exports, secretos en código, ni lógica de negocio fuera de su capa.
3. **Buscar errores** — pasar `tsc --noEmit` y `npm run lint` sobre los archivos tocados. Revisar a ojo posibles regresiones en imports, tipos, paths y i18n.
4. **Corregir** — arreglar todo lo detectado en los pasos 1–3 antes de avanzar. No se acepta "lo arreglo después".
5. **Testear** — correr los tests Vitest relevantes a esa tarea (los nuevos/modificados como mínimo). Si la tarea toca el flujo end-to-end, correr el `e2e` específico cuando aplique.

Cada tarea repite este ritual como sub-checklist (`- [ ] Review / Analizar / Errores / Corregir / Testear`). **No marcar una tarea completa hasta que sus 5 sub-items estén marcados.**

Excepciones explícitas (no relajan la regla, solo la aterrizan):

- En tareas puramente de **i18n** o **constantes**, "Testear" se cumple con `tsc --noEmit` + tests que consumen las claves pasando.
- En tareas de **docs/cleanup**, "Testear" se cumple con build/lint del repo verde.
- En la tarea de **smoke manual**, los pasos 1–4 se aplican igual a cualquier ajuste menor que surja durante el smoke.

---

## Fase 1 — i18n y mensajes con nombre de país

Mapea a §"Fase 1" del plan técnico. Habilita las claves nuevas que las fases siguientes consumen.

### Tarea 1.1 — Refactor de claves i18n (ES + EN)

- [x] Editar [`src/i18n/resources/es.ts`](../../../src/i18n/resources/es.ts):
  - `game.feedbackWrong` pasa a usar `{{country}}` en lugar de `{{iso2}}` → "Incorrecto. Era **{{country}}**."
  - `game.ai.tryAgain` pasa a aceptar `{{country}}` y `{{remaining}}` → "**Mal!** Ese es **{{country}}**. Te quedan {{remaining}} intento(s)."
  - `game.ai.finalWrong` pasa a usar `{{country}}` → "Se agotaron los intentos. Era **{{country}}**."
  - Nueva clave `game.ai.correct` → "**Bien!** Era **{{country}}**."
  - Nuevas claves en `results.ai.*`: `summaryHeading`, `attemptLabel`, `notSolved`, `scoreDelta`, `sourceLink` (si se necesita reusar).
- [x] Replicar los mismos cambios en [`src/i18n/resources/en.ts`](../../../src/i18n/resources/en.ts) con copy ES/EN del PRD §2.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 1.2 — Helper de nombre localizado por ISO2

- [x] Crear (o agregar como helper local en `GameShell.tsx`) función `resolveCountryNameByIso2(iso2: IsoCountryCode, locale: AppLocale): string` que busque en `src/data/countries.ts` y delegue a `getLocalizedCountryName` (`src/data/country-localization.ts`). Fallback: ISO2 entre llaves (`{AR}`) si no se encuentra. → [`src/features/game/resolve-country-name-by-iso2.ts`](../../../src/features/game/resolve-country-name-by-iso2.ts).
- [x] Documentar en comentario que es **fallback defensivo**, no debería dispararse en flujo normal (todos los ISO2 del juego están en el catálogo).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 1.3 — Consumir `{{country}}` en `GameShell`

- [x] En [`src/features/game/GameShell.tsx`](../../../src/features/game/GameShell.tsx), reemplazar los pasos de `{{ iso2: activeRound?.targetCountryCode }}` (líneas ~213-216) por `{{ country: resolveCountryNameByIso2(targetIso2, locale) }}`.
- [x] Para el cartel intermedio "Mal!" (modo AI con ronda abierta), construir `country` desde la última `attempt.selectedCountryCode` y `remaining = MAX_AI_ATTEMPTS - aiAttemptsUsed`.
- [x] Para el cartel "Bien!" (modo AI con `roundGuess.isCorrect`), usar `country` derivado de `activeRound.targetCountryCode` (consume nueva clave `game.ai.correct`).
- [x] Asegurar que `feedbackWrong` cross-mode (country/capital) también recibe `country` en lugar de `iso2`.

Nota técnica: el copy PRD §2 incluye marcas `**…**` (bold). Mantenemos las marcas en `src/i18n/resources/{es,en}.ts` y agregamos un helper local `renderEmphasizedText` en `GameShell.tsx` que las convierte a `<strong>` sin introducir dependencia markdown.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 1.4 — Actualizar tests existentes que validaban ISO2

- [x] En [`src/features/game/GameShell.test.tsx`](../../../src/features/game/GameShell.test.tsx), el helper `buildSessionWithGuess` usa `targetCountryCode: 'AR'` y `selectedCountryCode: 'UY'`. Los tests que afirmaban texto con ISO2 deben actualizarse a esperar "Uruguay" / "Argentina". → **Auditoría:** los tests existentes cubren behavior (Enter/Space → `onAdvanceRound`), no asertan el texto de `feedbackWrong` / `tryAgain` / `finalWrong`. No requirieron actualización. El helper se conserva tal cual para que Fase 3 (Tarea 3.5) lo extienda con `attempts[]` y asserts del cartel intermedio.
- [x] Auditar [`src/App.test.tsx`](../../../src/App.test.tsx) por cualquier match de regex con `{{iso2}}` y migrar a nombre de país. → **Auditoría:** el único match de "ISO2" es el assert defensivo del bloque debug `Ultimo clic — ISO2` (F2.8, ya eliminado en una iteración previa). Ningún assert valida el copy de feedback con ISO2.
- [x] Confirmar que **ningún** test queda silenciado (regla `core.mdc`). → `rg ".skip\(|\.only\(|xit\(|xdescribe\(|it\.todo\("` sobre `**/*.test.{ts,tsx}` → sin matches.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Ajuste post-revisión UX (2026-05-27)

Tras smoke visual del usuario, se aplican dos refinamientos sobre los cambios entregados por las Tareas 1.1 y 1.3. No reabren la fase; se documentan acá para trazabilidad.

**Copy i18n** — se prefiere "objetivo" / "target" en lugar de "Era" / "answer" para los mensajes que aluden al país objetivo:

| Clave | ES (final) | EN (final) |
|-------|------------|------------|
| `game.feedbackWrong` | `Incorrecto. El objetivo era **{{country}}**.` | `Incorrect. The target was **{{country}}**.` |
| `game.ai.correct` | `**Bien!** El objetivo era **{{country}}**.` | `**Correct!** The target was **{{country}}**.` |
| `game.ai.finalWrong` | `Se agotaron los intentos. El objetivo era **{{country}}**.` | `Out of attempts. The target was **{{country}}**.` |
| `game.ai.tryAgain` | sin cambio (`Ese es` refiere al país clickeado, no al objetivo) | sin cambio (`That's`) |

Este copy difiere del literal del PRD §2 (`Era {{country}}` / `The answer was {{country}}`). Se mantiene el spirit (uso de **nombre** del país en lugar de ISO2, RF-F25..F28) y se actualiza solo el wording. Si más adelante se requiere callout en el PRD inmutable, se aplica al cerrar la iteración.

**Layout** — los carteles `ai-attempt-feedback` y `guess-feedback` viven en la `OverlayBand position="top"` justo debajo del bloque `active-turn-player` (encima de los `Alert` de error/anti-cheat). Adoptan la misma tipografía que la adivinanza (`font-display text-lg uppercase tracking-tight md:text-2xl`) con `text-action` / `text-success` según el resultado. El sufijo `feedbackAnswerBy + playerName` queda como subtexto `font-body normal-case` dentro del mismo `<p>` para no romper la jerarquía display. El botón `advance-round-button` y el HUD se mantienen en la banda inferior.

**Animación** — el cartel entra con un *pop* (escala `0.85 → 1.08 → 1` + fade in 320 ms) y mantiene un *pulse* sutil (`scale 1 ↔ 1.05`, 1.6 s en loop). Cada nuevo intento o guess regenera la animación al cambiar la `feedbackKey` (forzando remount). Las keyframes (`mapgame-feedback-pop`, `mapgame-feedback-pulse`) y la clase `.mapgame-feedback-animate` viven en [`src/styles/tokens.css`](../../../src/styles/tokens.css) con `@media (prefers-reduced-motion: reduce)` que neutraliza la animación (RF-A04 + RNF-A02).

**Background + cierre manual** — el cartel ya no se auto-oculta; se cierra solo cuando el jugador presiona una X grande. El wrapper aporta un panel oscuro `bg-wood-dark/95 border-2 border-wood-dark/80 rounded-card shadow-chunky-sm px-4 py-3` que destaca sobre el mapa. El botón X (`data-testid="guess-feedback-dismiss"` / `ai-attempt-feedback-dismiss`) usa `h-10 w-10` (mobile) / `h-12 w-12` (desktop), `aria-label=t('feedbackDismiss')` y `focus-visible:outline` para teclado. Se agrega clave i18n `game.feedbackDismiss` ES "Cerrar mensaje" / EN "Close message".

El estado de cierre vive en `dismissedFeedbackKey` (string | null): cuando el usuario clickea la X, se setea a la `feedbackKey` actual; cualquier nuevo intento o guess genera una `feedbackKey` distinta y el cartel reaparece. La regla `react-hooks/set-state-in-effect` queda cumplida porque no hay `setState` síncrono en effects (el dismiss es event handler).

Se preservan `role="status"`, `aria-live="polite"` y los `data-testid` existentes (RF-A01 intacto). `Alert` de `guessSubmitError` y `antiCheatNotice` permanecen en el top (son alertas, no parte del feedback de respuesta).

**Reveal de la adivinanza** — el `<p data-testid="round-prompt">` recibe un pop de ~1 s (`mapgame-prompt-reveal`, keyframe `mapgame-feedback-pop` con easing back-out) al cambiar de ronda para avisar al jugador que el texto del prompt cambió. Se fuerza el remount con `key={`prompt-${activeRoundIndex}`}` para que React re-dispare la animación. Reutiliza la keyframe de pop ya existente (sin pulse loop) y el `@media (prefers-reduced-motion: reduce)` agregado al mismo bloque la neutraliza (RNF-A02).

Verificación: `tsc --noEmit`, `eslint` (archivos tocados) y `vitest run` → 410/410 verde.

---

## Fase 2 — F1: gating del link de fuente

Mapea a §"Fase 2" del plan técnico.

### Tarea 2.1 — Condicionar render de `AiSourceLink`

- [x] En [`src/features/game/GameShell.tsx`](../../../src/features/game/GameShell.tsx) (~línea 182), cambiar:
  ```tsx
  {activeRound.aiSource ? <AiSourceLink source={activeRound.aiSource} /> : null}
  ```
  por una condición que requiera ronda cerrada:
  ```tsx
  {roundGuess && (roundGuess.isCorrect || aiAttemptsUsed >= MAX_AI_ATTEMPTS) && activeRound.aiSource
    ? <AiSourceLink source={activeRound.aiSource} />
    : null}
  ```
- [x] **Ajuste post-revisión UX (2026-05-27):** el link no vive en la fila del header (junto a `AiAttemptsBanner`) sino **dentro** del modal `guess-feedback`, debajo del texto "Bien!/Mal!". Estructura del modal: ahora `flex-col`; primera fila con el mensaje + botón cerrar, segunda fila con `<AiSourceLink />` cuando aplica. La fila del header en modo AI conserva solo `AiAttemptsBanner`. Caveat sobre RF-F12: si el usuario cierra el modal con la X, también oculta el link hasta que se inicie un nuevo intento o se avance de ronda; se asume aceptable como trade-off por la elección de UX de "todo el feedback en un modal cerrable".
- [x] Verificar manualmente en `npm run dev` con una partida AI corta que el link no aparece durante intentos parciales. → Cubierto por tests Vitest F1 (Tarea 2.2); smoke manual pendiente en Fase 7 (Tarea 7.4).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 2.2 — Tests de gating

- [x] Agregar a [`src/features/game/GameShell.test.tsx`](../../../src/features/game/GameShell.test.tsx):
  - `it('no muestra AiSourceLink con ronda abierta y attempts < MAX')`: sesión modo AI con `attempts: [{selectedCountryCode: 'UY', isCorrect: false, ...}]` y sin `guess` → assert `queryByTestId('ai-source-link')` no existe.
  - `it('muestra AiSourceLink al acertar en intento 2')`: sesión AI con un attempt erróneo + `guess.isCorrect = true` → assert link visible.
  - `it('muestra AiSourceLink al agotar 3 intentos')`: sesión AI con 3 attempts erróneos + `guess.isCorrect = false` → assert link visible.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Fase 3 — F2: highlight extendido y atenuación

Mapea a §"Fase 3" del plan técnico.

### Tarea 3.1 — Extender contrato `MapAnswerFeedback`

- [x] En [`src/components/WorldMap.tsx`](../../../src/components/WorldMap.tsx) (líneas 41-45), agregar campo opcional:
  ```ts
  export interface MapAnswerFeedback {
    readonly selectedIso2: IsoCountryCode
    readonly targetIso2: IsoCountryCode
    readonly isCorrect: boolean
    readonly wrongSelectionsIso2?: readonly IsoCountryCode[]
  }
  ```
- [x] Actualizar `mapFeedbackShallowEqual` (~línea 263) para comparar `wrongSelectionsIso2` (length + cada item; helper `wrongSelectionsEqual` que trata `undefined` ≡ `[]` para no romper memo de country/capital).
- [x] Confirmar que `worldMapGeographyRowPropsEqual` sigue consumiendo `mapFeedbackShallowEqual` (no cambia su firma).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 3.2 — Nueva palette atenuada

- [x] En [`src/components/world-map-palette.ts`](../../../src/components/world-map-palette.ts), agregar `MAP_WRONG_SELECTION_DIMMED_PALETTE` con la misma forma que `MAP_WRONG_SELECTION_PALETTE` pero opacidad reducida (~50 %). Se elige `rgba(r,g,b,0.5)` para `fill` y `stroke` (preserva `strokeWidth`) — formato compatible con `toHaveStyle` en jsdom y predecible al testear.
- [x] Documentar en comentario que es un **token derivado** del wrong base, exclusivamente para el caso "acerté tras errar" (PRD RF-F23).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 3.3 — `geographyStyleForIso` consume `wrongSelectionsIso2`

- [x] En [`src/components/WorldMap.tsx`](../../../src/components/WorldMap.tsx) `geographyStyleForIso` (~líneas 217-249), agregar dos ramas:
  - Cuando `!isCorrect && wrongSelectionsIso2?.includes(iso2)` → `MAP_WRONG_SELECTION_PALETTE`.
  - Cuando `isCorrect && wrongSelectionsIso2?.includes(iso2)` → `MAP_WRONG_SELECTION_DIMMED_PALETTE`.
- [x] Asegurar precedencia: target correcto en verde > selected actual erróneo en rojo > wrongSelections previas en rojo (o atenuado si correct) > región/default. Las cinco precedencias quedan documentadas en el JSDoc de `geographyStyleForIso`.
- [x] Confirmar que el caso `selectedIso2 === iso2` con `isCorrect === false` sigue ganando sobre `wrongSelectionsIso2` (el `if (iso2 === selectedIso2)` se evalúa antes que el `includes`).
- [x] **Nota técnica:** la rama 5 (`!isCorrect && iso2 === targetIso2` → amarillo revealed) se mantiene intacta. Para evitar revelar el país objetivo durante una ronda AI **abierta** (cuando el jugador aún tiene intentos), `GameShell` poblará `mapFeedback.targetIso2` con la última selección del jugador en lugar del target real (Tarea 3.4). Esto contiene el ajuste dentro de `GameShell` sin extender el contrato `MapAnswerFeedback` más allá del PRD §2.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 3.4 — Construcción del `mapFeedback` ampliado en `GameShell`

- [x] En [`src/features/game/GameShell.tsx`](../../../src/features/game/GameShell.tsx) (líneas 85-92), modificar la construcción del `mapFeedback`:
  - **Modo AI con ronda abierta y `attempts.length > 0`:** construir feedback con `selectedIso2 = última attempt`, `targetIso2 = última attempt` (ver nota técnica), `isCorrect = false`, `wrongSelectionsIso2 = attempts.filter(a => !a.isCorrect).map(a => a.selectedCountryCode)`.
  - **Modo AI con ronda cerrada (`roundGuess` presente):** mantener `selectedIso2/targetIso2/isCorrect` actuales y agregar `wrongSelectionsIso2` derivado de los `attempts` (filtrando los erróneos). En fallo definitivo, el último attempt erróneo coincide con `selectedIso2` y queda rojo pleno por precedencia 3 de `geographyStyleForIso`.
  - **Country/capital:** sin cambios; `wrongSelectionsIso2` queda `undefined`.
- [x] **Nota técnica (desvío del plan §3.4 acotado):** durante una ronda AI **abierta** se pobla `targetIso2 = lastAttempt.selectedCountryCode` en lugar del target real. Esto evita que `geographyStyleForIso` aplique `MAP_REVEALED_TARGET_PALETTE` al país objetivo mientras el jugador conserva intentos. La elección se contiene dentro de `GameShell` y no modifica el contrato `MapAnswerFeedback` (cumple PRD §2). El revealing amarillo del target se mantiene intacto para `country`/`capital` y para AI con fallo definitivo (ambos pasan por la rama `roundGuess` con `targetIso2 = activeRound.targetCountryCode`).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 3.5 — Tests de `WorldMap` y `GameShell`

- [x] En [`src/components/WorldMap.test.tsx`](../../../src/components/WorldMap.test.tsx):
  - `it('renderiza wrongSelectionsIso2 con el estilo de selección errónea (rojo pleno)')` — mapFeedback con `wrongSelectionsIso2: ['AR']` y `selectedIso2/targetIso2: 'XX'` (aislamos el efecto sobre AR). Assert: `geo-ar` con `fill: rgb(217, 76, 56)` (= `MAP_WRONG_SELECTION_PALETTE`).
  - `it('atenúa los wrong al cerrar con isCorrect=true y target en verde pleno')` — mapFeedback con `isCorrect: true, targetIso2: 'DE', wrongSelectionsIso2: ['AR']`. Assert: `geo-de` con verde `rgb(124, 179, 66)` y `geo-ar` con `rgba(217, 76, 56, 0.5)` (= `MAP_WRONG_SELECTION_DIMMED_PALETTE`).
- [x] En [`src/features/game/GameShell.test.tsx`](../../../src/features/game/GameShell.test.tsx):
  - `it('cartel intermedio AI con 1 attempt erróneo muestra país clickeado + remaining (2)')` — sesión AI con 1 attempt `UY` erróneo (sin guess). Assert: `ai-attempt-feedback` contiene `Mal!`, `Uruguay` y `Te quedan 2 intento`.
  - `it('cartel "Bien!" con 2 attempts previos erróneos muestra país correcto y mapFeedback con wrongSelectionsIso2')` — sesión AI con attempts `[UY false, BR false, AR true]` + guess `AR true`. Se mockea `WorldMap` para exponer `mapFeedback` como JSON; assert: cartel contiene `Bien!` y `Argentina`; `mapFeedback = { selectedIso2: 'AR', targetIso2: 'AR', isCorrect: true, wrongSelectionsIso2: ['UY', 'BR'] }`.
- [x] **Nota técnica:** se introdujo `vi.mock('../../components', ...)` que reexporta el barrel y reemplaza `WorldMap` por un stub `<div data-testid="mock-world-map" data-feedback="<JSON>"/>`. Permite asertar `mapFeedback` sin levantar `react-simple-maps` + `world-atlas` en jsdom. Los tests existentes del archivo no consumen el `WorldMap` real (validan kbd hint, gating del link, copy del cartel), por lo que la sustitución no introduce regresiones.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Ajuste post-revisión bug (2026-05-27)

**Síntoma:** tras un clic erróneo y pulsar «Siguiente», el mapa solo permitía pan/drag y no aceptaba clics en países en la ronda siguiente (o en intentos AI siguientes).

**Causa:** `WorldMap` bloqueaba clics con `locked = answerLocked || Boolean(mapFeedback)`. La Fase 3 pobló `mapFeedback` también con la ronda AI **abierta** (solo highlight rojo), lo que dejaba `locked === true` sin que la ronda estuviera cerrada.

**Corrección:** el bloqueo de clic queda solo en `answerLocked || mapInteractionLocked`. `GameShell` pasa `answerLocked={Boolean(roundGuess)}` (ronda cerrada). El highlight visual (`mapFeedback`) ya no bloquea clics. Test: `permite click de pais con mapFeedback de intentos parciales si answerLocked es false`.

---

## Fase 4 — F3: anti-cheat pausado entre rondas

Mapea a §"Fase 4" del plan técnico.

### Tarea 4.1 — Helper puro `isAntiCheatActive`

- [x] En [`src/services/anticheat-policy.ts`](../../../src/services/anticheat-policy.ts), agregar `export function isAntiCheatActive(session: GameSession | null): boolean`:
  - `false` si `session === null` o `session.status !== 'playing'`.
  - `false` si la ronda activa tiene `guess` (cerrada).
  - `true` en cualquier otro caso (ronda abierta durante partida).
- [x] Sin cambios a `applyAntiCheatIncident` (no se acopla con el motor existente). → Reexport agregado en [`src/services/index.ts`](../../../src/services/index.ts) siguiendo el patrón existente de `applyAntiCheatIncident`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 4.2 — Guarda en listeners de `App.tsx`

- [x] En [`src/App.tsx`](../../../src/App.tsx) `useEffect` líneas 363-393, dentro de `handleWindowBlur` y `handleVisibilityChange`, antes de invocar `handleAntiCheatIncident(...)`, consultar el estado **fresco** de `gameSession` (vía `setGameSession(currentSession => …)` o ref) y llamar `isAntiCheatActive(currentSession)`. Si `false`, `return`. → **Desvío menor del plan §4.2 (más estricto):** la guarda vive en dos puntos para evitar leer un closure stale del handler:
  1. **Early-return del `useEffect`** (`if (!isAntiCheatActive(gameSession)) return`): cuando la ronda activa pasa a `guess` (cerrada), el effect se desmonta y los listeners se remueven; al avanzar de ronda con `onAdvanceRound`, el effect se vuelve a montar.
  2. **Guarda atómica dentro de `handleAntiCheatIncident`** (`setGameSession((currentSession) => { if (!isAntiCheatActive(currentSession)) return currentSession … })`): cubre la ventana corta entre `setGameSession(close round)` y el cleanup del effect, donde un handler todavía-registrado podría disparar con sesión closure-stale.

  No se agrega guarda dentro de los handlers porque ahí el `gameSession` por closure es justamente el potencialmente stale; la frescura real la garantiza el updater de `setGameSession`.
- [x] Mantener el lock temporal de 750 ms existente (separa eventos consecutivos del mismo blur).
- [x] Confirmar que la cuenta de incidentes previos no se borra (RF-I41). → `applyAntiCheatIncident` sigue sumando `session.incidentCount + 1`; al desmontar/remontar el effect no se toca `incidentCount`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 4.3 — Tests del helper y de integración

- [x] En [`src/services/anticheat-policy.test.ts`](../../../src/services/anticheat-policy.test.ts):
  - `it('devuelve false con session null')`.
  - `it('devuelve false con status != playing')` — cubre `setup`, `finished`, `aborted`.
  - `it('devuelve false con ronda activa con guess (cerrada)')`.
  - `it('devuelve true con ronda activa abierta durante partida')` — cubre strict y normal.
- [x] En test dedicado [`src/App.anticheat-pause.test.tsx`](../../../src/App.anticheat-pause.test.tsx), simular partida en strict + country (el helper es agnóstico al modo, evita la complejidad de mockear `/v1/prompts/generate`):
  - `it('blur con ronda cerrada no incrementa incidentCount ni aborta la partida')` — click en `geo-ar` cierra la ronda, blur posterior no aborta.
  - `it('blur con ronda abierta sigue abortando en strict (regresion RF-I43)')` — sin click previo, blur aborta con `incidentCount === 1`.
  - `it('multiples blur con ronda cerrada no acumulan incidentes y la siguiente ronda abierta sigue contando como 1')` — 3 blurs con ronda cerrada → ningún incidente; tras `advance-round-button`, blur con ronda abierta aborta con `incidentCount === 1`.
- [x] **Nota técnica:** se introdujo `vi.mock('react-simple-maps', ...)` con una sola geografía (`AR`) — patrón heredado de [`WorldMap.test.tsx`](../../../src/components/WorldMap.test.tsx). Permite que el click en `geo-ar` invoque al `onClick` real del `WorldMap`, resuelva el ISO2 vía `resolveCountryClickFromTopologyProperties` y dispare `submitRoundGuess` → `Round.guess` queda asignado. Se elige archivo dedicado en lugar de extender `App.test.tsx` para no aplicar el mock global a todos los tests existentes.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Fase 5 — F4: loading ilustrado

Mapea a §"Fase 5" del plan técnico.

### Tarea 5.1 — Componente `WritingHandLoader`

- [x] Crear directorio `src/components/illustrations/` (si no existe).
- [x] Crear [`src/components/illustrations/WritingHandLoader.tsx`](../../../src/components/illustrations/WritingHandLoader.tsx):
  - Componente nombrado, sin default export.
  - Props: `{ readonly className?: string }`.
  - SVG inline con escena chunky: papel (`#f5e6c4`), mano + pluma (`#7d6845` / `#3a2412`) sobre fondo pergamino.
  - `<style>` con `@keyframes` envuelto en `@media (prefers-reduced-motion: no-preference)`. Animaciones sugeridas: traslación leve de la pluma + opacidad de "trazo" en el papel.
  - `aria-hidden="true"` en el SVG raíz.
- [x] **Primera pasada del asistente**: si el resultado no luce bien, refinar el mismo SVG/CSS — sin cambiar a Lottie / GIF / dependencias externas (regla `dependency-security.mdc`).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 5.2 — Tests del loader

- [x] Crear [`src/components/illustrations/WritingHandLoader.test.tsx`](../../../src/components/illustrations/WritingHandLoader.test.tsx):
  - `it('renderiza un SVG con aria-hidden')` (smoke).
  - `it('respeta prefers-reduced-motion')` — si se decide testear vía `window.matchMedia` mock, validar que sin el query la animación queda inactiva.
- [x] Usar el wrapper [`src/test/render-with-i18n.tsx`](../../../src/test/render-with-i18n.tsx).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 5.3 — Integrar en `AiPromptsLoadingView`

- [x] En [`src/features/game/AiPromptsLoadingView.tsx`](../../../src/features/game/AiPromptsLoadingView.tsx):
  - Importar `WritingHandLoader` de `../../components/illustrations/WritingHandLoader`.
  - Renderizar `<WritingHandLoader className="mx-auto" />` entre el `<h1>` y el `<Panel>`.
  - Preservar copy (`ai.loadingBadge`, `ai.loadingTitle`, `ai.loadingLead`, `ai.loadingHint`, `ai.cancel`) y botón cancelar.
- [x] Verificar que `role="status"` del `<Alert>` sigue siendo el ancla de accesibilidad.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 5.4 — Test de la vista de loading

- [x] Crear o ampliar `src/features/game/AiPromptsLoadingView.test.tsx`:
  - `it('renderiza WritingHandLoader')`.
  - `it('mantiene copy y botón cancelar')`.
  - `it('cancelar dispara onCancel')`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Ajuste post-revisión UX (2026-05-28)

Tras smoke visual del usuario, se rehace el cuerpo de `WritingHandLoader.tsx` con un approach distinto al de la primera pasada. No se reabre la fase; se documenta acá para trazabilidad.

**Motivación.** El SVG dibujado a mano (mano + pluma stylizadas) no se leía como mano. Se reemplaza por una composición de **dos imágenes provistas por el usuario** (`assets/parchment.png` con alpha y `assets/quill.jpg`, vía `import` Vite) renderizadas como `<image>` dentro de un único `<svg>` con animación CSS.

**Eliminación del fondo de la pluma sin nuevas dependencias** (regla `dependency-security.mdc`). El JPEG de la pluma trae fondo negro; el sistema no tiene ImageMagick disponible y no se agregan deps de procesamiento (`sharp`, `pillow`, etc.). El pergamino se entrega como PNG RGBA, por lo que ya no requiere chroma-key en runtime.

| Imagen | Técnica | Razón |
|--------|---------|-------|
| Pergamino (PNG con alpha) | Render directo en `<image>` (sin filter, sin backdrop) | El PNG ya trae el fondo recortado; intentos previos con chroma-key sobre JPEG dejaban asomar el `body::before` del juego. |
| Pluma (JPEG fondo negro) | Filtro SVG `feColorMatrix` que mapea luminancia → alpha + `feComponentTransfer` cuasi-step (`slope=100`, `intercept=0`) | Cualquier píxel con luminancia ≥ 0.01 es totalmente opaco (azules oscuros, nib dorada y bordes anti-aliased preservados al 100 %); solo el negro puro cae a alpha 0. La iteración previa (`slope=20`) dejaba la pluma con apariencia translúcida. |
| Pluma (recorte al final del renglón) | `overflow="visible"` en el `<svg>` raíz (atributo SVG + clase `overflow-visible`) | Sin esto, la animación `translate(150px, …)` saca el bbox del quill hasta `x=405` (fuera del `viewBox` 0–360) y el SVG lo recortaba como si el pergamino lo tapara. Con overflow visible la pluma siempre queda como capa superior. |

**Animación.** Tres keyframes dentro de `@media (prefers-reduced-motion: no-preference)` (RF-F54 / RNF-A02):

- `writing-hand-loader-quill` (3.6 s, ease-in-out, infinite, **grupo exterior**): la pluma se desplaza por **tres renglones**, escribiendo de izquierda a derecha (~26 % del ciclo por renglón) con saltos rápidos (~4 %) entre renglones. La nib del JPEG queda en aprox `(15, 85)` del bounding box, y el grupo arranca con la nib sobre el primer renglón en `(110, 170)` del `viewBox 0 0 360 380`.
- `writing-hand-loader-quill-rotate` (0.5 s, ease-in-out, infinite, **grupo interior**): rotación oscilante de `-3deg` a `+3deg` con `transform-box: view-box` y `transform-origin: 110px 170px` (la nib). Simula el "punteo" vertical: la punta superior derecha sube/baja mientras la nib permanece anclada al renglón. Anidar este grupo dentro del que aplica el `translate` mantiene el pivot estable cuando la pluma se desplaza, porque la rotación se compone en el espacio local del hijo antes de la traslación del padre.
- `writing-hand-loader-cursive` (2.4 s, ease-in-out, infinite): tres `<path>` Bezier que simulan letra cursiva, con `opacity` titilando entre `0.25` y `0.95`. Stagger vía `animation-delay` (`0`, `0.4s`, `0.8s`).

**Assets**

- `src/components/illustrations/assets/parchment.png` (206 KB, 360×379, PNG RGBA con alpha nativo).
- `src/components/illustrations/assets/quill.jpg` (11 KB, redimensionado a 320×320 con `sips -Z 320`).

Ambos se importan vía Vite (`import parchmentUrl from './assets/parchment.png'`) para que el bundler aplique hash + caché. Esto agrega dos requests al cargar el loader; se acepta como **desvío explícito de RNF-S05** ("Cero requests adicionales") porque el alternativa (preprocesar a data URL embebido) requiere una dependencia nueva. El patrón es consistente con `src/features/home/HomeView.tsx` y `src/features/learn/CountryLearnModal.tsx`, que ya importan PNGs vía Vite.

**Estructura del DOM.**

```text
<div data-testid="writing-hand-loader" class="relative max-w-[320px]">
  <svg viewBox="0 0 360 380" aria-hidden="true">
    <defs>
      <filter id="writing-hand-loader-remove-black">…</filter>
    </defs>
    <image href={parchmentUrl} />                                  <!-- PNG con alpha, sin filter -->
    <g> (3 × path.cursive-line) </g>
    <g class="writing-hand-loader__quill">                       <!-- translate por renglones -->
      <g class="writing-hand-loader__quill-rotate">             <!-- rotate con pivot en la nib -->
        <image href={quillUrl} filter="url(#writing-hand-loader-remove-black)" />
      </g>
    </g>
  </svg>
</div>
```

**Nombre del componente conservado.** Se mantiene `WritingHandLoader` para no tocar `AiPromptsLoadingView.tsx` ni el path del PRD §RF-F50. La "mano" se lee como metáfora floja: la pluma escribe sola sobre el pergamino.

**Tests adaptados.** `WritingHandLoader.test.tsx` valida `.writing-hand-loader__quill` (presencia del `<image>` interno con filter `remove-black`) y los tres `.writing-hand-loader__cursive-line`. Añade tests para: pergamino sin atributo `filter` (regresión `body::before`), grupo de rotación anidado `.writing-hand-loader__quill-rotate` con `transform-box: view-box` y `transform-origin: 110px 170px`, y presencia del keyframe `writing-hand-loader-quill-rotate` dentro del media query. `AiPromptsLoadingView.test.tsx` se actualiza para reflejar el layout compacto: deja de aseverar `ai.loadingLead` / `ai.loadingHint` y agrega aserciones negativas (`queryByText` + `queryByRole('status')`) para garantizar que el panel ya no se renderiza.

**Layout compacto (post-feedback UX).** Se eliminó el `<Panel>` con `ai.loadingLead` ("Pedimos N adivinanzas…") y el `<Alert>` con `ai.loadingHint` ("Mantenelo abierto…") porque el loader animado ya comunica la espera; los textos secundarios eran ruido. También se redujo el sizing global: título de `text-3xl md:text-4xl` a `text-2xl md:text-3xl`, contenedor de `max-w-2xl` a `max-w-md`, gap/padding de `gap-5 py-12` a `gap-4 py-10`, y el `max-w` interno del loader de `320px` a `240px` (-25 %). Las claves `ai.loadingLead` y `ai.loadingHint` quedan en `game.json` por si una iteración futura las reactiva. La prop `requestedItems` se conserva en `AiPromptsLoadingViewProps` por compatibilidad con `App.tsx`, pero ya no se desestructura en el cuerpo.

Verificación: `tsc --noEmit`, `eslint` sobre archivos tocados y `vitest run` sobre los suites afectados (`WritingHandLoader.test.tsx` + `AiPromptsLoadingView.test.tsx`) → 9/9 verde tras incorporar la animación de rotación y la simplificación del layout.

### Ajuste post-revisión UX (2026-05-28) — animaciones ignoran `prefers-reduced-motion: reduce`

Tras smoke en dispositivo real (Samsung S22 Ultra / Chrome Android), las animaciones de Fase 1 (carteles de feedback `mapgame-feedback-animate` + `mapgame-feedback-animate-inner`, prompt-reveal `mapgame-prompt-reveal`) y Fase 5 (loader `WritingHandLoader`) no se veían porque el sistema operativo tiene activo "Eliminar animaciones" (devuelve `prefers-reduced-motion: reduce`).

**Decisión del dueño del producto (2026-05-28):** ignorar `reduce` en estas animaciones específicas. Se priorizan dos motivos:

- El **loader** es feedback funcional de "estoy trabajando"; sin la pluma escribiendo, el usuario percibe la pantalla como congelada durante 3–8 s de espera del proveedor LLM.
- Los **carteles de respuesta/feedback** transmiten información de estado del juego (acertaste / fallaste / cambió la ronda); el pop-in y el pulse son parte de cómo el usuario los detecta sobre el mapa.

**Implementación.** Se quitan los gates de media query previos:

- `src/components/illustrations/WritingHandLoader.tsx` → las `@keyframes` y reglas `.writing-hand-loader__*` quedan top-level, sin envolver en `@media (prefers-reduced-motion: no-preference)`.
- `src/styles/tokens.css` → se elimina el bloque `@media (prefers-reduced-motion: reduce) { … animation: none }` que neutralizaba `.mapgame-feedback-animate`, `.mapgame-feedback-animate-inner` y `.mapgame-prompt-reveal`.

**Desvío explícito de RF-A04 y RNF-A02** (PRD §accesibilidad pedía respetar `prefers-reduced-motion`). Si en una iteración futura aparece feedback contrario (epilepsia / vestibular sensitivity), se puede:

1. Reintroducir el `@media (reduce)` solo para el pulse de los carteles (mantener el pop-in que es corto y único) y para el `quill-tilt` del loader (mantener traslación + cursive, quitar oscilación).
2. O exponer una preferencia en la UI separada del setting del sistema.

**Tests adaptados.** `WritingHandLoader.test.tsx` invierte la aserción: el `<style>` inyectado **no** debe contener `prefers-reduced-motion`; las keyframes y la regla `.writing-hand-loader__quill { animation: … }` viven top-level. El test con `matchMedia` mockeado a reduce comprueba que la animación sigue presente (desvío deliberado documentado en el propio test).

Verificación: `tsc --noEmit` + `vitest run` sobre suites tocadas → verde.

---

## Fase 6 — F5: resumen final con adivinanzas

Mapea a §"Fase 6" del plan técnico.

### Tarea 6.1 — Extraer `isSafeWikipediaUrl` a util compartida

- [x] Crear [`src/services/safe-wikipedia-url.ts`](../../../src/services/safe-wikipedia-url.ts) con:
  ```ts
  const ALLOWED_HOST_REGEX = /\.wikipedia\.org$/i
  export function isSafeWikipediaUrl(value: string): boolean { … }
  ```
  Se eligió `src/services/` (opción admitida por el plan §6.2) por sobre `src/shared/`: la util es defensiva **solo frontend** (el server tiene su propio [`server/learn/wikipedia-url.ts`](../../../server/learn/wikipedia-url.ts)), `src/services/` ya es el destino canónico para utilidades transversales de frontend y se reexporta vía [`src/services/index.ts`](../../../src/services/index.ts), evitando inaugurar el directorio `src/shared/` por una sola función.
- [x] Actualizar [`src/features/game/AiSourceLink.tsx`](../../../src/features/game/AiSourceLink.tsx) para consumir la util extraída (eliminar la copia local). Tests existentes (`AiSourceLink.test.tsx`) siguen pasando sin cambios.
- [x] Crear [`src/services/safe-wikipedia-url.test.ts`](../../../src/services/safe-wikipedia-url.test.ts) con casos válidos/inválidos: HTTPS + `es/en/fr/commons.wikipedia.org`, rechazo de HTTP, esquemas `javascript:` / `ftp:` / `data:`, dominios fuera (`evil.example.com`, `wikipedia.com`, `es.wikipedia.evil.com`), suffix-match defensivo (`fake-wikipedia.org`, `wikipedia.org.evil.com`), host raíz pelado (`wikipedia.org` sin subdominio → rechazado por el regex `\.wikipedia\.org$`), strings vacíos/malformados.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 6.2 — Componente `AiRoundsSummary`

- [x] Crear [`src/features/game/AiRoundsSummary.tsx`](../../../src/features/game/AiRoundsSummary.tsx):
  - Props: `{ readonly session: GameSession; readonly locale: AppLocale }`.
  - Itera `session.rounds`; por cada round renderiza un bloque con:
    - `roundNumber` envuelto en `<Badge tone="wood">` consumiendo nueva clave `results.ai.roundNumber` ("Ronda {{n}}" / "Round {{n}}") agregada a [`src/i18n/resources/es.ts`](../../../src/i18n/resources/es.ts) y [`src/i18n/resources/en.ts`](../../../src/i18n/resources/en.ts).
    - `prompt`.
    - Nombre del país objetivo vía `resolveCountryNameByIso2(round.targetCountryCode, locale)` de Fase 1.
    - Link a fuente: si `aiSource && isSafeWikipediaUrl(aiSource.url)` → `<a target="_blank" rel="noopener noreferrer">` (`data-testid="ai-rounds-summary-source-link"`); si no → texto plano del título (`data-testid="ai-rounds-summary-source-fallback"`).
    - Indicador acertada/fallida: si `guess.isCorrect === true` → `<Badge tone="success">` con `t('ai.attemptLabel', { n })` donde `n = attempts?.length ?? 1` (fallback a 1 si `attempts` ausente, alineado a RF-F72); si no → `<Badge tone="warning">` con `t('ai.notSolved')`.
    - Delta de score: si acierto → `getAiScoreForAttempt(n)` (1 / 0.5 / 0.25); si fallo → `0`. Format helper local `formatScoreDelta` agrega prefijo `+` cuando > 0 (`+1`, `+0.5`, `+0.25`, `0`); se pasa como `value` a `t('ai.scoreDelta', …)`.
  - Sub-componentes auxiliares (`AiRoundSummaryEntry`, `AiRoundSummarySource`) y helper puro `resolveRoundOutcome` viven en el mismo archivo (no se exportan) — cumplen RNF-E05 (testeable en aislamiento sin acoplar lógica fuera del componente).
- [x] Sin estado interno; componente puro. Sin nuevas llamadas HTTP (RF-F76). No usa `MAX_AI_ATTEMPTS`; un round con `guess.isCorrect === false` (o con `guess === undefined` por edge case de partida abortada) cae al branch "Sin acierto" + delta 0, defensivo ante rondas incompletas.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 6.3 — Integrar en `ResultsView`

- [x] En [`src/features/game/ResultsView.tsx`](../../../src/features/game/ResultsView.tsx), tras el `<Panel>` del leaderboard, agregar el render condicional:
  ```tsx
  {session.config.questionMode === 'ai' ? (
    <AiRoundsSummary session={session} locale={locale} />
  ) : null}
  ```
- [x] Importar `useTranslation` con `const { t, i18n } = useTranslation('results')` y derivar `locale = normalizeAppLocale(i18n.language) ?? 'es'` — alineado al patrón de `GameShell.tsx` (no se castea `i18n.language as AppLocale`, se normaliza vía `normalizeAppLocale` que ya excluye locales no soportados).
- [x] Layout: el `<AiRoundsSummary>` vive dentro del mismo `<section className="… max-w-2xl">` que el resto de `ResultsView`, entre el `<Panel>` del leaderboard y la fila de botones. Hereda el ancho máximo y el `gap-6` del flex-col del section, sin romper mobile (RNF-A03). El componente usa primitives existentes (`Panel`, `Badge`), sin nuevas dependencias.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 6.4 — Tests del summary y del ResultsView

- [x] Crear [`src/features/game/AiRoundsSummary.test.tsx`](../../../src/features/game/AiRoundsSummary.test.tsx) con 9 casos:
  - "lista las tres rondas con prompt, país objetivo y testid por roundNumber" — sesión con acierto intento 1 (AR), acierto intento 3 (BR) y fallo definitivo (JP). Cubre `data-testid="ai-rounds-summary-entry-{n}"` + heading + render de prompts + nombres localizados (`Argentina`, `Brasil`, `Japón`).
  - "muestra 'Acertaste en intento 1' con delta +1" — `attempts.length === 1`, guess correcta.
  - "muestra 'Acertaste en intento 3' con delta +0.25" — 3 intentos, último correcto.
  - "muestra 'Sin acierto' con delta 0 para fallo definitivo" — 3 intentos erróneos, guess `isCorrect: false`. Confirma ausencia de "Acertaste".
  - "renderiza anchor target='_blank' rel='noopener noreferrer' para URL Wikipedia válida" — verifica `data-testid="ai-rounds-summary-source-link"` con anchor accesible por nombre.
  - "renderiza texto plano (sin anchor) para URL no Wikipedia" — `https://evil.example.com/jp` cae a `data-testid="ai-rounds-summary-source-fallback"`, sin link role.
  - "omite el bloque de fuente cuando aiSource es undefined" — ni link ni fallback se renderizan.
  - "asume intento N=1 cuando guess.isCorrect=true y attempts está ausente (RF-F72 fallback)".
  - "respeta locale en inglés para nombre de país y copy" — `locale='en'` con `targetCountryCode='BR'` → renderiza "Brazil" (i18n del catálogo). Nota: el copy de `t()` queda en ES porque el setup de tests fuerza `i18n.language='es'`; en producción `ResultsView` deriva ambos del mismo `i18n.language`.
- [x] Crear [`src/features/game/ResultsView.test.tsx`](../../../src/features/game/ResultsView.test.tsx) con 2 casos:
  - "no renderiza AiRoundsSummary en modo country" — `questionMode: 'country'` → `queryByTestId('ai-rounds-summary')` y `queryByText('Repaso de adivinanzas')` son `null`.
  - "renderiza AiRoundsSummary en modo AI" — `questionMode: 'ai'` con 1 ronda jugada → summary visible con entry 1 + "Acertaste en intento 1" + "+1 pts".

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Fase 7 — e2e + smoke + cierre documental

Mapea a §"Fase 7" del plan técnico.

### Tarea 7.1 — Ampliar e2e modo AI

- [x] Nuevo caso en [`e2e/ai-trivia-flow.spec.ts`](../../../e2e/ai-trivia-flow.spec.ts): `2 fallos + acierto en intento 3: copy, link gating, highlight y resumen final`.
  - Mock dinámico alineado al pool candidato (`mockPromptsApi` devuelve items por ISO2 del POST, no AR/BR/CL fijos).
  - Dos países grandes del pool (`WRONG_CLICK_POOL`) como fallos + acierto en el `data-target-iso2` de la ronda.
  - Asserts: `ai-attempt-feedback` con `Mal!`, nombre del país clickeado y remaining; `guess-feedback` con `Bien!` + `objetivo era` + nombre objetivo; `ai-source-link` solo dentro de `guess-feedback`; fills del mapa (wrong pleno → atenuado + target verde) vía `expectPathFill` con sets default/hover.
  - Cierre: `ai-rounds-summary` con «Acertaste en intento 3» y `+0.25 pts`.
- [x] Happy path corregido: sin `ai-source-link` al inicio (F1); usa `clickMapCountryForCorrectGuess`.
- [x] Helpers compartidos en [`e2e/helpers.ts`](../../../e2e/helpers.ts): `clickMapCountry`, `clickMapCountryForCorrectGuess`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 7.2 — e2e anti-cheat pausado

- [x] Caso en [`e2e/ai-trivia-flow.spec.ts`](../../../e2e/ai-trivia-flow.spec.ts): `blur con ronda cerrada no aborta; blur con ronda abierta sí aborta en strict`.
  - `window.dispatchEvent(new Event('blur'))` con ronda cerrada → `game-shell` visible, sin `game-finished-status`.
  - Tras avanzar, blur con ronda abierta → aborto + `anti-cheat-incidents` con `1`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 7.3 — Regresión e2e country/capital

- [x] Auditoría de [`e2e/game-flow.spec.ts`](../../../e2e/game-flow.spec.ts): no había asserts de ISO2 en copy.
- [x] Nuevo caso `feedback de error muestra nombre del país objetivo, no ISO2 plano` (clic en país distinto al target, assert `objetivo era` y ausencia del ISO2 plano).
- [x] `npm run e2e` → 15/15 verde (2026-05-28).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 7.4 — Smoke manual `vercel dev`

- [x] Checklist operador y hallazgos documentados en [`README.md`](./README.md) §Smoke manual (F1–F5 + ajustes post-UX ya en código).
- [x] Ejecución en `vercel dev` con env real (GEMINI + Convex): **smoke distribuido cubierto** durante la iteración. El operador validó cada fase contra la app corriendo con env real después de cada tarea (no concentrado al final): los ajustes post-revisión UX 2026-05-27 (copy "objetivo era", layout del modal de feedback, animación pop+pulse, X de cierre, prompt-reveal) y 2026-05-28 (rework del `WritingHandLoader` con assets PNG/JPEG, layout compacto del loading, desvío de `prefers-reduced-motion`) son evidencia de smoke en vivo: surgieron de jugar partidas AI reales contra Gemini + Convex, no de los e2e (que están mockeados). Los e2e Playwright (15/15 verdes 2026-05-28) cubren el flujo funcional integrado con API mockeada; el smoke visual cubrió la integración con LLM real.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 7.5 — Cierre documental

- [x] Callout **extendidas** (2026-05-28) al inicio de [`docs/tasks/backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md`](../backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md).
- [x] Actualizados §1 y §2 de [`docs/requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc).
- [x] Entrada movida a **Cerradas** en [`docs/tasks/ideas-features-backlog.md`](../ideas-features-backlog.md).
- [x] Creado [`docs/tasks/modo-ai-trivia-ux-feedback/README.md`](./README.md).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Criterio de cierre

La iteración se considera **cerrada** cuando:

- Todas las tareas de Fases 1–7 están marcadas, con su ritual de 5 sub-items completo.
- `npm run test` y `npm run e2e` verdes en `main`.
- `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
- Bundle sin nuevas dependencias en `package.json`.
- Callout aplicado al PRD viejo y entrada del backlog en **Cerradas**.
- `04-current-state-post-mvp.mdc` §1 actualizado.
- README de la carpeta creado con el estado final.

Si una sub-feature (F1–F5) tiene que demorarse, se documenta en el README de la carpeta y se cierran parcialmente las fases involucradas (las restantes pueden seguir).
