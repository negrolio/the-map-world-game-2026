# Todo list — UX feedback modo AI trivia (ejecución)

**Fecha:** 2026-05-27
**Idioma del documento:** español
**Estado:** **abierto** — sin tareas marcadas.

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

- [ ] En [`src/services/anticheat-policy.ts`](../../../src/services/anticheat-policy.ts), agregar `export function isAntiCheatActive(session: GameSession | null): boolean`:
  - `false` si `session === null` o `session.status !== 'playing'`.
  - `false` si la ronda activa tiene `guess` (cerrada).
  - `true` en cualquier otro caso (ronda abierta durante partida).
- [ ] Sin cambios a `applyAntiCheatIncident` (no se acopla con el motor existente).

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 4.2 — Guarda en listeners de `App.tsx`

- [ ] En [`src/App.tsx`](../../../src/App.tsx) `useEffect` líneas 363-393, dentro de `handleWindowBlur` y `handleVisibilityChange`, antes de invocar `handleAntiCheatIncident(...)`, consultar el estado **fresco** de `gameSession` (vía `setGameSession(currentSession => …)` o ref) y llamar `isAntiCheatActive(currentSession)`. Si `false`, `return`.
- [ ] Mantener el lock temporal de 750 ms existente (separa eventos consecutivos del mismo blur).
- [ ] Confirmar que la cuenta de incidentes previos no se borra (RF-I41).

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 4.3 — Tests del helper y de integración

- [ ] En [`src/services/anticheat-policy.test.ts`](../../../src/services/anticheat-policy.test.ts):
  - `it('isAntiCheatActive devuelve false con session null')`.
  - `it('isAntiCheatActive devuelve false con status != playing')`.
  - `it('isAntiCheatActive devuelve false con ronda activa con guess')`.
  - `it('isAntiCheatActive devuelve true con ronda activa abierta')`.
- [ ] En [`src/App.test.tsx`](../../../src/App.test.tsx) (o test dedicado), simular partida modo AI:
  - `it('blur con ronda cerrada no incrementa incidentCount')`.
  - `it('blur con ronda abierta aborta partida en strict')`.
  - `it('múltiples blur/visibilitychange con ronda cerrada → 0 incidentes')`.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

---

## Fase 5 — F4: loading ilustrado

Mapea a §"Fase 5" del plan técnico.

### Tarea 5.1 — Componente `WritingHandLoader`

- [ ] Crear directorio `src/components/illustrations/` (si no existe).
- [ ] Crear [`src/components/illustrations/WritingHandLoader.tsx`](../../../src/components/illustrations/WritingHandLoader.tsx):
  - Componente nombrado, sin default export.
  - Props: `{ readonly className?: string }`.
  - SVG inline con escena chunky: papel (`#f5e6c4`), mano + pluma (`#7d6845` / `#3a2412`) sobre fondo pergamino.
  - `<style>` con `@keyframes` envuelto en `@media (prefers-reduced-motion: no-preference)`. Animaciones sugeridas: traslación leve de la pluma + opacidad de "trazo" en el papel.
  - `aria-hidden="true"` en el SVG raíz.
- [ ] **Primera pasada del asistente**: si el resultado no luce bien, refinar el mismo SVG/CSS — sin cambiar a Lottie / GIF / dependencias externas (regla `dependency-security.mdc`).

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 5.2 — Tests del loader

- [ ] Crear [`src/components/illustrations/WritingHandLoader.test.tsx`](../../../src/components/illustrations/WritingHandLoader.test.tsx):
  - `it('renderiza un SVG con aria-hidden')` (smoke).
  - `it('respeta prefers-reduced-motion')` — si se decide testear vía `window.matchMedia` mock, validar que sin el query la animación queda inactiva.
- [ ] Usar el wrapper [`src/test/render-with-i18n.tsx`](../../../src/test/render-with-i18n.tsx).

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 5.3 — Integrar en `AiPromptsLoadingView`

- [ ] En [`src/features/game/AiPromptsLoadingView.tsx`](../../../src/features/game/AiPromptsLoadingView.tsx):
  - Importar `WritingHandLoader` de `../../components/illustrations/WritingHandLoader`.
  - Renderizar `<WritingHandLoader className="mx-auto" />` entre el `<h1>` y el `<Panel>`.
  - Preservar copy (`ai.loadingBadge`, `ai.loadingTitle`, `ai.loadingLead`, `ai.loadingHint`, `ai.cancel`) y botón cancelar.
- [ ] Verificar que `role="status"` del `<Alert>` sigue siendo el ancla de accesibilidad.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 5.4 — Test de la vista de loading

- [ ] Crear o ampliar `src/features/game/AiPromptsLoadingView.test.tsx`:
  - `it('renderiza WritingHandLoader')`.
  - `it('mantiene copy y botón cancelar')`.
  - `it('cancelar dispara onCancel')`.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

---

## Fase 6 — F5: resumen final con adivinanzas

Mapea a §"Fase 6" del plan técnico.

### Tarea 6.1 — Extraer `isSafeWikipediaUrl` a util compartida

- [ ] Crear [`src/shared/safe-wikipedia-url.ts`](../../../src/shared/safe-wikipedia-url.ts) (o `src/services/safe-wikipedia-url.ts`) con:
  ```ts
  const ALLOWED_HOST_REGEX = /\.wikipedia\.org$/i
  export function isSafeWikipediaUrl(value: string): boolean { … }
  ```
- [ ] Actualizar [`src/features/game/AiSourceLink.tsx`](../../../src/features/game/AiSourceLink.tsx) para consumir la util extraída (eliminar la copia local).
- [ ] Crear [`src/shared/safe-wikipedia-url.test.ts`](../../../src/shared/safe-wikipedia-url.test.ts) con casos válidos/inválidos (HTTPS + wikipedia.org, HTTP rechazado, dominios no permitidos).

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 6.2 — Componente `AiRoundsSummary`

- [ ] Crear [`src/features/game/AiRoundsSummary.tsx`](../../../src/features/game/AiRoundsSummary.tsx):
  - Props: `{ readonly session: GameSession; readonly locale: AppLocale }`.
  - Itera `session.rounds`; por cada round renderiza un bloque con:
    - `roundNumber`.
    - `prompt`.
    - Nombre del país objetivo (`resolveCountryNameByIso2` de Fase 1 o llamada directa a `getLocalizedCountryName`).
    - Link a fuente: si `aiSource && isSafeWikipediaUrl(aiSource.url)` → `<a target="_blank" rel="noopener noreferrer">`; si no → texto plano del título.
    - Indicador acertada/fallida: si `guess.isCorrect === true` → "Acertaste en intento {{n}}" donde `n = attempts?.length ?? 1`; si no → "Sin acierto".
    - Delta de score: si acierto → `getAiScoreForAttempt(n)`; si fallo → `0`.
- [ ] Sin estado interno; componente puro.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 6.3 — Integrar en `ResultsView`

- [ ] En [`src/features/game/ResultsView.tsx`](../../../src/features/game/ResultsView.tsx), tras el `<Panel>` del leaderboard, agregar:
  ```tsx
  {session.config.questionMode === 'ai' ? (
    <AiRoundsSummary session={session} locale={i18n.language as AppLocale} />
  ) : null}
  ```
- [ ] Importar `useTranslation` con `const { i18n } = useTranslation('results')` para obtener el locale activo.
- [ ] Verificar que el resumen no rompe el layout actual en mobile.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 6.4 — Tests del summary y del ResultsView

- [ ] Crear [`src/features/game/AiRoundsSummary.test.tsx`](../../../src/features/game/AiRoundsSummary.test.tsx):
  - Sesión con 3 rondas: acierto intento 1, acierto intento 3, fallo definitivo.
  - Verifica copy "Acertaste en intento N" y delta correspondiente.
  - Verifica anchor con `target="_blank"` y `rel` correctos cuando URL válida.
  - Verifica texto plano (sin anchor) cuando URL no Wikipedia.
- [ ] Ampliar tests existentes de `ResultsView` (si existen) o crear `ResultsView.test.tsx`:
  - `it('no renderiza AiRoundsSummary en modo country')`.
  - `it('renderiza AiRoundsSummary en modo AI')`.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

---

## Fase 7 — e2e + smoke + cierre documental

Mapea a §"Fase 7" del plan técnico.

### Tarea 7.1 — Ampliar e2e modo AI

- [ ] En [`e2e/ai-trivia-flow.spec.ts`](../../../e2e/ai-trivia-flow.spec.ts) agregar (o ampliar) caso:
  - Mock `mockPromptsApi` con 1 ítem que tenga `iso2: 'AR'`.
  - Jugador falla con `JP` y `BR`, luego acierta con `AR` (intento 3).
  - Assert: cartel intermedio muestra "Mal! Ese es Japón / Brasil" + remaining.
  - Assert: cartel final muestra "Bien! Era Argentina".
  - Assert: `ai-source-link` visible solo tras el acierto.
  - Assert: en el mapa, `data-iso="JP"` y `data-iso="BR"` con estilo atenuado, `AR` con estilo correcto.
  - Avanza y termina partida → assert `AiRoundsSummary` lista la ronda con "intento 3" y delta `+0.25`.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 7.2 — e2e anti-cheat pausado

- [ ] En [`e2e/ai-trivia-flow.spec.ts`](../../../e2e/ai-trivia-flow.spec.ts) agregar caso:
  - Partida AI con ronda cerrada (acierto o fallo definitivo).
  - `await page.evaluate(() => window.dispatchEvent(new Event('blur')))` → partida sigue activa, `incidentCount` sin cambios.
  - Iniciar siguiente ronda; con ronda abierta, mismo `blur` → partida abortada (cartel anti-cheat estricto visible).

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 7.3 — Regresión e2e country/capital

- [ ] Revisar [`e2e/game-flow.spec.ts`](../../../e2e/game-flow.spec.ts) por asserts que validen el copy con ISO2.
- [ ] Actualizar a esperar el nombre del país (ej. "Era Argentina" en lugar de "El objetivo era el país con ISO2 AR").
- [ ] Confirmar suite verde (`npm run e2e`).

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 7.4 — Smoke manual `vercel dev`

- [ ] `vercel dev` con `GEMINI_API_KEY` y `CONVEX_*` configurados (envs locales).
- [ ] Partida modo AI con 2 jugadores y 2 preguntas:
  - Cada jugador debe fallar al menos 1 país y acertar 1.
  - Validar visualmente F1 (link gating), F2 (highlight rojo persistente + nombres en cartel + atenuación al acertar), F3 (abrir link en nueva pestaña, volver, partida sigue), F4 (loader ilustrado durante generación), F5 (resumen al cerrar partida).
- [ ] Documentar hallazgos en el README de la carpeta.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

### Tarea 7.5 — Cierre documental

- [ ] Agregar callout de superseding al inicio de [`docs/tasks/backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md`](../backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md) (formato `.cursor/rules/docs-tasks-conventions.mdc` §Callout):
  ```markdown
  > **Nota (YYYY-MM-DD):** las decisiones "<resumen>" (§…) fueron **extendidas** por
  > [`../../modo-ai-trivia-ux-feedback/01-prd-ux-feedback-modo-ai.md`](../../modo-ai-trivia-ux-feedback/01-prd-ux-feedback-modo-ai.md).
  ```
- [ ] Actualizar §1 y §2 de [`docs/requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc) mencionando esta iteración como cerrada.
- [ ] Mover entrada del backlog ([`docs/tasks/ideas-features-backlog.md`](../ideas-features-backlog.md)) de **En ejecución** → **Cerradas** con link a la carpeta.
- [ ] Crear `docs/tasks/modo-ai-trivia-ux-feedback/README.md` (índice de la carpeta con estado + tabla de docs, replicando el patrón de [`backend-related-features/riddle-storage-convex/README.md`](../backend-related-features/riddle-storage-convex/README.md)).

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

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
