# UX feedback modo AI trivia

**Estado (2026-05-29):** **cerrado** — Fases 1–7 del plan implementadas; suite Vitest y Playwright e2e verdes en local; smoke con env real cubierto durante la iteración (validación distribuida tras cada tarea contra `vercel dev` + Gemini + Convex; los ajustes post-UX 2026-05-27/28 son evidencia documental).

| Documento | Rol |
|-----------|-----|
| [`00-decision-ux-feedback-modo-ai.md`](./00-decision-ux-feedback-modo-ai.md) | ADR D1–D6 (decisiones de producto, aprobado 2026-05-27) |
| [`01-prd-ux-feedback-modo-ai.md`](./01-prd-ux-feedback-modo-ai.md) | PRD formal (RF-F10..RF-F78, RF-I40..RF-I45, RF-A01..RF-A06) |
| [`02-plan-implementacion-ux-feedback-modo-ai.md`](./02-plan-implementacion-ux-feedback-modo-ai.md) | Plan técnico por fases |
| [`03-todo-list-ux-feedback-modo-ai.md`](./03-todo-list-ux-feedback-modo-ai.md) | Checklist de ejecución con ritual §0 |

## Entregables (F1–F5)

| Feature | Resumen | Piezas clave |
|---------|---------|-------------|
| **F1** | Link Wikipedia solo al cerrar la ronda | `GameShell` + `AiSourceLink` dentro de `guess-feedback` |
| **F2** | Highlight rojo persistente + nombres de país en copy | `MapAnswerFeedback.wrongSelectionsIso2`, `world-map-palette` atenuado, i18n `{{country}}` |
| **F3** | Anti-cheat pausado entre rondas (todos los modos) | `isAntiCheatActive` en `anticheat-policy.ts`, guardas en `App.tsx` |
| **F4** | Loading ilustrado | `WritingHandLoader` + `AiPromptsLoadingView` |
| **F5** | Resumen final post-partida | `AiRoundsSummary` + `ResultsView` (solo `questionMode === 'ai'`) |

Util compartida: `src/services/safe-wikipedia-url.ts` (`isSafeWikipediaUrl`).

## Verificación automatizada

- `npx tsc --noEmit`
- `npm run lint`
- `npm run test` (Vitest)
- `npm run e2e` (incluye flujo AI: 2 fallos + acierto intento 3, anti-cheat pausado, regresión copy con nombre de país)

## Smoke manual (`vercel dev`) — checklist operador

Requiere `GEMINI_API_KEY` y `CONVEX_*` en `.env.local`. No sustituye los e2e; valida integración real con LLM/Convex y percepción visual.

**Estado:** cubierto de forma distribuida durante la iteración. El operador validó cada fase tras su implementación contra la app corriendo con env real; los ajustes post-UX (ver sección siguiente) son evidencia documental de ese smoke en vivo.

1. Partida AI: 2 jugadores × 2 preguntas.
2. **F1:** el link no aparece en intentos parciales; sí tras cerrar la ronda (dentro del modal de feedback).
3. **F2:** países erróneos en rojo; al acertar, correcto en verde y errores atenuados; carteles con nombre (no ISO2).
4. **F3:** con ronda cerrada, abrir Wikipedia en nueva pestaña y volver sin abortar; con ronda abierta, blur sigue abortando (strict).
5. **F4:** loader animado durante generación del batch.
6. **F5:** en resultados, sección «Repaso de adivinanzas» con prompt, país, intento y delta.

**Hallazgos documentados (ajustes post-UX ya aplicados en código):**

- Copy «objetivo era {{country}}» en lugar de «Era» (ver nota en todo list §Ajuste post-revisión UX 2026-05-27).
- `WritingHandLoader` usa assets PNG/JPEG locales (desvío de RNF-S05 del PRD original).
- Layout compacto en loading AI (sin panel secundario de hint).

## Relación con PRD modo AI trivia base

El PRD [`../backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md`](../backend-related-features/modo-ai-trivia/01-prd-modo-ai-trivia.md) sigue vigente para approach B, validaciones V1–V8 y scoring; las decisiones de UX de intentos/feedback fueron **extendidas** por esta iteración (callout al inicio de ese PRD).
