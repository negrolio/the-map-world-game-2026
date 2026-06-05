# Setup redesign — menos web, más game

**Estado (2026-06-04):** **cerrada** — implementación Fases 1–6 completa; Fase 7 con e2e/specs actualizados y cierre documental hecho. `tsc`, `lint` y **488 tests Vitest** verdes. Pendiente operativo (no bloqueante): correr `npm run e2e` local (requiere `npx playwright install`) y smoke manual 390px.

| Documento | Rol |
|-----------|-----|
| [`00-decision-setup-look-and-feel.md`](./00-decision-setup-look-and-feel.md) | ADR D1–D9 (jerarquía lobby/pergamino, cards de modo, reglas AI, copy) |
| [`01-prd-setup-redesign.md`](./01-prd-setup-redesign.md) | PRD: US-01..US-09, RF-S10..RF-S50, RNF, edge cases, fuera de alcance |
| [`02-plan-implementacion-setup-redesign.md`](./02-plan-implementacion-setup-redesign.md) | Plan técnico por 7 fases |
| [`03-todo-list-setup-redesign.md`](./03-todo-list-setup-redesign.md) | Checklist de ejecución con ritual §0 y cierre por fase |

## Alcance resumido

- **Lobby** fuera del pergamino: 3 cards de modo (patrón `HomeModeCard`) + **Jugar ahora**.
- **Panel de configuración** reordenado; tags AI arriba del pergamino cuando aplica.
- **Modo AI:** máx. 2 jugadores, 5 preguntas fijas (ocultas), sin anti-cheat ni aviso strict en UI.
- **Limpieza UX:** sin JSON preview, sin “configuración válida”, copy home/setup actualizado.
- **Assets:** ilustraciones por modo (`src/assets/setup-card-{country,capital,ai}.*`) como fondo de cada card.

## Entregables (código)

- Reglas/validación: `src/services/product-rules.ts` (`PRODUCT_RULES.ai`, `getMaxPlayersForMode`), `validate-config.ts`, `src/features/setup/setup-config-schema.ts`.
- UI lobby: `src/features/setup/SetupModeCard.tsx`, `SetupModeCardGroup.tsx`, `SetupView.tsx` reestructurado + toast de recorte AI.
- Orquestación: `src/App.tsx` (`handleQuestionModeChange`, `handlePlayerCountChange` con máximo dinámico, estado `setupNotice`).
- i18n: claves nuevas y limpieza de obsoletas en `src/i18n/resources/{es,en}.ts`.
- Tests: `SetupModeCard.test.tsx`, `SetupView.test.tsx`, ampliaciones en `App.test.tsx`; e2e en `e2e/{helpers,smoke,game-flow,ai-trivia-flow}.ts` + nuevo `e2e/setup-redesign.spec.ts`.

## Verificación

- `npx tsc --noEmit` ✅ · `npm run lint` ✅ (solo warnings preexistentes en `convex/_generated/`) · `npm run test` ✅ 488 tests.
- e2e: specs actualizados; ejecución pendiente en entorno con Chromium de Playwright instalado.

## Origen

Promovida desde [`../ideas-features-backlog.md`](../ideas-features-backlog.md) — *Setup redesign — menos web, más game*.
