# PRD — UX de intentos y feedback en modo AI trivia

**Estado:** **cerrado** (2026-05-29) — F1–F5 entregados; Vitest + Playwright verdes; smoke con env real cubierto a lo largo de la iteración.
**Fecha:** 2026-05-27 (cierre 2026-05-29)
**Idioma del documento:** español
**Audiencia:** desarrollo (frontend), QA, planificación de tareas

**Referencias obligadas:**

- Decisión que origina este PRD: [`00-decision-ux-feedback-modo-ai.md`](./00-decision-ux-feedback-modo-ai.md) — §3 a §9 (D1–D6) y §12 (cierre 2026-05-27 de D3.a/D4.a/D5.a/D6.a).
- PRD vigente del modo AI trivia (a complementar mediante callouts): [`../backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md`](../backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md) — §2 fila *Cartel con link Wikipedia* y *Anti-cheat con AI*, §3 US-07/US-08/US-09, §4.5 RF-D05/RF-D08, §4.8 RF-F40..RF-F47, §4.9.
- Estado actual del producto: [`../../requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc) §1 y §2.
- Reglas del repo: `.cursor/rules/docs-tasks-conventions.mdc`, `.cursor/rules/core.mdc`, `.cursor/rules/privacy.mdc`, `.cursor/rules/dependency-security.mdc`.

---

## 0. Cambios respecto a iteraciones previas

| Origen | Decisión previa | Estado en esta iteración |
|--------|-----------------|--------------------------|
| `01-prd-modo-ai-trivia.md` §2 fila *Cartel con link Wikipedia* | El link Wikipedia es visible al cerrar la ronda y nunca durante "prueba otra vez". | **Sigue vigente.** F1 corrige una implementación que se había desviado (hoy el link aparece desde el primer intento). No cambia la decisión. |
| `01-prd-modo-ai-trivia.md` §2 fila *Anti-cheat con AI* | Modo AI fuerza `antiCheatMode: 'strict'`. | **Extendida** por F3: el modo AI sigue forzando `strict`, pero los listeners no cuentan incidentes mientras la ronda está cerrada y el usuario no avanzó. |
| `01-prd-modo-ai-trivia.md` §4.5 RF-D05 (`Round.attempts`) | `attempts` es solo histórico de la ronda y `guess` se asigna en el intento final. | **Extendida** por F2: durante la ronda abierta, los `attempts.selectedCountryCode` alimentan un highlight visual persistente en el mapa. La forma del modelo no cambia. |
| `01-prd-modo-ai-trivia.md` §4.8 RF-F41 / RF-F45 (feedback de intentos y país objetivo) | Feedback intermedio identifica el objetivo por ISO2 al fallar 3 veces; highlight existe solo al cerrar ronda. | **Extendida** por F2: feedback intermedio y final muestran **nombre del país** en lugar de ISO2; highlight persiste por cada intento erróneo durante la ronda. |
| `01-prd-modo-ai-trivia.md` §4.8 RF-F42 (cartel de cierre con link) | El link Wikipedia se muestra al cerrar la ronda. | **Extendida** por F5: además del cartel de cierre, el link se muestra agrupado en `ResultsView` al finalizar la partida. |
| `01-prd-modo-ai-trivia.md` §4.7 RF-F22 (`AiPromptsLoadingView`) | Loading screen informativa con `role="status"`. | **Extendida** por F4: misma estructura, copy y comportamiento (incluido `prefers-reduced-motion` y botón cancelar); cambia el contenido visual a una ilustración SVG inline con animación CSS. |
| `01-prd-modo-ai-trivia.md` §3 US-08 (link al cerrar ronda) | El link es vehículo de verificación post-ronda. | **Extendida** por F5: el resumen final agrupa todos los links jugados por orden de ronda. |

La regla `.cursor/rules/docs-tasks-conventions.mdc` exige callout al inicio del PRD viejo. El callout se agrega cuando este PRD pasa de `aprobado` a inicio de implementación, no antes (para no contaminar trazabilidad si el PRD se modifica).

---

## 1. Resumen

Esta iteración entrega cinco mejoras de UX agrupadas sobre el modo **AI trivia** ya en producción. El objetivo es que el flujo de **intento → feedback → cierre de ronda → siguiente** comunique mejor lo que pasó:

- **F1** Gating del link de fuente: el link Wikipedia solo aparece cuando la ronda cierra (acierto en cualquier intento o tercer fallo).
- **F2** Highlight persistente + nombres: cada clic incorrecto en modo AI deja pintado el país hasta que la ronda cambie; al acertar, los rojos previos quedan **atenuados** junto con el correcto en verde; todos los mensajes muestran **nombre del país** en lugar de ISO2 (en AI y, por consistencia cross-mode, también en country/capital).
- **F3** Anti-cheat pausado entre rondas: blur/visibilitychange no cuentan incidentes mientras la ronda está cerrada y el usuario aún no avanzó. Aplica a todos los modos.
- **F4** Loading ilustrado: `AiPromptsLoadingView` reemplaza su contenido por una ilustración SVG inline animada (mano escribiendo) en `src/components/illustrations/WritingHandLoader.tsx`. Sin nuevas dependencias.
- **F5** Resumen final con adivinanzas: en modo AI, `ResultsView` agrega una sección con una entrada por ronda (prompt + país objetivo + link a fuente + indicador acertada/fallida + intento de acierto + delta de score).

**Fuera de alcance** (entradas separadas en backlog): auto-zoom del mapa (`fit-bounds`), topes de jugadores/rondas y reintentos backend, pista vía `justification`, rediseño de Setup, música y mute.

**Convención respetada:** sin nuevas dependencias (regla `dependency-security.mdc`), sin cambios al contrato API (`shared/ai-trivia-api.ts`), sin cambios al motor de juego o a Convex.

---

## 2. Decisiones de producto (cerradas)

Todas heredadas del ADR `00-decision-ux-feedback-modo-ai.md`. Resumen accionable:

| Tema | Decisión |
|------|----------|
| Visibilidad del link Wikipedia durante la ronda | **Oculto** mientras la ronda está abierta. Visible **al cerrar la ronda** (acierto en cualquier intento o tercer fallo). |
| Highlight visual de intentos errados durante la ronda AI | **Acumulativo:** cada clic erróneo pinta el país con el color de "selección errónea" y permanece visible hasta cambiar de ronda. |
| Highlight al acertar tras intentos previos errados | Pa\u00edses err\u00f3neos previos quedan visibles pero **atenuados** (opacity reducida); el correcto se muestra con el color de acierto a opacidad completa. |
| Mensaje al fallar con intentos restantes (AI) | "**Mal!** Ese es **{{country}}**. Te quedan {{remaining}} intento(s)." (ES) / "**Wrong!** That’s **{{country}}**. {{remaining}} attempt(s) left." (EN). |
| Mensaje al acertar (AI) | "**Bien!** Era **{{country}}**." (ES) / "**Correct!** It was **{{country}}**." (EN). |
| Mensaje al agotar intentos (AI) | "Se agotaron los intentos. Era **{{country}}**." (ES) / "Out of attempts. The answer was **{{country}}**." (EN). |
| Mensaje al fallar en country/capital | Pasa a usar **nombre** del país objetivo en lugar de ISO2 (uso de `getLocalizedCountryName`). |
| Anti-cheat entre ronda cerrada y avance | **Pausa total** de la cuenta de incidentes mientras la ronda activa tiene `guess` y el usuario aún no llamó `onAdvanceRound`. Sin tope de tiempo ni de eventos. Aplica a todos los modos. |
| Loading ilustrado | Nuevo componente `src/components/illustrations/WritingHandLoader.tsx`, SVG + CSS inline (`@keyframes`), respeta `prefers-reduced-motion`. Preserva copy i18n y botón cancelar. |
| Resumen final en modo AI | Sección bajo el leaderboard. Por ronda: prompt + país objetivo + link a fuente + indicador acertada/fallida + intento de acierto (1/2/3) + delta de score (+1, +0.5, +0.25, 0). |
| Contrato `MapAnswerFeedback` | **Extendido** con campo opcional `readonly wrongSelectionsIso2?: readonly IsoCountryCode[]`. Solo poblado en modo AI. Cross-mode no rompe (default omitido). |
| Métricas/telemetría nuevas | **Decisión aplazada al plan**. El PRD no compromete nuevos eventos en `ai_trivia.*`. |

---

## 3. User stories

### US-01 — Ver el link solo cuando la ronda cierra (F1)

**Como** jugador en modo AI,
**quiero** que el link al artículo de Wikipedia **no** se muestre durante mis intentos parciales,
**para** no usarlo como pista mientras pruebo respuestas.

### US-02 — Recordar visualmente los países que ya descarté (F2)

**Como** jugador en modo AI con 3 intentos,
**quiero** que cada país que clickeé y fallé quede pintado de rojo hasta que la ronda termine,
**para** no volver a clickear lo mismo y razonar mejor cuál puede ser el correcto.

### US-03 — Saber qué país clickeé al fallar (F2)

**Como** jugador,
**quiero** que el mensaje de error diga **el nombre** del país que clickeé (no un ISO2 como "AR"),
**para** entender de inmediato qué elegí mal.

### US-04 — Ver el país correcto destacado y mis errores como contexto (F2)

**Como** jugador que acertó en el intento 2 o 3,
**quiero** que el país correcto resalte y mis intentos erróneos sigan visibles pero **atenuados**,
**para** repasar mi recorrido sin que distraiga del acierto final.

### US-05 — Leer la fuente al cerrar la ronda sin perder la partida (F3)

**Como** jugador en modo AI (donde anti-cheat es `strict`),
**quiero** poder abrir el link de Wikipedia recién revelado **sin que la partida se aborte**,
**para** ampliar la información sobre el país que apareció.

### US-06 — Volver a la pestaña sin ser penalizado (F3)

**Como** jugador,
**quiero** poder volver a la pestaña del juego tras leer la fuente y que **no** se cuenten incidentes mientras la ronda esté cerrada y aún no avancé,
**para** no perder la partida por una conducta esperada del producto.

### US-07 — Sentir que algo se está "escribiendo" mientras espero el batch (F4)

**Como** jugador que pulsó "Empezar" en modo AI,
**quiero** una animación más característica del juego en lugar de un loading plano,
**para** entender que la app está componiendo las adivinanzas y no se quedó colgada.

### US-08 — Repasar la partida al terminar (F5)

**Como** jugador,
**quiero** ver al final de la partida, por cada ronda, la adivinanza, el país objetivo, el link a la fuente, si la acerté y en qué intento, y cuánto sumé,
**para** consolidar lo que aprendí y verificar lo que dudé.

---

## 4. Requisitos funcionales y criterios de aceptación

**Convenciones de ID:**

- `RF-D##` — dominio compartido (`src/types`, `src/services`).
- `RF-F##` — frontend (componentes, vistas, i18n).
- `RF-I##` — integración entre componentes (`App.tsx`, `GameShell`, `WorldMap`).
- `RF-A##` — accesibilidad transversal.

### 4.1 Dominio compartido — sin cambios de modelo

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-D01 | **`Round.attempts` sin cambio de forma** | El tipo `AiAttempt` (`src/types/domain.ts`) no se modifica. Las funciones de `src/services/game-round-service*.ts` no cambian su API pública. La iteración consume `Round.attempts[].selectedCountryCode` para alimentar el highlight visual; no introduce campos nuevos. |
| RF-D02 | **Helper de nombre localizado disponible** | El consumo se hace mediante `getLocalizedCountryName` (`src/data/country-localization.ts`) ya existente. No se duplica lógica de localización. |

### 4.2 Frontend — F1: gating del link de fuente

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-F10 | **Render condicional de `AiSourceLink`** | En `GameShell.tsx`, `AiSourceLink` se renderiza si y solo si: (a) `roundGuess` existe **y** `roundGuess.isCorrect === true`, o (b) `roundGuess` existe **y** `roundGuess.isCorrect === false` **y** `aiAttemptsUsed >= MAX_AI_ATTEMPTS`. |
| RF-F11 | **Sin estado intermedio visible** | Mientras la ronda esté abierta (intentos parciales sin acierto), no se renderiza el link, ni el título `aiSource.title`, ni placeholder/deshabilitado. |
| RF-F12 | **Persiste hasta avanzar la ronda** | Una vez cerrada la ronda, el link permanece visible hasta que el usuario llame a `onAdvanceRound`. |
| RF-F13 | **Sin regresión country/capital** | `AiSourceLink` ya solo se rendereaba en modo AI; este cambio no afecta los otros modos. |

### 4.3 Frontend — F2: highlight persistente y copy con nombres

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-F20 | **Extensión de `MapAnswerFeedback`** | `WorldMap.tsx` exporta el contrato `MapAnswerFeedback` con un campo opcional `readonly wrongSelectionsIso2?: readonly IsoCountryCode[]`. La existencia o no del campo no debe afectar consumidores existentes. |
| RF-F21 | **Highlight durante ronda abierta (AI)** | En modo AI, mientras la ronda está abierta y `Round.attempts.length > 0`, `GameShell` construye `mapFeedback` con: `targetIso2 = activeRound.targetCountryCode`, `selectedIso2 = última selección`, `isCorrect = false`, `wrongSelectionsIso2 = todos los selectedCountryCode de attempts.filter(a => !a.isCorrect)`. |
| RF-F22 | **Estilo "selección errónea"** | Cada ISO2 en `wrongSelectionsIso2` se pinta con el mismo color/estilo que el actual `MAP_WRONG_SELECTION_PALETTE` (selección errónea cerrada). |
| RF-F23 | **Atenuación al cerrar con acierto** | Cuando `roundGuess.isCorrect === true` y `wrongSelectionsIso2.length > 0`, los países de `wrongSelectionsIso2` se renderizan con **opacity reducida** (por ejemplo 50 %) mientras el `targetIso2` se mantiene con opacity 100 % en el estilo de acierto. Valor exacto de opacity a definir en el plan; rango permitido 0.35–0.65. |
| RF-F24 | **Persistencia hasta cambiar de ronda** | El highlight (rojos y/o atenuados) permanece visible hasta que la ronda activa cambie (`activeRoundIndex` avanza) o se reinicie la partida. |
| RF-F25 | **Mensaje "mal" con nombre del país (AI, ronda abierta)** | Cuando hay un intento erróneo y la ronda sigue abierta, el cartel intermedio muestra:<br>ES: "**Mal!** Ese es **{{country}}**. Te quedan {{remaining}} intento(s)."<br>EN: "**Wrong!** That’s **{{country}}**. {{remaining}} attempt(s) left."<br>Donde `country = getLocalizedCountryName(last attempt country, locale)` y `remaining = MAX_AI_ATTEMPTS - attempts.length`. |
| RF-F26 | **Mensaje "bien" con nombre del país (AI)** | Cuando `roundGuess.isCorrect === true` (cualquier intento):<br>ES: "**Bien!** Era **{{country}}**."<br>EN: "**Correct!** It was **{{country}}**." |
| RF-F27 | **Mensaje "agotados" con nombre (AI)** | Cuando `roundGuess.isCorrect === false` y `aiAttemptsUsed >= MAX_AI_ATTEMPTS`:<br>ES: "Se agotaron los intentos. Era **{{country}}**."<br>EN: "Out of attempts. The answer was **{{country}}**." |
| RF-F28 | **Mensaje "incorrecto" cross-mode (country/capital)** | El copy actual `game.feedbackWrong` (que usa `{{iso2}}`) se reemplaza por una variante con `{{country}}`:<br>ES: "Incorrecto. Era **{{country}}**."<br>EN: "Incorrect. The answer was **{{country}}**." |
| RF-F29 | **Resolución de nombres con fallback** | Si por alguna razón `getLocalizedCountryName` no devuelve un nombre (caso teórico), se cae al ISO2 entre llaves (sin romper UI). Cubierto por test. |
| RF-F30 | **Sin ISO2 visible al jugador en AI** | En toda la UI de la ronda AI (cartel intermedio y de cierre), no aparece ISO2 plano en mensajes. El ISO2 sigue presente en `data-target-iso2` y en logs, no a la vista. |

### 4.4 Frontend — F3: anti-cheat pausado entre rondas

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-I40 | **Pausa de listeners por estado de ronda** | En `App.tsx`, los handlers `handleWindowBlur` y `handleVisibilityChange` consultan, además del lock temporal de 750 ms existente, una condición adicional: si la **ronda activa** de `gameSession` tiene `guess` (está cerrada) y `session.status === 'playing'`, **no** se invoca `handleAntiCheatIncident`. |
| RF-I41 | **Sin reset del contador** | Los incidentes ya acumulados en rondas previas no se borran. La pausa solo afecta a la cuenta de incidentes **nuevos** mientras se cumple la condición. |
| RF-I42 | **Sin tope de tiempo ni de eventos** | Múltiples `blur`/`visibilitychange` durante la ventana cerrada-pero-no-avanzada no cuentan, sin importar cuántos transcurran ni cuánto tiempo dure. |
| RF-I43 | **Comportamiento normal en ronda abierta** | Con `gameSession.activeRound.guess === undefined` (ronda abierta), los listeners cuentan incidentes como hoy. Sin regresión para country/capital ni AI durante intentos. |
| RF-I44 | **Comportamiento normal con `status !== 'playing'`** | Con `status === 'finished'` o `aborted`, los listeners no están montados (sin cambio respecto a hoy). |
| RF-I45 | **Mensaje `antiCheatNotice` intacto** | El mensaje al usuario tras un incidente cuando sí se cuenta sigue siendo `tGame('antiCheatNormal')` o `tGame('antiCheatStrict')`. No se agregan nuevas claves. |

### 4.5 Frontend — F4: loading ilustrado

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-F50 | **Nuevo componente `WritingHandLoader`** | Nace `src/components/illustrations/WritingHandLoader.tsx`. SVG inline, sin dependencias nuevas. Acepta props mínimas (`className?`, `aria-hidden?` por defecto `true`). |
| RF-F51 | **Animación CSS** | La animación se define con `@keyframes` en CSS (puede vivir como `<style>` JSX adyacente o en módulo Tailwind/utility). No JS runtime para animar. |
| RF-F52 | **Paleta consistente** | Usa tokens existentes (`wood`, `paper`, `ink`) definidos en `src/styles/tokens.css`. Sin introducir nuevos tokens. |
| RF-F53 | **Integración en `AiPromptsLoadingView`** | `AiPromptsLoadingView.tsx` reemplaza/agrega el bloque visual con `<WritingHandLoader />`. Conserva: `Badge` con `ai.loadingBadge`, `h1` con `ai.loadingTitle`, párrafo con `ai.loadingLead`, `Alert tone="info"` con `ai.loadingHint`, botón **Cancelar** con `ai.cancel`. |
| RF-F54 | **`prefers-reduced-motion`** | El CSS de la animación se envuelve con `@media (prefers-reduced-motion: no-preference)`. Si el usuario pide reducción, la ilustración se renderiza estática (sin animar). |
| RF-F55 | **Accesibilidad** | El SVG decorativo lleva `aria-hidden="true"`. El estado de carga sigue comunicándose por el texto existente (`role="status"` ya presente en `Alert`). |
| RF-F56 | **Refinable sin cambiar tecnología** | Se acepta una primera pasada del asistente; ajustes posteriores se hacen sobre el mismo archivo SVG/CSS. No se cambia a Lottie/GIF/PNG. |

### 4.6 Frontend — F5: resumen final con adivinanzas

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-F70 | **Sección condicional en `ResultsView`** | Si `session.config.questionMode === 'ai'`, se renderiza una nueva sección debajo del leaderboard, con heading i18n (`results.ai.summaryHeading`). En otros modos, la sección **no** se renderiza. |
| RF-F71 | **Una entrada por ronda jugada** | Se itera sobre `session.rounds` y por cada `Round` se renderiza una entrada con: número de ronda (`roundNumber`), prompt (`prompt`), nombre del país objetivo (`getLocalizedCountryName(targetCountryCode, locale)`), link a fuente (si `aiSource` válido), indicador acertada/fallida, intento de acierto si aplica (1/2/3) y delta de score de la ronda. |
| RF-F72 | **Intento de acierto** | Cuando la ronda tiene `guess.isCorrect === true`, el indicador muestra "Acertaste en intento N" / "Correct on attempt N", donde N = `attempts.length` (>= 1). Si `attempts` no existe pero `guess.isCorrect === true`, se asume N = 1. |
| RF-F73 | **Indicador de fallo** | Si la ronda terminó sin acierto (`guess.isCorrect === false` y `attempts.length === MAX_AI_ATTEMPTS`), se muestra "Sin acierto" / "Not solved" sin número de intento. |
| RF-F74 | **Delta de score por ronda** | Por ronda se muestra el delta numérico: `+1`, `+0.5`, `+0.25` o `0` según el intento en que se acertó (helper `getAiScoreForAttempt` existente) o `0` si no se acertó. Si `Round.attempts` está ausente, se asume `+1` para acierto y `0` para fallo. |
| RF-F75 | **Link de fuente con validación defensiva** | El link aplica la misma verificación que `AiSourceLink` (`https:` + `*.wikipedia.org`). URLs inválidas se renderizan como texto plano del título (sin anchor). Reusar la utilidad de `AiSourceLink` (extraer `isSafeWikipediaUrl` a módulo compartido si conviene; queda como decisión del plan). |
| RF-F76 | **Sin nueva llamada al backend** | Todos los datos se derivan de `session.rounds`, `session.players` y el catálogo local. **Cero** llamadas HTTP nuevas. |
| RF-F77 | **Orden de rondas** | Las entradas se renderizan en el mismo orden que `session.rounds` (cronológico de juego). |
| RF-F78 | **Layout** | El bloque vive bajo el panel actual del leaderboard, dentro del mismo `section`. Usa primitives existentes (`Panel`, `Badge`, `Alert` cuando aplique). Sin dependencias nuevas. |

### 4.7 Accesibilidad transversal

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-A01 | **Mensaje "mal"/"bien"/"agotados" con `aria-live`** | Los carteles que muestran feedback intermedio y de cierre conservan `role="status"` y `aria-live="polite"` actuales. El cambio de texto no altera la región. |
| RF-A02 | **Nombre de país navegable** | El nombre del país en mensajes y resumen se renderiza como texto plano (no link interno). Sin atributos extra. |
| RF-A03 | **Loader animado decorativo** | El SVG del loader lleva `aria-hidden="true"`. El estado "cargando" lo comunica el texto del `Alert role="status"`. |
| RF-A04 | **`prefers-reduced-motion` respetado** | Cumplir RF-F54 + cualquier otra animación nueva en la iteración. |
| RF-A05 | **Resumen final navegable por teclado** | Cada link de fuente en el resumen es alcanzable por Tab y abre en nueva pestaña con `target="_blank" rel="noopener noreferrer"` (heredado de `AiSourceLink`). |
| RF-A06 | **Contraste preservado** | Los rojos atenuados (RF-F23) deben cumplir contraste mínimo AA con el fondo del mapa. A verificar visualmente al implementar y por test si es factible. |

### 4.8 i18n

| ID | Requisito | Criterios de aceptación |
|----|-----------|-------------------------|
| RF-F90 | **Claves nuevas en `src/i18n/resources/{es,en}.ts`** | Se agregan, como mínimo:<br>`game.ai.tryAgain` (refactor: pasa a aceptar `{{country}}` y `{{remaining}}`)<br>`game.ai.finalWrong` (refactor: usa `{{country}}` en lugar de `{{iso2}}`)<br>`game.ai.correct` (nueva: "Bien! Era {{country}}.")<br>`game.feedbackWrong` (refactor: pasa a usar `{{country}}` en lugar de `{{iso2}}`)<br>`results.ai.summaryHeading`, `results.ai.attemptLabel`, `results.ai.notSolved`, `results.ai.scoreDelta` (nuevas). |
| RF-F91 | **Refactor de consumidores** | Todo lugar que use la clave vieja con `{{iso2}}` se actualiza para pasar `{{country}}`. Tests existentes se ajustan; ningún test queda silenciado. |
| RF-F92 | **Compatibilidad con tests** | Los tests Vitest e2e que comparaban contra la cadena vieja se actualizan (no se duplican claves vieja+nueva; el cambio es full-swap). |
| RF-F93 | **Fallback a `es` preservado** | El fallback i18n actual (es) se mantiene. No se introducen nuevos locales en esta iteración. |

---

## 5. Requisitos no funcionales

### 5.1 Rendimiento

| ID | Requisito |
|----|-----------|
| RNF-P01 | El highlight de N países erróneos (N ≤ 3 en modo AI) **no** debe re-renderizar todo el `WorldMap`. El cálculo del estilo por geografía sigue siendo memoizado por `worldMapGeographyRowPropsEqual`; la extensión de `MapAnswerFeedback` se incorpora a la comparación shallow existente. |
| RNF-P02 | La animación del loader corre **enteramente en CSS**. Ningún `requestAnimationFrame` ni `setInterval` se introduce en JS. |
| RNF-P03 | El resumen final renderiza listas de hasta 30 entradas (peor caso teórico: 6 jugadores × 5 rondas) sin paginar y sin scroll virtual. Render inicial ≤ 100 ms en hardware de referencia (Chrome desktop, mid-tier). |
| RNF-P04 | Sin nuevas llamadas HTTP. F5 deriva todo de `session` en memoria. |

### 5.2 Seguridad y privacidad

| ID | Requisito |
|----|-----------|
| RNF-S01 | El nombre del país mostrado al jugador es resuelto localmente (`i18n-iso-countries` + catálogo); no se envía al backend ni se loguea. |
| RNF-S02 | El link a la fuente en el resumen final aplica la misma validación HTTPS + `*.wikipedia.org` que `AiSourceLink` (RF-F75). URLs inválidas no se renderizan como anchor. |
| RNF-S03 | Sin nuevas dependencias (regla `dependency-security.mdc`). Cualquier excepción requiere el flujo formal de aprobación. |
| RNF-S04 | Sin nuevas claves de localStorage. La iteración no persiste datos del jugador. |
| RNF-S05 | El `WritingHandLoader` no carga assets externos (solo SVG inline). Cero requests adicionales. |
| RNF-S06 | Logs server: la iteración no introduce nuevos eventos; si el plan decide agregar métricas (Q5 aplazada), respetar `privacy.mdc` (sin PII, sin `riddle` completas). |

### 5.3 Escalabilidad y mantenibilidad

| ID | Requisito |
|----|-----------|
| RNF-E01 | El contrato `MapAnswerFeedback` queda como punto único de extensión para futuras features (p. ej. la entrada del backlog *Mapa — auto-zoom post-respuesta* puede consumir el mismo conjunto de ISO2 sin tocar dominios). |
| RNF-E02 | El componente `WritingHandLoader` vive aislado bajo `src/components/illustrations/` para que futuras ilustraciones del juego sigan el mismo patrón. |
| RNF-E03 | La extracción de `isSafeWikipediaUrl` (si se decide) hace que tanto `AiSourceLink` como el resumen final compartan validación. |
| RNF-E04 | Los textos con `{{country}}` y `{{remaining}}` mantienen el contrato i18next existente; no se introduce un sistema de templating paralelo. |
| RNF-E05 | El bloque del resumen final en `ResultsView` se descompone en un sub-componente (`AiRoundsSummary`) testeable en aislamiento. |

### 5.4 Accesibilidad y UX

Cubierto en §4.7 (RF-A01..RF-A06). Adicionalmente:

| ID | Requisito |
|----|-----------|
| RNF-A01 | El cambio de texto a "**Mal!**" / "**Wrong!**" se anuncia por `aria-live="polite"` ya configurado, sin tocar el atributo. |
| RNF-A02 | El loader animado no produce parpadeos de alta frecuencia (límite: ≤ 3 Hz para cualquier oscilación de opacidad o transform). |
| RNF-A03 | El layout del resumen final sigue siendo legible en mobile (max-width existente del `section` se respeta). |

### 5.5 Observabilidad y pruebas

| ID | Requisito |
|----|-----------|
| RNF-T01 | **Vitest `GameShell`:** test "no muestra `AiSourceLink` con ronda abierta y attempts < MAX" (F1). |
| RNF-T02 | **Vitest `GameShell`:** test "muestra `AiSourceLink` al acertar en intento 2" + "al agotar 3 intentos" (F1). |
| RNF-T03 | **Vitest `WorldMap`:** test "renderiza `wrongSelectionsIso2` con estilo de selección errónea" + test "atenúa los wrong al cerrar con isCorrect=true" (F2 RF-F20..F24). |
| RNF-T04 | **Vitest `GameShell`:** test "mensaje intermedio incluye nombre del país y attempts restantes" + "mensaje final usa nombre del país" + "modo country/capital usa nombre en feedbackWrong" (F2 RF-F25..F30). |
| RNF-T05 | **Vitest `App` (o helper):** test "ronda cerrada + blur → no incrementa incidentCount" + "ronda abierta + blur → incrementa incidentCount" + "ronda cerrada + múltiples blur/visibilitychange → 0 incidentes" (F3). |
| RNF-T06 | **Vitest `AiPromptsLoadingView`:** test "renderiza `WritingHandLoader`" + "respeta `prefers-reduced-motion`" + "conserva botón cancelar y copy" (F4). |
| RNF-T07 | **Vitest `WritingHandLoader`:** test "es un SVG con `aria-hidden`" + smoke render. |
| RNF-T08 | **Vitest `ResultsView`:** test "renderiza sección de rondas solo en modo AI" + "lista entradas con prompt/país/link/intento/delta" + "URLs no Wikipedia se renderizan sin anchor" + "no se renderiza la sección en country/capital" (F5). |
| RNF-T09 | **Playwright e2e:** flujo modo AI con 2 fallos + 1 acierto en intento 3 → ver highlights atenuados + cartel "Bien!" con nombre + link visible al cerrar; tras avanzar, link desaparece. |
| RNF-T10 | **Playwright e2e regresión:** flujo `country` y `capital` muestran nombre del país en `feedbackWrong` (no ISO2). |
| RNF-T11 | **Playwright e2e anti-cheat:** en modo AI, blur tras cerrar ronda **no** aborta partida; blur en ronda abierta **sí** la aborta (strict). |
| RNF-T12 | **Tests existentes:** ninguno se elimina ni se silencia (regla `core.mdc` "No eliminar tests existentes"). Los que validaban ISO2 en mensajes se actualizan al nuevo contrato textual. |

---

## 6. Edge cases y escenarios de error

| Caso | Comportamiento esperado |
|------|-------------------------|
| Usuario clickea el **mismo** país erróneo dos veces en la misma ronda AI. | Cada clic consume un intento (regla existente del PRD viejo RF-D08). El highlight rojo permanece (idempotente). El mensaje se actualiza con `remaining` decrecido. |
| Usuario clickea sobre el agua / fuera del mapa. | Sin cambios respecto a hoy. No se cuenta intento, no se actualiza highlight. |
| `Round.attempts` está ausente (ronda nacida en country/capital). | F2 no aplica; `wrongSelectionsIso2` queda `undefined`. `MapAnswerFeedback` se construye igual que hoy (single selection). |
| `aiSource` es `undefined` al cerrar la ronda. | El cartel de cierre se renderiza sin link (caso ya posible hoy; preservar). El resumen final omite el link de esa ronda y muestra solo el título textual o nada (el plan decide). |
| `aiSource.url` no pasa la validación HTTPS + `*.wikipedia.org`. | Cartel de cierre: fallback existente (`ai-source-link-safe-fallback`). Resumen final: igual (texto plano del título; no anchor). |
| Anti-cheat: usuario abre el link en la **misma** pestaña en lugar de `target="_blank"`. | Caso teórico: como `AiSourceLink` siempre pone `target="_blank"` esto no ocurre. Si ocurriera, al volver la app puede no estar montada y `gameSession` se pierde (sin cambio respecto a hoy). |
| Anti-cheat: usuario hace blur **inmediatamente después** de acertar y antes de que React render el `guess`. | El listener se ejecuta con el estado actualizado por `setGameSession`; si `guess` ya está en la sesión, se cumple la condición de pausa. Si no, se cuenta como hoy. Documentar como **no determinista** en el plan; aceptable porque la ventana es < 50 ms. |
| `prefers-reduced-motion: reduce` activo. | El loader renderiza el SVG estático sin animación (RF-F54). Resto de la UI sin cambios. |
| Partida country/capital con `feedbackWrong` ya en pantalla en el momento del deploy. | Al recargar/iniciar nueva partida, el copy nuevo se aplica. No hay sesiones persistidas entre deploys (no aplica). |
| Resumen final con `questionCount > rounds.length` (partida abortada). | Se listan solo las rondas presentes en `session.rounds`. La sección no se rompe; muestra el subconjunto disponible. |
| Resumen final cuando la partida fue `aborted` por anti-cheat (no AI, p. ej. country en strict). | La sección de F5 **no** se renderiza (RF-F70 condiciona por `questionMode === 'ai'`). El warning de aborto existente se sigue mostrando. |
| Cambio de idioma en mitad de la partida. | Las claves i18n se re-resuelven al render siguiente. El highlight visual no cambia (es por ISO2). Los nombres en mensajes se actualizan en la próxima render. |
| Catálogo `i18n-iso-countries` no devuelve nombre para un ISO2 dado. | Fallback a catálogo interno (ya manejado por `getCountryDisplayName`); si tampoco, ISO2 entre llaves (RF-F29). Test cubre el caso. |
| Usuario navega rápidamente: clic erróneo + blur + clic correcto + blur + advance. | El blur entre intentos cuenta (ronda abierta); el blur tras acierto no cuenta (ronda cerrada). Comportamiento determinista por estado de `gameSession`. |

---

## 7. Fuera de alcance

| Tema | Dónde vive |
|------|------------|
| Auto-zoom del mapa (`fit-bounds`) post-respuesta para encuadrar el correcto + los erróneos. | Backlog atómica *Mapa — auto-zoom post-respuesta*. Esta iteración deja el contrato `MapAnswerFeedback.wrongSelectionsIso2` listo para que la próxima feature consuma. |
| Topes Setup AI (3 jugadores, 5 preguntas por jugador). | Backlog grupo *Modo AI — control de costo y robustez API* (C1). |
| Reintentos backend si el batch viene incompleto. | Backlog grupo *Modo AI — control de costo y robustez API* (C2). |
| Mecánica de pista vía `justification`. | Backlog grupo *Modo AI — pista vía justification*. |
| Rediseño visual del Setup ("menos web, más game"). | Backlog atómica *Setup redesign*. |
| Música de fondo y mute. | Backlog atómica *Audio del juego*. |
| Cambios al contrato API `shared/ai-trivia-api.ts` (incluye exposición de `justification`). | Aplazado a la iteración de pista. |
| Cambios al motor de juego o a Convex. | Fuera de scope. La iteración consume datos existentes. |
| Nuevas dependencias (Lottie, animation libs, etc.). | Prohibidas por regla `dependency-security.mdc`. |
| Cambios al rate limit o al endpoint `POST /v1/prompts/generate`. | Fuera de scope. |
| Persistencia de la lista de "vistos" del jugador o de su historial. | Fuera de scope. |
| Métricas nuevas en `ai_trivia.*`. | Decisión aplazada al plan (Q5). Si se agregan, son add-only y respetan `privacy.mdc`. |
| Refactor del helper `getActivePlayerForRound` y del motor de turnos. | Fuera de scope. |
| Cambios a la palette del mapa (`world-map-palette.ts`). | **Permitido excepción acotada:** si la atenuación de RF-F23 requiere una variante del color "wrong" con opacidad, vive dentro de `world-map-palette.ts` como token derivado del existente; no se cambia el color base. |

---

## 8. Plan de fases (alto nivel)

El detalle ejecutable va al `02-plan-implementacion-*.md`. A nivel de fases:

**Fase 1 — Cambios de dominio y UI textual**

- RF-F25..RF-F30 (copy con nombre de país, AI + country/capital).
- RF-F90..RF-F93 (i18n).
- Tests Vitest RF-T04, RF-T12.

**Fase 2 — F1 (gating del link)**

- RF-F10..RF-F13.
- Tests RF-T01, RF-T02.

**Fase 3 — F2 (highlight persistente y atenuación)**

- RF-F20..RF-F24.
- Tests RF-T03.

**Fase 4 — F3 (anti-cheat pausado)**

- RF-I40..RF-I45.
- Tests RF-T05.

**Fase 5 — F4 (loading ilustrado)**

- RF-F50..RF-F56 + accesibilidad (RNF-A02).
- Tests RF-T06, RF-T07.

**Fase 6 — F5 (resumen final)**

- RF-F70..RF-F78.
- Tests RF-T08.

**Fase 7 — Cierre**

- e2e Playwright RF-T09..RF-T11.
- Smoke manual del flujo completo.
- Actualizar `docs/requirements/04-current-state-post-mvp.mdc` §1 y entrada del backlog (Cerradas).
- Aplicar callout en `01-prd-modo-ai-trivia.md`.

El plan puede reordenar fases si conviene técnicamente; las dependencias estrictas son: F2 depende del refactor de copy (Fase 1) por las claves nuevas, y F5 depende de tener `getLocalizedCountryName` accesible en `ResultsView` (ya lo está vía `src/data/country-localization.ts`).

---

## 9. Criterio de cierre de la iteración

La iteración se considera **cerrada** cuando:

1. Todos los RF de §4 cumplen sus criterios de aceptación en `main`.
2. Suite Vitest verde (incluidos tests nuevos RF-T01..RF-T08 y RF-T12).
3. Suite Playwright verde (incluidos RF-T09..RF-T11).
4. Sin nuevos lints introducidos.
5. Bundle del frontend sin nuevas dependencias en `package.json`.
6. `docs/requirements/04-current-state-post-mvp.mdc` §1 actualizado mencionando esta iteración como cerrada.
7. Entrada del backlog (`docs/tasks/ideas-features-backlog.md`) movida de **En ejecución** a **Cerradas** con link a la carpeta de iteración.
8. Callout aplicado al inicio de `01-prd-modo-ai-trivia.md` apuntando a este PRD.
9. Smoke manual en `vercel dev` con al menos 1 partida AI completa de 3 rondas (al menos un acierto en intento 2/3, al menos un fallo definitivo) confirmando highlights, copy, link y resumen final.

Si una sub-feature (F1–F5) tiene que demorarse, se cierra parcialmente y se documenta en el README de la carpeta (la iteración entera no se cierra hasta entregar las cinco).
