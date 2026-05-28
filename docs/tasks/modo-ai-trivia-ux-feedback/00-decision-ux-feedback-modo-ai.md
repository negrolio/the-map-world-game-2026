# Decisión — UX de intentos y feedback en modo AI trivia

**Estado:** **aprobado** — input para `01-prd-ux-feedback-modo-ai.md` (revisión humana 2026-05-27).
**Fecha:** 2026-05-27
**Idioma del documento:** español
**Audiencia:** producto, desarrollo (frontend), QA, agente de planificación

**Referencias:**

- Backlog (origen de la idea): [`../ideas-features-backlog.md`](../ideas-features-backlog.md) — entrada *Modo AI — UX de intentos y feedback (iteración candidata)* del 2026-05-27.
- PRD vigente del modo AI trivia (a modificar parcialmente vía callouts): [`../backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md`](../backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md) — §2 fila *Cartel con link Wikipedia* y fila *Anti-cheat con AI*; §3 US-08; §5 RF-D31..RF-D34 (donde aplique).
- Decisión de approach del modo AI trivia (vigente, no se modifica): [`../backend-related-features/modo-ai-trivia/00-decision-approach-ai-y-data-retrieval.md`](../backend-related-features/modo-ai-trivia/00-decision-approach-ai-y-data-retrieval.md).
- Estado actual del producto: [`../../requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc) §1 y §2.
- Reglas del repo: `.cursor/rules/docs-tasks-conventions.mdc`, `.cursor/rules/core.mdc`, `.cursor/rules/privacy.mdc`.

---

## 1. Propósito de este documento

Cerrar **antes** del PRD las decisiones de diseño sobre cómo el modo AI trivia comunica los intentos, los errores y los aciertos al jugador. La iteración existe porque el modo AI ya entregado (PRD `01-prd-modo-ai-trivia.md`) tiene varios papers cuts de UX que en uso real se notan agrupados:

- el link a la fuente Wikipedia aparece durante la ronda en curso, no solo al cerrarla;
- al fallar, no queda registro visual de los países ya intentados ni se nombra al país clickeado;
- el anti-cheat `strict` (forzado por modo AI) penaliza el comportamiento natural de leer la fuente recién revelada;
- la pantalla de carga de adivinanzas es plana y no transmite que “se está escribiendo” algo;
- la pantalla final no permite repasar lo aprendido durante la partida.

Este documento **no es un PRD**: es la base de diseño que el PRD respeta. Lo que aquí se decide condiciona los criterios de aceptación, los textos, los componentes a tocar y los callouts de superseding a aplicar sobre el PRD original del modo AI trivia.

---

## 2. Contexto del problema

### 2.1 Comportamiento actual relevante

- `AiSourceLink` se renderiza en `GameShell.tsx` cuando `activeRound.aiSource` está presente, sin condicionar por `roundGuess`. En la práctica el link aparece desde el primer intento.
- `MapAnswerFeedback` (en `WorldMap.tsx`) modela un único par `selectedIso2 + targetIso2 + isCorrect` y solo se computa cuando la ronda ya está cerrada (`roundGuess`). Durante los intentos AI en curso no hay highlight persistente.
- El feedback textual se traduce vía claves `feedbackWrong` / `feedbackCorrect` / `ai.tryAgain` / `ai.finalWrong`. Los mensajes muestran ISO2 del **objetivo**, nunca el nombre del país clickeado.
- El anti-cheat vigila `window.blur` y `document.visibilitychange` mientras `session.status === 'playing'`, independientemente de si la ronda en curso ya tiene `guess`. Con AI en `strict` esto aborta la partida si el usuario abre el link de Wikipedia recién revelado.
- `AiPromptsLoadingView` muestra badge + título + alerta `tone="info"`. Es informativa pero estética plana.
- `ResultsView` muestra leaderboard pero no las adivinanzas jugadas ni sus fuentes.

### 2.2 Restricciones a respetar

- El **motor de juego, el contrato API y el modelo de persistencia** del modo AI trivia no se tocan (sigue vigente todo el PRD AI trivia salvo lo que esta iteración modifique explícitamente).
- Todas las decisiones deben respetar i18n ES/EN ya entregado (claves en `src/i18n/resources/`).
- Sin nuevas dependencias salvo aprobación explícita del usuario (regla `.cursor/rules/dependency-security.mdc`).
- No se introduce auto-zoom del mapa (`fit-bounds`) acá: vive en una entrada de backlog separada y se implementará después.
- No se introducen topes de jugadores/rondas ni reintentos de batch: viven en la iteración candidata *Modo AI — control de costo y robustez API*.
- No se introduce mecánica de pista (`justification`): vive en la iteración candidata *Modo AI — pista vía justification*.

---

## 3. Decisión global

> En modo AI, el feedback durante la ronda se vuelve **acumulativo y nominal**: cada clic incorrecto deja el país pintado y nombrado hasta que la ronda termina; el link a la fuente aparece **solo** cuando la ronda cierra (acierto o agotados los 3 intentos); el anti-cheat se **suspende** entre el cierre de la ronda y el avance a la siguiente, permitiendo leer Wikipedia sin abortar la partida. La carga del batch se acompaña de un loading ilustrado; al finalizar la partida, `ResultsView` lista cada adivinanza con su país objetivo y su link.

Las decisiones específicas que sostienen este enunciado se listan a continuación. Todas están **cerradas** (revisión humana 2026-05-27).

---

## 4. D1 — Scope de esta iteración (cerrada)

**Decisión:** la iteración entrega cinco sub-features bajo un único PRD:

| ID | Sub-feature | Resumen |
|----|-------------|---------|
| F1 | Gating del link de fuente | Mostrar `AiSourceLink` solo cuando la ronda cierra. |
| F2 | Feedback visual y textual acumulativo en AI | Highlight persistente de cada país errado durante la ronda; mensaje con **nombre** del país clickeado. |
| F3 | Anti-cheat pausado entre rondas | Suspender vigilancia de blur/visibilitychange cuando la ronda está cerrada y no se avanzó. |
| F4 | Loading ilustrado al generar adivinanzas | Reemplazar el badge/alert plano por animación temática (mano escribiendo en papel). |
| F5 | Resumen final con adivinanzas | En `ResultsView`, listar por ronda: prompt, país objetivo y link a la fuente. |

**Fuera de alcance** (entradas separadas en el backlog):

- F6 atómica: auto-zoom (`fit-bounds`) post-respuesta para encuadrar todos los países relevantes.
- Topes Setup AI (3 jugadores, 5 preguntas) y reintentos backend.
- Pista vía `justification`.
- Rediseño del Setup.
- Música y mute.

**Implicación para el PRD:** un solo `01-prd-*.md` cubre F1–F5; el plan (`02-plan-*.md`) los descompone por fases.

---

## 5. D2 — F1 Gating del link de fuente (cerrada)

**Decisión:** `AiSourceLink` se renderiza únicamente cuando se cumple alguna de estas condiciones:

1. `roundGuess` existe y `roundGuess.isCorrect === true` (el jugador acertó en cualquier intento).
2. `roundGuess` existe y `roundGuess.isCorrect === false` **y** `aiAttemptsUsed >= MAX_AI_ATTEMPTS` (se agotaron los intentos).

Mientras la ronda está abierta (intentos parciales sin acierto), el link **no** se muestra, ni siquiera en estado "deshabilitado".

**Justificación:** alinea la UI con la regla del PRD original (§2 fila *Cartel con link Wikipedia*: "visible **al cerrar la ronda**, nunca durante 'prueba otra vez'"). Hoy la implementación contradice esta regla.

**Naturaleza del cambio respecto al PRD AI trivia:** **corrección de implementación**, no cambio de decisión de producto. No requiere callout de superseding sobre §2; sí requiere actualizar §5 RF-D34 si está afectado (a confirmar al redactar el PRD nuevo).

---

## 6. D3 — F2 Feedback visual y textual acumulativo en modo AI (cerrada)

**Decisión:** durante una ronda **abierta** del modo AI, cada clic incorrecto:

1. **Deja pintado** el país clickeado con el color de "selección errónea" hasta que la ronda cambie (próxima ronda o reset).
2. **Reemplaza** el mensaje `ai.tryAgain` por una variante que **nombra** el país clickeado (en el idioma del juego):
   - ES: "**Mal!** Ese es **{{country}}**. Te quedan {{remaining}} intento(s)."
   - EN: "**Wrong!** That’s **{{country}}**. {{remaining}} attempt(s) left."
3. Si `roundGuess.isCorrect === true`, el mensaje de cierre incluye el nombre del país acertado:
   - ES: "**Bien!** Era **{{country}}**."
   - EN: "**Correct!** It was **{{country}}**."
4. Si se agotaron los intentos (`ai.finalWrong`), el mensaje muestra **el nombre** del país objetivo (en lugar del ISO2 que se usa hoy):
   - ES: "Se agotaron los intentos. Era **{{country}}**."
   - EN: "Out of attempts. The answer was **{{country}}**."

El nombre del país se resuelve con `getLocalizedCountryName` (`src/data/country-localization.ts`) usando el `locale` actual de i18n.

**D3.a (cerrada 2026-05-27):** el copy ES/EN anterior se **aprueba tal cual** para el PRD e i18n.

**Implicación sobre `MapAnswerFeedback`:** el contrato actual modela un solo `selectedIso2`. En modo AI necesita acomodar **N selecciones erróneas** acumuladas en `Round.attempts[]`. El PRD nuevo deberá extender la forma de `MapAnswerFeedback` o introducir una estructura adyacente sin romper el caso country/capital. La decisión de la **forma concreta** se cierra en el PRD; aquí se cierra **el comportamiento**.

**Restricciones al copy:**

- Mantener tono empático y breve (no técnico).
- No introducir ISO2 en mensajes visibles para el jugador en AI (los ISO2 quedan reservados a logs y `data-target-iso2`).
- En country/capital, el mensaje `feedbackWrong` se actualiza en paralelo para mostrar el **nombre** en lugar del ISO2 (alineado con el espíritu de la idea de backlog *Mensajes de error de respuesta más claros y empáticos*; ver §10).

---

## 7. D4 — F3 Anti-cheat pausado entre rondas (cerrada)

**Decisión:** los listeners de anti-cheat (`window.blur`, `document.visibilitychange`) **no registran incidentes** mientras se cumplen estas dos condiciones a la vez:

1. La ronda activa tiene `guess` (está cerrada).
2. El usuario aún no llamó a `onAdvanceRound`.

En cualquier otro momento de `session.status === 'playing'`, el anti-cheat funciona como hoy (sin regresión para country/capital ni para AI con ronda abierta).

**D4.a (cerrada 2026-05-27):** la pausa aplica **sin tope de tiempo** y **sin límite de eventos**: mientras la ronda esté cerrada y no se haya avanzado, cualquier secuencia de `blur` / `visibilitychange` (incluido volver a la pestaña tras leer Wikipedia) **no** cuenta como incidente.

**Aplicación:** la pausa aplica a todos los modos por simplicidad y consistencia. En country/capital el efecto es benigno (entre ronda cerrada y avance hay poca razón para abrir otra pestaña, pero tampoco hay motivo para penalizarlo). El driver del cambio sigue siendo el modo AI, donde el link Wikipedia recién revelado invita explícitamente a salir de la app.

**Naturaleza del cambio respecto al PRD AI trivia:** **extensión** de la decisión §2 fila *Anti-cheat con AI*. El modo AI sigue forzando `antiCheatMode: 'strict'`; lo que cambia es **cuándo** el listener cuenta incidentes.

**Implicación para el PRD original:** el `01-prd-modo-ai-trivia.md` recibe un callout de superseding al inicio (regla `docs-tasks-conventions.mdc`) apuntando al PRD nuevo, sin reescribir su §2.

---

## 8. D5 — F4 Loading ilustrado al generar adivinanzas (cerrada)

**Decisión:** reemplazar el contenido visual de `AiPromptsLoadingView` (badge + alerta plana) por una **ilustración animada** con tema "mano escribiendo en papel", coherente con la paleta pergamino + madera ya definida (`src/styles/tokens.css`).

**D5.a (cerrada 2026-05-27):** la ilustración se implementa **inline en SVG + CSS** dentro de un nuevo componente `src/components/illustrations/WritingHandLoader.tsx`. **Sin nuevas dependencias.** Estilo cartoon/chunky alineado a la paleta pergamino + madera ya entregada. Se acepta una **primera pasada** del asistente durante la implementación; si el resultado no luce bien, se **refina sobre el mismo SVG** (no se cambia de tecnología).

**Restricciones:**

- Preservar el copy existente (`ai.loadingTitle`, `ai.loadingLead`, `ai.loadingHint`, `ai.cancel`) y el botón **Cancelar**.
- Respetar `prefers-reduced-motion`: la animación se reduce o pausa si el usuario lo solicita.
- Debe seguir siendo testeable con Vitest (componente puro + estado i18n).

**Naturaleza del cambio respecto al PRD AI trivia:** **cambio cosmético**, no de producto. No requiere callout.

---

## 9. D6 — F5 Resumen final con adivinanzas (cerrada)

**Decisión:** en partidas donde `session.config.questionMode === 'ai'`, `ResultsView` agrega una sección por debajo del leaderboard que lista, **una entrada por ronda jugada**:

- Número de ronda (`roundNumber`).
- Texto de la adivinanza (`Round.prompt`).
- Nombre del país objetivo (resuelto vía `getLocalizedCountryName` con `targetCountryCode`).
- Link a la fuente (`Round.aiSource`) si existe, aplicando la misma validación defensiva que `AiSourceLink` (HTTPS + `*.wikipedia.org`).
- Indicador de resultado: acertada o fallida; si acertada, **en qué intento** (1, 2 o 3), derivado de `Round.attempts.length` cuando `guess.isCorrect === true`.

**D6.a (cerrada 2026-05-27):** el resumen final **muestra al jugador** el intento en el que acertó (ej. "Acertaste en el intento 2" / "Correct on attempt 2"). Si la ronda falló definitivamente, se indica fallo sin número de intento de acierto.

En partidas country/capital el bloque **no** se renderiza (no aporta valor: el prompt es el propio nombre del país/capital).

**Implicación sobre datos:** todos los campos necesarios ya existen en `Round` y en `Player`/`AiAttempt`. No se requiere cambio de modelo ni nueva llamada al backend.

**Naturaleza del cambio respecto al PRD AI trivia:** **extensión** (el PRD original define que el cartel con link aparece *durante el cierre de ronda*; no contemplaba un resumen final). Requiere callout en `01-prd-modo-ai-trivia.md`.

---

## 10. Relación con PRDs previos y callouts a aplicar

Al aprobarse esta decisión y redactarse el PRD nuevo (`01-prd-*.md`), los callouts de superseding obligatorios son:

| Doc inmutable | Sección afectada | Tipo de cambio |
|---|---|---|
| [`../backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md`](../backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md) | §2 fila *Cartel con link Wikipedia* | **Sigue vigente**: el cartel aparece al cerrar la ronda. F1 corrige una implementación que se había desviado; no se cambia la decisión. |
| ídem | §2 fila *Anti-cheat con AI* | **Extendida** por F3: el anti-cheat sigue forzando `strict` en AI, pero se pausa la cuenta de incidentes entre ronda cerrada y avance. |
| ídem | §3 US-08 (cartel + link en el cierre de ronda) | **Extendida** por F5: el resumen final agrupa todos los links jugados. |
| ídem | §5 RF (a identificar al redactar el PRD nuevo) | Posibles ajustes en RF de feedback textual por F2 (uso de nombre en lugar de ISO2). |

La idea del backlog *Mensajes de error de respuesta más claros y empáticos* (anotada 2026-05-10, modos country/capital) queda **parcialmente cubierta** por F2 (uso de nombre en lugar de ISO2 en `feedbackWrong`). El PRD lo dejará explícito; la idea original puede luego marcarse como cerrada o reducida en backlog al cerrar esta iteración.

---

## 11. Decisiones aplazadas (no entran a esta iteración)

| Tema | Dónde vive |
|------|------------|
| Auto-zoom del mapa post-respuesta (`fit-bounds`) | Backlog atómica *Mapa — auto-zoom post-respuesta*. |
| Topes Setup AI (3 jugadores, 5 preguntas) | Backlog grupo *Modo AI — control de costo y robustez API* (C1). |
| Reintentos backend si faltan items | Backlog grupo *Modo AI — control de costo y robustez API* (C2). |
| Mecánica de pista (`justification`) | Backlog grupo *Modo AI — pista vía justification*. |
| Setup redesign | Backlog atómica *Setup redesign — menos web, más game*. |
| Música + mute | Backlog atómica *Audio del juego — música + mute*. |

---

## 12. Cierre de preguntas (2026-05-27)

| Id | Resolución |
|----|------------|
| D3.a | Copy ES/EN de §6 **aprobado tal cual**. |
| D4.a | Pausa de anti-cheat **sin tope de tiempo** ni límite de eventos blur/visibility mientras la ronda esté cerrada y no se haya avanzado. |
| D5.a | Ilustración en `src/components/illustrations/WritingHandLoader.tsx` (SVG + CSS inline, estilo chunky, primera pasada del asistente refinable sin cambiar tecnología). |
| D6.a | Resumen final **muestra al jugador** el intento N en el que acertó. |

**Próximo paso:** redactar `01-prd-ux-feedback-modo-ai.md`.
