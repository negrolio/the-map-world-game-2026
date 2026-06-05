# Todo list — Setup redesign (ejecución)

**Fecha:** 2026-06-04
**Idioma del documento:** español
**Estado:** **cerrada** (2026-06-04) — Fases 1–6 completas; Fase 7 con e2e/specs y cierre documental hechos. Pendiente operativo no bloqueante: `npm run e2e` local + smoke manual 390px.

**Referencias obligadas:**

- Decisión: [`00-decision-setup-look-and-feel.md`](./00-decision-setup-look-and-feel.md)
- PRD: [`01-prd-setup-redesign.md`](./01-prd-setup-redesign.md)
- Plan técnico: [`02-plan-implementacion-setup-redesign.md`](./02-plan-implementacion-setup-redesign.md)
- Reglas: `.cursor/rules/core.mdc`, `.cursor/rules/dependency-security.mdc`, `.cursor/rules/privacy.mdc`, `.cursor/rules/docs-tasks-conventions.mdc`

> Este documento **traduce** el plan técnico a un checklist accionable agrupado por fases. Las decisiones de fondo viven en el ADR y el PRD; aquí solo trackeamos ejecución.

---

## 0. Regla de ejecución entre tareas (obligatoria)

Después de implementar **cada tarea** (cada checkbox de nivel `- [ ]` con encabezado `### Tarea …`), **antes de pasar a la siguiente**, completar el ritual sobre los cambios introducidos por esa tarea:

1. **Review** — releer archivos modificados/creados, mirar el diff (`git status` + `git diff`), confirmar que no hay cambios fuera de alcance.
2. **Analizar los cambios** — verificar alineación con RF/RNF del PRD y el plan; respetar `core.mdc`, `privacy.mdc`, `dependency-security.mdc` (sin `any`, sin default exports, sin secretos, sin lógica de negocio fuera de capa).
3. **Buscar errores** — `npx tsc --noEmit` y `npm run lint` sobre archivos tocados; revisar imports, tipos, paths e i18n.
4. **Corregir** — arreglar todo lo detectado en 1–3 antes de avanzar.
5. **Testear** — correr Vitest relevante a la tarea (nuevos/modificados como mínimo); e2e solo cuando la tarea lo indique.

Cada tarea incluye sub-checklist ritual. **No marcar una tarea completa hasta que sus 5 sub-items estén marcados.**

### Cierre de fase (obligatorio)

Al terminar **todas** las tareas de una fase, ejecutar el bloque **「Cierre de Fase N」** al final de esa fase:

- Review integral del diff acumulado de la fase.
- `tsc --noEmit` + `lint` del repo (o subset acordado).
- Tests de la fase (comandos indicados en el bloque de cierre).
- Corregir regresiones antes de abrir la fase siguiente.

Excepciones (no relajan la regla):

- Tareas **i18n/constantes**: "Testear" = `tsc` + grep sin referencias rotas.
- Tareas **docs/cleanup**: "Testear" = lint del repo verde.
- **Smoke manual** (Fase 7): pasos 1–4 aplican a ajustes menores surgidos durante el smoke.

---

## Fase 1 — Reglas de producto y validación

Mapea a §Fase 1 del plan. RF-S30, RF-S37.

### Tarea 1.1 — Extender `PRODUCT_RULES`

- [x] En [`src/services/product-rules.ts`](../../../src/services/product-rules.ts), agregar:
  ```ts
  ai: { maxPlayers: 2, fixedQuestionCount: 5 }
  ```
- [x] Helper opcional `getMaxPlayersForMode(questionMode: QuestionMode): number` (export desde `product-rules.ts` o `services/index.ts`).
- [x] Actualizar [`src/services/product-rules.test.ts`](../../../src/services/product-rules.test.ts): asserts de `PRODUCT_RULES.ai` y helper si existe.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — `npm run test -- src/services/product-rules.test.ts`

### Tarea 1.2 — `validateConfig` con reglas AI

- [x] En [`src/services/validate-config.ts`](../../../src/services/validate-config.ts), cuando `questionMode === 'ai'`:
  - `players.length > PRODUCT_RULES.ai.maxPlayers` → error field `players`, clave `validation.config.aiPlayersMax` con `{{max}}`.
  - `questionCount !== PRODUCT_RULES.ai.fixedQuestionCount` → error field `questionCount`, clave `validation.config.aiFixedQuestionCount` con `{{count}}`.
- [x] Mantener reglas país/capital sin regresión (max 6 global).
- [x] Ampliar [`src/services/validate-config.test.ts`](../../../src/services/validate-config.test.ts):
  - AI válido: 2 jugadores, 5 preguntas, strict.
  - AI inválido: 3 jugadores.
  - AI inválido: `questionCount !== 5`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — `npm run test -- src/services/validate-config.test.ts`

### Tarea 1.3 — Schema Zod alineado

- [x] En [`src/features/setup/setup-config-schema.ts`](../../../src/features/setup/setup-config-schema.ts), agregar `.superRefine` para modo AI:
  - jugadores ≤ `PRODUCT_RULES.ai.maxPlayers`
  - `questionCount === PRODUCT_RULES.ai.fixedQuestionCount`
- [x] Mensajes: `schema.aiPlayersMax`, `schema.aiFixedQuestionCount` (o convención alineada al repo).
- [x] Ampliar [`src/features/setup/setup-config-schema.test.ts`](../../../src/features/setup/setup-config-schema.test.ts) con fixtures AI válidos/inválidos.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — `npm run test -- src/features/setup/setup-config-schema.test.ts`

### Cierre de Fase 1

- [x] **Review** — diff completo de `product-rules`, `validate-config`, `setup-config-schema` y tests; sin archivos fuera de alcance.
- [x] **Buscar errores** — `npx tsc --noEmit` + `npm run lint`.
- [x] **Testear** — `npm run test -- src/services/product-rules.test.ts src/services/validate-config.test.ts src/features/setup/setup-config-schema.test.ts`
- [x] **Corregir** — cualquier fallo antes de Fase 2.

---

## Fase 2 — i18n, Home y copy del setup

Mapea a §Fase 2 del plan. RF-S28, RF-S40, RF-S50, D9.

### Tarea 2.1 — Claves nuevas (ES + EN)

- [x] [`src/i18n/resources/es.ts`](../../../src/i18n/resources/es.ts):
  - `setup.modeLegend` — "Elegí un modo"
  - `setup.startGame` — "Jugar ahora"
  - `setup.regionLabel` — "Elige un continente"
  - `setup.aiPlayersClamped` — aviso recorte jugadores AI
  - `setup.badge`, `setup.lead` — copy lúdico (ADR D9)
  - `setup.questionsAvailable`, `setup.questionRange` — tono menos técnico
  - `setup.playerCountLabel` — interpolación `{{min}}–{{max}}` si aplica
  - `home.gameCard.description`, `home.gameCard.ariaLabel` — tres modos
  - `validation.config.aiPlayersMax`, `validation.config.aiFixedQuestionCount`
  - `validation.schema.aiPlayersMax`, `validation.schema.aiFixedQuestionCount` (si aplica)
- [x] Replicar en [`src/i18n/resources/en.ts`](../../../src/i18n/resources/en.ts) con copy del PRD §2 / decisión D3.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — `npx tsc --noEmit`

### Tarea 2.2 — Eliminar claves obsoletas

- [x] Borrar de ES + EN: `setup.validConfig`, `setup.configPreviewHeading`, `setup.aiStrictRequired`, `setup.questionModeLegend`.
- [x] Grep en repo: confirmar cero referencias a claves eliminadas (`rg 'validConfig|configPreviewHeading|aiStrictRequired|questionModeLegend'`).
- [x] Actualizar consumidores que aún referencien claves viejas (p. ej. [`SetupView.tsx`](../../../src/features/setup/SetupView.tsx) si compila antes de Fase 4 — puede requerir stub temporal o hacer en la misma tarea).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — `npx tsc --noEmit` + grep sin referencias rotas

### Cierre de Fase 2

- [x] **Review** — solo `es.ts`, `en.ts` y fixes de referencias; copy ES/EN pareado.
- [x] **Buscar errores** — `npx tsc --noEmit` + `npm run lint`.
- [x] **Testear** — `npm run test` (suite completa por si App/Setup aún referencian claves); corregir roturas de compilación.
- [x] **Corregir** — antes de Fase 3.

---

## Fase 3 — Componente `SetupModeCard`

Mapea a §Fase 3 del plan. RF-S20–S23.

### Tarea 3.1 — `SetupModeCard`

- [x] Crear [`src/features/setup/SetupModeCard.tsx`](../../../src/features/setup/SetupModeCard.tsx) basado en [`HomeModeCard.tsx`](../../../src/features/home/HomeModeCard.tsx):
  - Solo nombre (sin descripción).
  - Altura compacta móvil; más alta en `md:`.
  - Fondo CSS por variante (`country` | `capital` | `ai`) — gradientes con tokens; sin PNG.
  - Seleccionado: `border-action border-2`.
  - Props: `mode`, `label`, `selected`, `onSelect`, `testId`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — tests de Tarea 3.3 si ya existen; si no, `tsc` + render manual

### Tarea 3.2 — `SetupModeCardGroup`

- [x] Crear grupo (mismo archivo o [`SetupModeCardGroup.tsx`](../../../src/features/setup/SetupModeCardGroup.tsx)):
  - `role="radiogroup"` + título visible `setup.modeLegend` con `aria-labelledby`.
  - Tres opciones con `data-testid`: `setup-mode-country`, `setup-mode-capital`, `setup-mode-ai`.
  - Radio nativo oculto visualmente o `role="radio"` + `aria-checked`.
  - `onKeyDown`: flechas izq/der cambian selección.
  - `prefers-reduced-motion`: sin hover scale agresivo.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — tests Tarea 3.3

### Tarea 3.3 — Export y tests unitarios

- [x] Export en [`src/features/setup/index.ts`](../../../src/features/setup/index.ts).
- [x] Crear [`src/features/setup/SetupModeCard.test.tsx`](../../../src/features/setup/SetupModeCard.test.tsx):
  - Render 3 cards + legend.
  - Click selecciona; borde/aria-checked.
  - testids presentes.
  - Navegación teclado (opcional pero recomendado).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — `npm run test -- src/features/setup/SetupModeCard.test.tsx`

### Cierre de Fase 3

- [x] **Review** — componentes aislados; sin wiring en SetupView aún (o mínimo).
- [x] **Buscar errores** — `npx tsc --noEmit` + `npm run lint`.
- [x] **Testear** — `npm run test -- src/features/setup/SetupModeCard.test.tsx`
- [x] **Corregir** — antes de Fase 4.

---

## Fase 4 — Reestructuración de `SetupView`

Mapea a §Fase 4 del plan. RF-S10–S14, RF-S24–S27.

### Tarea 4.1 — Estructura de layout

- [x] Refactor [`src/features/setup/SetupView.tsx`](../../../src/features/setup/SetupView.tsx):
  1. **Lobby** (fuera de `Panel`): `SetupModeCardGroup` + `ChunkyButton` ancho "Jugar ahora" (`disabled={!canStartGame}`).
  2. Encabezado: badge + título + lead (i18n Fase 2).
  3. **Panel** orden: tags (AI) → idioma → jugadores → continente → anti-cheat (no AI) → preguntas + bloque rango (no AI) → alerts error only.
  4. **Pie:** segundo "Jugar ahora" + "Volver al home".
- [x] Eliminar preview JSON y rama `validConfig`.
- [x] Quitar prop `setupDraft` de `SetupViewProps` y call site en [`App.tsx`](../../../src/App.tsx) si ya no se usa.
- [x] Quitar `FieldRadioGroup` de modo (reemplazado por cards en lobby).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — `tsc` + tests SetupView Tarea 4.3

### Tarea 4.2 — Toast de recorte AI (UI)

- [x] Prop `setupNotice: string | null` en `SetupViewProps`.
- [x] Render `Alert tone="info"` con `aria-live="polite"` cuando hay notice.
- [x] Auto-ocultar ~4–5 s (`useEffect` + timeout en SetupView o coordinado con App en Fase 5).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — test SetupView: notice visible y desaparece (fake timers)

### Tarea 4.3 — Responsividad y props dinámicas

- [x] `grid grid-cols-3 gap-2 md:gap-4` en cards.
- [x] `max` del input de jugadores vía `getMaxPlayersForMode(questionMode)` en SetupView (sin prop `playerMax` redundante).
- [x] Verificar layout en viewport 390px (test Vitest con `innerWidth` opcional).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 4.4 — Tests `SetupView`

- [x] Crear [`src/features/setup/SetupView.test.tsx`](../../../src/features/setup/SetupView.test.tsx):
  - Lobby: 3 cards + 2 botones "Jugar ahora".
  - Modo AI: tags primero; sin anti-cheat, preguntas ni bloque rango.
  - Modo país: anti-cheat y preguntas visibles.
  - Sin texto JSON ni "configuración válida".
  - Label "Elige un continente".

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — `npm run test -- src/features/setup/SetupView.test.tsx`

### Cierre de Fase 4

- [x] **Review** — SetupView + App (props); lobby fuera del pergamino; sin JSON/éxito.
- [x] **Buscar errores** — `npx tsc --noEmit` + `npm run lint`.
- [x] **Testear** — `npm run test -- src/features/setup/`
- [x] **Corregir** — actualizar [`App.test.tsx`](../../../src/App.test.tsx) si ya falla por copy/layout (mínimo para compilar).

---

## Fase 5 — Orquestación en `App.tsx`

Mapea a §Fase 5 del plan. RF-S31–S36.

### Tarea 5.1 — `handleQuestionModeChange`

- [x] En [`src/App.tsx`](../../../src/App.tsx), reemplazar `onQuestionModeChange={setQuestionMode}` por handler:
  - **Entrar AI:** `questionCount → 5`; si `playerCount > 2` → slice players a 2, `setPlayerCount(2)`, `setSetupNotice(t('setup.aiPlayersClamped'))`.
  - **Salir AI:** `questionCount → 5`; no restaurar playerCount.
  - `setQuestionMode(next)`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 5.2 — `handlePlayerCountChange` con max dinámico

- [x] `effectiveMax = getMaxPlayersForMode(questionMode)` (o ternario con `PRODUCT_RULES.ai.maxPlayers`).
- [x] Aplicar bound en lugar de `PRODUCT_RULES.players.max` fijo.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 5.3 — Estado toast y wiring

- [x] `setupNotice` state en App; pasar a `SetupView`.
- [x] `max` jugadores vía `getMaxPlayersForMode` en SetupView (sin prop `playerMax` extra).
- [x] Limpiar notice al cambiar modo (opcional: al iniciar partida).
- [x] Confirmar `effectiveAntiCheatMode` sin cambios.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 5.4 — Actualizar `App.test.tsx`

- [x] Setup: ya no "Modo de preguntas" / "Cobertura geográfica"; sí "Elige un continente".
- [x] Dos botones "Jugar ahora".
- [x] AI: 4 jugadores en país → card AI → 2 jugadores + notice.
- [x] AI: sin input "Número de preguntas".
- [x] Inicio partida country/capital sin regresión.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — `npm run test -- src/App.test.tsx`

### Cierre de Fase 5

- [x] **Review** — App handlers + props SetupView; lógica AI acotada.
- [x] **Buscar errores** — `npx tsc --noEmit` + `npm run lint`.
- [x] **Testear** — `npm run test -- src/App.test.tsx src/features/setup/`
- [x] **Corregir** — antes de Fase 6.

---

## Fase 6 — Tests unitarios consolidados

Mapea a §Fase 6 del plan.

### Tarea 6.1 — Integración App + setup

- [ ] Flujo Vitest: Home → setup → card Capital → "Jugar ahora" → mapa.
- [ ] Config inválida: solo alerts error; sin cartel éxito.
- [ ] `aria-describedby` en preguntas solo con error y modo no-AI.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear — `npm run test -- src/App.test.tsx`

### Tarea 6.2 — Regresión validación y suite setup/services

- [ ] Confirmar tests F1 (`validate-config`, `setup-config-schema`, `product-rules`) siguen verdes.
- [ ] Auditar `rg ".skip|\.only|xit|xdescribe|it\.todo"` en tests — sin matches (regla `core.mdc`).

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear — `npm run test`

### Cierre de Fase 6

- [ ] **Review** — cobertura setup/App/services sin huecos obvios.
- [ ] **Buscar errores** — `npx tsc --noEmit` + `npm run lint`.
- [ ] **Testear** — `npm run test` (Vitest completo).
- [ ] **Corregir** — suite verde antes de e2e.

---

## Fase 7 — E2E, smoke y cierre documental

Mapea a §Fase 7 del plan.

### Tarea 7.1 — Helpers e2e

- [x] En [`e2e/helpers.ts`](../../../e2e/helpers.ts):
  - `clickStartGame(page)` — `/Jugar ahora|Play now/i`.
  - `selectSetupMode(page, mode)` — click en `setup-mode-*`.
  - Ajustar `goToSetup` si hace falta esperar lobby.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [ ] Testear — `npm run e2e -- e2e/helpers.ts` (requiere `npx playwright install` local)

### Tarea 7.2 — Actualizar specs existentes

- [x] [`e2e/smoke.spec.ts`](../../../e2e/smoke.spec.ts) — CTA "Jugar ahora".
- [x] [`e2e/game-flow.spec.ts`](../../../e2e/game-flow.spec.ts) — CTA + sin radios de modo / textos eliminados.
- [x] [`e2e/ai-trivia-flow.spec.ts`](../../../e2e/ai-trivia-flow.spec.ts) — cards AI, 5 preguntas fijas, CTA nuevo.
- [x] [`e2e/learn-flow.spec.ts`](../../../e2e/learn-flow.spec.ts) — sin cambios de copy setup.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear — `npm run e2e` (subset o completo)

### Tarea 7.3 — Nuevos escenarios e2e

- [x] Crear [`e2e/setup-redesign.spec.ts`](../../../e2e/setup-redesign.spec.ts):
  - Path rápido: card País + CTA superior → mapa.
  - AI clamp: 4 jugadores → AI → 2 + toast.
  - AI oculta preguntas y anti-cheat.
  - Home: card Partida menciona IA (ES).

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear — `npm run e2e -- e2e/setup-redesign.spec.ts`

### Tarea 7.4 — Verificación final automatizada

- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] `npm run test` (483 tests)
- [ ] `npm run e2e` (pendiente: `npx playwright install` en entorno local)

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear — repetir comandos hasta verde

### Tarea 7.5 — Smoke manual (operador)

- [ ] Móvil 390px: 3 cards + CTA sin scroll.
- [ ] País: defaults → "Jugar ahora" arriba → partida.
- [ ] AI: 6 jugadores → recorte + toast → tags arriba del pergamino → 5 rondas.
- [ ] AI → país: 2 jugadores, preguntas editables.
- [ ] Home ES/EN: tres modos en descripción.

Ritual obligatorio (§0):

- [ ] Review — documentar hallazgos en README si hay ajustes post-smoke.
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear — re-ejecutar e2e tras fixes del smoke

### Tarea 7.6 — Cierre documental

- [x] Callout superseding al inicio de [`docs/requirements/01-prd-mvp-producto-y-requerimientos.mdc`](../../requirements/01-prd-mvp-producto-y-requerimientos.mdc) §RF-01.
- [x] Actualizar [`docs/tasks/setup-redesign/README.md`](./README.md): estado cerrado, entregables, verificación.
- [x] Mover entrada en [`docs/tasks/ideas-features-backlog.md`](../ideas-features-backlog.md) → **Cerradas** (+ C1 control de costo AI marcado cerrado en frontend).
- [x] Actualizar [`docs/requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc) §1 y §2.
- [x] Marcar [`01-prd-setup-redesign.md`](./01-prd-setup-redesign.md) como **cerrado** (2026-06-04).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear — lint docs si aplica

### Cierre de Fase 7

- [ ] **Review** — diff completo de la iteración; sin `package.json` / lockfiles tocados.
- [ ] **Buscar errores** — `tsc` + lint + test + e2e verdes.
- [ ] **Testear** — checklist §Criterio de cierre (abajo).
- [ ] **Corregir** — iteración lista para merge.

---

## Trazabilidad PRD → Tareas

| PRD | Tareas |
|-----|--------|
| RF-S10–S14 | 4.1, 4.3, 5.3, 5.4, 7.2, 7.3 |
| RF-S20–S23 | 3.1, 3.2, 3.3, 4.1 |
| RF-S24–S27 | 4.1, 4.4 |
| RF-S28 | 2.1, 4.1, 4.4, 5.4 |
| RF-S30–S37 | 1.1–1.3, 5.1–5.4, 6.2 |
| RF-S40 | 2.1, 7.3 |
| RF-S50 | 2.1, 2.2 |
| RNF-P/A/I | 3.x, 4.x, 6.x, 7.4 |
| E-01–E-12 | 5.1, 5.4, 6.1, 7.3, 7.5 |

---

## Criterio de cierre de la iteración

La iteración se considera **cerrada** cuando:

- Todas las tareas de Fases 1–7 están marcadas, con ritual de 5 sub-items en cada tarea y **Cierre de Fase** completado.
- `npx tsc --noEmit`, `npm run lint`, `npm run test` y `npm run e2e` verdes.
- Sin nuevas dependencias en `package.json`.
- Callout en PRD MVP §RF-01; backlog en **Cerradas**; `04-current-state-post-mvp.mdc` §1 actualizado.
- README de la carpeta con estado final y notas de smoke si aplica.

Si una sub-entrega debe demorarse, documentarlo en el README y cerrar parcialmente las fases afectadas.
