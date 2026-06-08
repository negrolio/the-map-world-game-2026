# Results redesign — pantalla de cierre con sensación de recompensa

**Estado (2026-06-08):** **cerrada** — implementación completa según ADR + follow-up. `tsc`, `lint` y **523 tests Vitest** verdes.

| Documento | Rol |
|-----------|-----|
| [`00-decision-results-look-and-feel.md`](./00-decision-results-look-and-feel.md) | ADR D1–D11 + §18 cambios follow-up (hero, podio, metadata, copa coloreada, fishbone, panel colapsable) |

## Entregables (código)

- Layout: `src/features/game/results-podium.ts` + `results-podium.test.ts` (hero/podio/resto, posiciones con empates, variantes de copa, fishbone)
- UI: `ResultsView.tsx` orquesta `ResultsHero`, `ResultsPodium`, `ResultsLeaderboardRest`, `ResultsMeta`, `ResultsActions`
- Iconos: `TrophyIcon.tsx` (oro/plata/cobre, recoloreable) y `FishboneIcon.tsx` (premio consuelo sin aciertos)
- Estilo AI: `AiRoundsSummary.tsx` (ribbon + cards internas)
- Animación: `.results-reveal` en `src/styles/tokens.css` (respeta `prefers-reduced-motion`)
- Metadata: `ResultsMeta.tsx` colapsable tras botón "Ver detalle"
- Asset/atribución: `src/assets/ASSET-CREDITS.md` (Fishbone de Lorc, game-icons.net, CC BY 3.0)
- i18n: claves nuevas en `src/i18n/resources/{es,en}.ts` (namespace `results`)

## Verificación

- `npx tsc --noEmit` ✅ · `npm run lint` ✅ · `npm run test` ✅ 523 tests
- e2e: `game-flow` y `ai-trivia-flow` actualizados para abrir el panel "Ver detalle" antes de verificar el estado; `data-testid` preservados

## Origen

Promovida desde [`../ideas-features-backlog.md`](../ideas-features-backlog.md) — *Pantalla de resultados — rediseño visual*.
