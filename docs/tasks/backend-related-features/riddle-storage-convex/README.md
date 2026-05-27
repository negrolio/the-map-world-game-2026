# Persistencia de riddles en Convex

**Estado (2026-05-27):** **activo en Production** — esquema Convex `riddles` con índices `by_lookup` / `by_origin`, puerto `RiddleRepository` + adaptadores InMemory / Convex / L1 write-through, refactor de `generate-ai-prompts`, dedupe vía `excludedIds`, respuesta API con `riddleId`, código `503 CONVEX_UNAVAILABLE`, métricas `cache_hit_l1` / `cache_hit_l2` / `cache_miss` / `convex_errors`. Snapshot operativo: [`../../../operations/deployment-state.md`](../../../operations/deployment-state.md). Guía deploy: [`03-deploy-fase-2.md`](./03-deploy-fase-2.md).

| Documento | Rol |
|-----------|-----|
| [`00-decision-persistencia-riddles-convex.md`](./00-decision-persistencia-riddles-convex.md) | Decisiones D1–D9 (ADR, aprobado 2026-05-23) |
| [`01-prd-riddle-storage-convex.md`](./01-prd-riddle-storage-convex.md) | PRD formal de la iteración (incluye §0 *Cambios respecto a iteraciones previas*) |
| [`02-plan-implementacion-riddle-storage-convex.md`](./02-plan-implementacion-riddle-storage-convex.md) | Plan vivo en formato checklist agrupado por fases, con ritual obligatorio entre tareas (Fases 1–7 + 8.1 + 9.1–9.2 marcadas) |
| [`03-deploy-fase-2.md`](./03-deploy-fase-2.md) | Operativa de smoke local (Tarea 8.2) + activación en Vercel (Tarea 9.3) + métricas + rollback |
| [`riddle_storage_convex_implementation_9c60737a.plan.md`](./riddle_storage_convex_implementation_9c60737a.plan.md) | Plan técnico de origen (detalle de archivos y tipos) |
| [`../convex-setup/00-entorno-convex-vercel.md`](../convex-setup/00-entorno-convex-vercel.md) | Infra Convex + Vercel (pre-requisito) |
| [`../../../operations/deployment-state.md`](../../../operations/deployment-state.md) | Snapshot operativo (envs, build, catálogo compartido) |
| [`../modo-ai-trivia/01-prd-modo-ai-trivia.md`](../modo-ai-trivia/01-prd-modo-ai-trivia.md) | PRD del modo AI (vigente salvo persistencia; ver callout al inicio) |
