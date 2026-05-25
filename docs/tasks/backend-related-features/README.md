# Iteración: backend API (Vercel) — planificación

**Estado:** **Fase 1 cerrada** + **rate limit (P8) en repo**. Deploy/smoke HTTPS: [`modo-aprendizaje/04-fase-2-deploy.md`](./modo-aprendizaje/04-fase-2-deploy.md). Checklist: [`03-fase-1-checklist.md`](./modo-aprendizaje/03-fase-1-checklist.md).

Documentación de contexto para que un agente (o humano) pueda **planificar tareas** sin re-leer el hilo de diseño. Cuando se empiece a ejecutar, promover entradas del backlog y crear `01-…`, `02-…` según fases.

| Documento | Rol |
|-----------|-----|
| [`00-decision-resumen-planificacion-backend.md`](./00-decision-resumen-planificacion-backend.md) | **Resumen ejecutivo y decisiones**: alcance, arquitectura modular, hosting, features 1–3, riesgos, orden sugerido |
| [`01-prd-modo-aprendizaje.md`](./01-prd-modo-aprendizaje.md) | **PRD formal** del modo aprendizaje (Wikipedia + backend + front + fases 1–2) |
| [`convex-setup/00-entorno-convex-vercel.md`](./convex-setup/00-entorno-convex-vercel.md) | **Convex + Vercel** (pre-feature): env vars, dev en dos terminales, deploy |
| [`modo-ai-trivia/`](./modo-ai-trivia/) | **Modo AI trivia** (implementado): decisión approach B, PRD, plan, deploy Fase 2 |
| [`riddle-storage-convex/`](./riddle-storage-convex/) | **Persistencia riddles en Convex** (PRD aprobado; pendiente plan/implementación): `00-decision` + `01-prd` |

**Ideas de origen en backlog:** [`ideas-features-backlog.md`](../ideas-features-backlog.md)

- *Persistencia de puntajes en servidor*
- *Modo aprendizaje (explorar países sin penalizar)*
- (Preguntas con IA + tags temáticos: discutido en chat; aún no tiene entrada dedicada en backlog — conviene añadirla al promover. El proyecto se diseña agnóstico del proveedor LLM; la primera implementación usa **Gemini Flash** pero el resto del backend no depende de esa elección)

**Arquitectura frontend existente (referencia):** [`docs/architecture/mvp_frontend_map_game_1b56bd4b.plan.mdc`](../../architecture/mvp_frontend_map_game_1b56bd4b.plan.mdc) — MVP cerrado; dominio en `src/services/`, pool en `buildQuestionPool`, sesión en memoria.

**Estado producto post-MVP:** [`docs/requirements/04-current-state-post-mvp.mdc`](../../requirements/04-current-state-post-mvp.mdc)
