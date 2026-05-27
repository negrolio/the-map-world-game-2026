# Iteración: backend API (Vercel) — planificación

**Estado actual (2026-05-27):**

- **Modo aprendizaje:** cerrado (Fase 1 + rate limit + Fase 2 deploy HTTPS). Ver [`modo-aprendizaje/04-fase-2-deploy.md`](./modo-aprendizaje/04-fase-2-deploy.md) y [`modo-aprendizaje/03-fase-1-checklist.md`](./modo-aprendizaje/03-fase-1-checklist.md).
- **Modo AI trivia:** cerrado (implementación + rate limit + Fase 2 deploy notes). Ver [`modo-ai-trivia/03-deploy-fase-2.md`](./modo-ai-trivia/03-deploy-fase-2.md).
- **Persistencia riddles en Convex:** activo en Production (Convex prod + `GEMINI_API_KEY` + build con `convex deploy`). Snapshot: [`../../operations/deployment-state.md`](../../operations/deployment-state.md). Checklist operativo: [`riddle-storage-convex/03-deploy-fase-2.md`](./riddle-storage-convex/03-deploy-fase-2.md).

Documentación de contexto para que un agente (o humano) pueda **planificar tareas** sin re-leer el hilo de diseño. Al promover nuevas ideas del backlog, crear carpeta hermana con `00-decision-…md`, `01-prd-…md`, etc., según [`.cursor/rules/docs-tasks-conventions.mdc`](../../../.cursor/rules/docs-tasks-conventions.mdc).

| Documento / carpeta | Rol |
|---------------------|-----|
| [`00-decision-resumen-planificacion-backend.md`](./00-decision-resumen-planificacion-backend.md) | **Resumen ejecutivo y decisiones**: alcance, arquitectura modular, hosting, features 1–3, riesgos, orden sugerido |
| [`modo-aprendizaje/`](./modo-aprendizaje/) | **Modo aprendizaje** (cerrado): PRD, plan, deploy Fase 2 y `bugs-or-changes/` |
| [`modo-ai-trivia/`](./modo-ai-trivia/) | **Modo AI trivia** (cerrado): decisión approach B, PRD, plan, deploy Fase 2 |
| [`convex-setup/`](./convex-setup/) | **Convex + Vercel** (índice operativo): env vars, dev en dos terminales, deploy. Doc vivo |
| [`../../operations/deployment-state.md`](../../operations/deployment-state.md) | **Snapshot deployment** (Vercel + Convex prod + envs; sin secretos) |
| [`riddle-storage-convex/`](./riddle-storage-convex/) | **Persistencia riddles en Convex** (activo en prod): `00-decision` + `01-prd` + `02-plan` + `03-deploy-fase-2` |

**Ideas de origen en backlog:** [`ideas-features-backlog.md`](../ideas-features-backlog.md)

- *Persistencia de puntajes en servidor* (pendiente)
- *Modo aprendizaje* — **promovido**, ver [`modo-aprendizaje/`](./modo-aprendizaje/)
- *Preguntas con IA (tags temáticos)* — **promovido**, ver [`modo-ai-trivia/`](./modo-ai-trivia/) + [`riddle-storage-convex/`](./riddle-storage-convex/) (la primera implementación del LLM es **Gemini Flash** detrás de un adaptador `LlmClient` agnóstico)

**Arquitectura frontend existente (referencia):** [`docs/architecture/mvp_frontend_map_game_1b56bd4b.plan.mdc`](../../architecture/mvp_frontend_map_game_1b56bd4b.plan.mdc) — MVP cerrado; dominio en `src/services/`, pool en `buildQuestionPool`, sesión en memoria.

**Estado producto post-MVP:** [`docs/requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc)
