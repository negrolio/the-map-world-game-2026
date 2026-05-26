# Plan de implementación (checklist) — Persistencia de riddles en Convex

**Fecha:** 2026-05-25 (avance marcado: 2026-05-26)
**Idioma del documento:** español
**Estado:** Fases 1–7 + 8.1 + 9.1 + 9.2 completadas en repo. Pendiente: **8.2** (smoke local con `vercel dev` + Convex) y **9.3** (deploy preview/prod + smoke HTTPS).

**Referencias obligadas:**

- Plan técnico de origen: [`./riddle_storage_convex_implementation_9c60737a.plan.md`](./riddle_storage_convex_implementation_9c60737a.plan.md)
- PRD: [`./01-prd-riddle-storage-convex.md`](./01-prd-riddle-storage-convex.md)
- Decisión: [`./00-decision-persistencia-riddles-convex.md`](./00-decision-persistencia-riddles-convex.md)
- Setup Convex + Vercel: [`../convex-setup/00-entorno-convex-vercel.md`](../convex-setup/00-entorno-convex-vercel.md)
- Reglas: `.cursor/rules/core.mdc`, `.cursor/rules/dependency-security.mdc`, `.cursor/rules/privacy.mdc`, `.cursor/rules/docs-tasks-conventions.mdc`

> Este documento **traduce** el plan técnico (`*.plan.md`) a un checklist accionable agrupado por fases. Las decisiones de fondo viven en el plan técnico y en el PRD; aquí solo trackeamos ejecución.

---

## 0. Regla de ejecución entre tareas (obligatoria)

Después de implementar **cada tarea** (cada checkbox de nivel `- [ ]` con encabezado `### Tarea …`), **antes de pasar a la siguiente**, completar el siguiente ritual sobre los cambios introducidos por esa tarea:

1. **Review** — releer todos los archivos modificados/creados, mirar el diff (`git status` + `git diff`), confirmar que no hay cambios fuera de alcance ni archivos accidentales.
2. **Analizar los cambios** — verificar que coinciden con la tarea (RF/RNF del PRD, contrato definido en el plan técnico) y con las reglas del repo (`core.mdc`, `privacy.mdc`, `dependency-security.mdc`). Confirmar que no se introdujeron `any`, default exports, secretos en código, ni lógica de negocio en `api/`.
3. **Buscar errores** — pasar `tsc --noEmit` (o el script de typecheck disponible) y el linter del proyecto sobre los archivos tocados. Revisar a ojo posibles regresiones en imports, tipos, paths y `_generated/`.
4. **Corregir** — arreglar todo lo detectado en los pasos 1–3 antes de avanzar. No se acepta "lo arreglo después".
5. **Testear** — correr los tests Vitest relevantes a esa tarea (los nuevos/modificados como mínimo). Si la tarea toca el server end-to-end, smoke con `npm run dev:api` o `vercel dev` cuando aplique.

Cada tarea repite este ritual como sub-checklist (`- [ ] Review / Analizar / Errores / Corregir / Testear`). **No marcar una tarea completa hasta que sus 5 sub-items estén marcados.**

Excepciones explícitas (no relajan la regla, solo la aterrizan):

- En tareas puramente de **tipos compartidos** o **constantes**, "Testear" se cumple con `tsc --noEmit` + tests existentes pasando.
- En tareas de **docs/cleanup**, "Testear" se cumple con build/lint del repo verde.
- En la tarea de **smoke local**, los pasos 1–4 se aplican igual a cualquier ajuste menor que surja durante el smoke.

---

## Fase 1 — Schema y funciones Convex

Mapea a §1 del plan técnico (`convex-schema`).

### Tarea 1.1 — Definir tabla `riddles` y funciones server

- [x] Editar `convex/schema.ts` con la tabla `riddles` (campos PRD §3.1) e índices `by_lookup` (`iso2`, `tag`, `locale`) y `by_origin` (`source.origin`, `createdAt`).
- [x] Crear `convex/riddles.ts` con `listByLookup` (query) e `insert` (mutation). Sin lógica de negocio.
- [x] Regenerar `convex/_generated/` (`npm run convex:dev` una vuelta) y commitear `api.d.ts` y `dataModel.d.ts` (regla `convex-setup/` §5).
- [x] Verificar manualmente desde el Convex Dashboard que `listByLookup`/`insert` se ven correctamente y que un insert+list de prueba funciona.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Fase 2 — Contrato compartido (tipos y errores)

Mapea a §2 + §3.8 del plan técnico (`shared-types`).

### Tarea 2.1 — Extender `shared/ai-trivia-api.ts`

- [x] Añadir `riddleId: string` (obligatorio) a `AiPromptItem`.
- [x] Añadir `excludedIds?: readonly string[]` a `AiPromptsRequest`.
- [x] Añadir `'CONVEX_UNAVAILABLE'` a `AiPromptsApiErrorCode` y mapear a HTTP `503` en `aiPromptsErrorHttpStatus`.
- [x] Confirmar que el cliente y los tests existentes siguen compilando (algunos romperán a propósito; documentar cuáles tocan en fases siguientes).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Fase 3 — Puerto y adaptadores `RiddleRepository`

Mapea a §3.1–§3.4 del plan técnico (`repo-port-inmemory`, `repo-convex`, `repo-l1`).

### Tarea 3.1 — Puerto + adaptador in-memory + tests

- [x] Crear `server/prompts/riddle-repository.ts` con `StoredRiddle`, `StoredRiddleSource`, `FindRandomVariantInput/Outcome`, `SaveRiddleInput`, `RiddleRepository`.
- [x] Crear `server/prompts/riddle-repository-in-memory.ts` (Map por clave `iso2|tag|locale`, `id` opaco `mem-${counter}`, filtra `excludedIds`).
- [x] Crear `server/prompts/riddle-repository-in-memory.test.ts` (Vitest): `save`→`findRandomVariant`, respeta `excludedIds`, múltiples variantes, distribución con `random` mockeado.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 3.2 — Adaptador Convex

- [x] Crear `server/prompts/riddle-repository-convex.ts` usando `ConvexHttpClient`, `Doc<'riddles'>` e `Id<'riddles'>` desde `convex/_generated/`.
- [x] `findRandomVariant`: query → filtrar `excludedIds` → pick aleatorio → `{ kind: 'hit', layer: 'l2' }` o `{ kind: 'miss' }`. Cualquier throw → `{ kind: 'unavailable' }`.
- [x] `save`: mutation `insert`; mapear `Id<'riddles'>` a `StoredRiddle.id` (string opaco). Errores propagan al orquestador.
- [x] Sin tests unit (decisión consciente del plan §7); cubierto por smoke local en Fase 7.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 3.3 — Decorador L1 (in-memory write-through) + tests

- [x] Crear `server/prompts/riddle-repository-l1.ts` (`createRiddleRepositoryWithL1(inner)`): hit local devuelve `layer: 'l1'`, en miss delega a `inner` y popula L1 si éste devuelve `hit`. `save` write-through.
- [x] Sin TTL (D6); muere con el proceso.
- [x] Crear `server/prompts/riddle-repository-l1.test.ts` (Vitest): hit local sin tocar inner, populate L1 tras hit del inner, write-through en `save`, `unavailable` no popula L1.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Fase 4 — Wiring de dependencias y constantes server

Mapea a §3.5, §3.6 y §3.8 del plan técnico (`wire-deps`).

### Tarea 4.1 — Constantes server

- [x] En `server/prompts/ai-trivia-constants.ts`: añadir `AI_TRIVIA_VALIDATION_VERSION = 1` y `MAX_EXCLUDED_IDS = 500`.
- [x] Marcar `AI_TRIVIA_CACHE_TTL_MS` con `@deprecated` en JSDoc; **no** se borra todavía (lo hace Fase 9).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 4.2 — Tipos `GenerateAiPromptsDeps` y wiring

- [x] En `server/prompts/prompts-deps.ts`: reemplazar `cache: AiTriviaCache` por `riddleRepository: RiddleRepository`. Mantener `AiTriviaCache`/`AiTriviaCacheKey` exportados durante la migración (los borra Fase 9).
- [x] En `server/prompts/create-default-prompts-deps.ts`: quitar `createAiTriviaCache`; crear `sharedRepository` componiendo `createRiddleRepositoryWithL1(createRiddleRepositoryConvex({ convexUrl: process.env.CONVEX_URL }))`.
- [x] Si `CONVEX_URL` falta, lanzar error claro (`Missing CONVEX_URL`) en el primer uso para diagnóstico explícito en local.
- [x] Actualizar `resetDefaultPromptsDepsForTests()` para resetear el repo compartido.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Fase 5 — Orquestación y métricas

Mapea a §3.7 y §3.9 del plan técnico (`refactor-generate`).

### Tarea 5.1 — Refactor `generate-ai-prompts.ts`

- [x] Sustituir `deps.cache.get(...)` por `deps.riddleRepository.findRandomVariant({ iso2, tag, locale, excludedIds, random })`.
- [x] `outcome.kind === 'unavailable'` → cortocircuito todo el batch con `aiPromptsFailure('CONVEX_UNAVAILABLE', ...)`.
- [x] `outcome.kind === 'hit'` → mapear `StoredRiddle` → `AiPromptItem` (incluye `riddleId`); emitir `cache_hit_l1` o `cache_hit_l2` según `outcome.layer`.
- [x] `outcome.kind === 'miss'` → flujo LLM + V1–V8 actual; tras OK, llamar `deps.riddleRepository.save({ ..., llmProvider, validationVersion: AI_TRIVIA_VALIDATION_VERSION, createdAt: deps.now() })`. La URL Wikipedia se calcula en `save` o justo antes (regla actual de `buildAiPromptItem`).
- [x] Construir `AiPromptItem` con `riddleId`; **no** incluir `justification` ni `origin` (RNF-S12).

### Tarea 5.2 — Métricas en `ai-trivia-logger.ts`

- [x] Reemplazar `recordCacheHit` por `recordCacheHitL1` / `recordCacheHitL2` (RNF-T10).
- [x] Añadir `recordConvexError(code)`.
- [x] Mantener `recordCacheMiss`.

### Tarea 5.3 — Tests del orquestador

- [x] Reescribir parcialmente `generate-ai-prompts.test.ts` para cubrir: hit L2 sin llamar al LLM; miss + `repo.save` (verifica `validationVersion: 1`, `llmProvider`, `createdAt`); `excludedIds` agota variantes → cae al LLM; `unavailable` → `CONVEX_UNAVAILABLE` 503.
- [x] Extender (o crear) `ai-trivia-logger.test.ts` para `cache_hit_l1`, `cache_hit_l2`, `cache_miss`, `convex_errors`.

Ritual obligatorio (§0) — aplicado al conjunto de la fase 5:

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Fase 6 — Validación del request

Mapea a §2 del plan técnico (`validate-request`).

### Tarea 6.1 — `validate-ai-prompts-request.ts`

- [x] `excludedIds` opcional; si presente, debe ser `string[]`.
- [x] `excludedIds.length <= MAX_EXCLUDED_IDS` (`= 500`); si no → `400 INVALID_REQUEST`.
- [x] Cada id: `typeof === 'string'`, no vacío, `length <= 64`; si no → `400 INVALID_REQUEST`.
- [x] Dedupe interno a `Set<string>` (no falla por duplicados).
- [x] Extender `validate-ai-prompts-request.test.ts` con todos los casos anteriores.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Fase 7 — Frontend (dedupe + cliente + pool)

Mapea a §5 del plan técnico (`frontend-seen-ids`, `frontend-client`, `frontend-pool`).

### Tarea 7.1 — Servicio `ai-trivia-seen-ids` + tests

- [x] Crear `src/services/ai-trivia-seen-ids.ts` con `getSeenRiddleIds(locale)`, `addSeenRiddleId(locale, id)`, `clearSeenRiddleIds(locale)`. Cap 500, namespace por locale, `try/catch` defensivo (SSR / modo privado / quota llena).
- [x] Crear `src/services/ai-trivia-seen-ids.test.ts` (Vitest jsdom): get vacío, add+get, dedupe, cap 500, locale separa namespace, JSON corrupto → `[]`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 7.2 — Cliente HTTP `prompts-api-client`

- [x] Extender `FetchAiPromptsInput` con `excludedIds?: readonly string[]`.
- [x] En el body del POST: incluir `excludedIds` solo si tiene `length > 0`.
- [x] En `parseItem`: requerir `record.riddleId` string no vacía; rechazar item sin `riddleId` (RF-I10).
- [x] Actualizar `prompts-api-client.test.ts`: envía `excludedIds` cuando hay, parsea `riddleId`, rechaza item sin `riddleId`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 7.3 — Pool, Round y call site

- [x] En `src/services/map-ai-items-to-pool.ts`: propagar `riddleId` como `aiRiddleId?: string` al `QuestionPoolItem`.
- [x] En `src/services/build-question-pool.ts` y tipos de `Round`: añadir `aiRiddleId?: string`; propagar opcionalmente.
- [x] En el call site de `fetchAiPrompts` (probablemente `src/services/game-session-service.ts`): pasar `excludedIds: getSeenRiddleIds(locale)` y, tras éxito, iterar `data.items` y llamar `addSeenRiddleId(locale, item.riddleId)` **antes** de armar el pool.
- [x] Extender `map-ai-items-to-pool.test.ts` para verificar propagación de `aiRiddleId`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

---

## Fase 8 — Tests e2e y smoke local

Mapea a §6 / §7 del plan técnico (`tests-e2e`, `smoke-local`).

### Tarea 8.1 — Playwright e2e

- [x] Actualizar fixtures de `e2e/ai-trivia-flow.spec.ts` con `riddleId` en cada item.
- [x] Añadir test que verifica que un segundo request envía `excludedIds` con el `riddleId` del primero (mock route intercepta y assertea el body).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 8.2 — Smoke local prod-like

> **Pendiente** — se ejecuta tras commit, antes (o como parte) de Fase 2 de deploy. Ver detalles operativos en [`03-deploy-fase-2.md`](./03-deploy-fase-2.md) §3.

- [ ] Levantar `npm run convex:dev` (Terminal 1) + `npm run dev:api` o `vercel dev` (Terminal 2) con `CONVEX_URL` apuntando al deployment de dev.
- [ ] Insert/list manuales desde el Dashboard para confirmar shape.
- [ ] Hacer 2 requests al endpoint `POST /api/v1/prompts/generate` para el mismo `(iso2, tag, locale)` cuando hay ≥ 2 variantes en Convex; el 2do envía `excludedIds` con el `riddleId` del 1ro y devuelve **otro** `riddleId`.
- [ ] Probar caso `unavailable`: con `CONVEX_URL` vacía o inválida, el handler responde `503 CONVEX_UNAVAILABLE`.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

---

## Fase 9 — Cleanup, docs y deploy notes

Mapea a §8 del plan técnico (`cleanup`).

### Tarea 9.1 — Borrar caché legacy

- [x] Borrar `server/prompts/ai-trivia-cache.ts` y `server/prompts/ai-trivia-cache.test.ts`.
- [x] Quitar `AiTriviaCache` y `AiTriviaCacheKey` de `server/prompts/prompts-deps.ts` (cuando ya no haya consumidores).
- [x] Quitar `AI_TRIVIA_CACHE_TTL_MS` de `ai-trivia-constants.ts`.
- [x] Confirmar que no quedan imports rotos (`tsc --noEmit` y tests verdes).

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 9.2 — Documentación de la feature

- [x] Actualizar `.env.example` con notas sobre `CONVEX_URL` y `CONVEX_DEPLOY_KEY` (RF-I11).
- [x] Añadir link a este PRD en `convex-setup/00-entorno-convex-vercel.md` §6.
- [x] Actualizar `README.md` de la carpeta `riddle-storage-convex/` para reflejar el estado real (fase implementada / pendiente).
- [x] Actualizar el índice padre `docs/tasks/backend-related-features/README.md` con el estado real de `riddle-storage-convex/`.
- [x] Crear `03-deploy-fase-2.md` (plantilla operativa para 9.3) replicando el patrón de `modo-ai-trivia/03-deploy-fase-2.md`.

Ritual obligatorio (§0):

- [x] Review
- [x] Analizar los cambios
- [x] Buscar errores
- [x] Corregir
- [x] Testear

### Tarea 9.3 — Deploy notes (no toca código del feature)

> **Pendiente** — depende de push a `main` + deploy preview/prod en Vercel. El checklist operativo vive en [`03-deploy-fase-2.md`](./03-deploy-fase-2.md); marcar checkboxes acá una vez ejecutados los pasos de ese doc.

- [ ] Verificar que **Vercel Build Command** sea `npx convex deploy --cmd 'npm run build'` (RF-B66; ya documentado en `convex-setup/` §4).
- [ ] Confirmar que `CONVEX_URL` y `CONVEX_DEPLOY_KEY` están en Vercel **Preview** y **Production** apuntando al deployment **prod** de Convex (no al `dev:unique-echidna-841`).
- [ ] Smoke HTTPS post-deploy: 2 requests con `excludedIds` devuelven `riddleId` distintos cuando hay ≥ 2 variantes.

Ritual obligatorio (§0):

- [ ] Review
- [ ] Analizar los cambios
- [ ] Buscar errores
- [ ] Corregir
- [ ] Testear

---

## Anexo — Mapeo rápido a tasks del plan técnico

| Fase | Tarea(s) | id en `*.plan.md` (frontmatter `todos`) |
|------|----------|------------------------------------------|
| 1 | 1.1 | `convex-schema` |
| 2 | 2.1 | `shared-types` |
| 3 | 3.1 / 3.2 / 3.3 | `repo-port-inmemory` / `repo-convex` / `repo-l1` |
| 4 | 4.1 / 4.2 | `wire-deps` |
| 5 | 5.1 / 5.2 / 5.3 | `refactor-generate` |
| 6 | 6.1 | `validate-request` |
| 7 | 7.1 / 7.2 / 7.3 | `frontend-seen-ids` / `frontend-client` / `frontend-pool` |
| 8 | 8.1 / 8.2 | `tests-e2e` / `smoke-local` |
| 9 | 9.1 / 9.2 / 9.3 | `cleanup` |
