# Persistencia riddles en Convex — Deploy Fase 2

**Audiencia:** operador humano del proyecto Vercel + Convex.
**Estado:** ready (Fases 1–7 + 8.1 + 9.1–9.2 del plan están en `main`; este checklist guía la activación en preview/production).
**Referencias:** [`02-plan-implementacion-riddle-storage-convex.md`](./02-plan-implementacion-riddle-storage-convex.md) Tareas 8.2 y 9.3, [`01-prd-riddle-storage-convex.md`](./01-prd-riddle-storage-convex.md) §8 Fase 2 y §5.4 RNF-T10, [`../convex-setup/00-entorno-convex-vercel.md`](../convex-setup/00-entorno-convex-vercel.md), [`../../../operations/deployment-state.md`](../../../operations/deployment-state.md), [`.cursor/rules/privacy.mdc`](../../../../.cursor/rules/privacy.mdc), [`.cursor/rules/dependency-security.mdc`](../../../../.cursor/rules/dependency-security.mdc).

Esta guía cubre las **Tareas 8.2 (smoke local prod-like)** y **9.3 (deploy notes)** del plan: arrancar Convex en local y verificar que la persistencia de riddles + `excludedIds` funcionan end-to-end, configurar las env vars en Vercel, hacer el deploy y validar HTTPS.

---

## 1. Estado de la implementación (lo que ya está en `main`)

| Capa | Estado |
|------|--------|
| Tabla `riddles` + índices `by_lookup` / `by_origin` en [`convex/schema.ts`](../../../../convex/schema.ts); queries/mutations en [`convex/riddles.ts`](../../../../convex/riddles.ts) | Implementado (Tarea 1.1). `convex/_generated/` commiteado. |
| Puerto `RiddleRepository` + adaptadores in-memory / Convex / L1 en `server/prompts/riddle-repository*.ts` | Implementado (Tareas 3.1–3.3). Tests Vitest verdes. |
| Wiring por env en [`server/prompts/create-default-prompts-deps.ts`](../../../../server/prompts/create-default-prompts-deps.ts) (L1 ⨯ Convex) | Implementado (Tarea 4.2). Falla explícito con `Missing CONVEX_URL` si no está la env. |
| `generate-ai-prompts` usa `RiddleRepository`; emite `cache_hit_l1` / `cache_hit_l2` / `cache_miss` / `convex_errors` | Implementado (Tareas 5.1–5.3). |
| Request acepta `excludedIds` (cap 500); `AiPromptItem` devuelve `riddleId`; nuevo código `CONVEX_UNAVAILABLE` (503) | Implementado (Tareas 2.1, 6.1). |
| Frontend: `ai-trivia-seen-ids` (`localStorage`, cap 500, namespace por locale) + cliente HTTP propaga `excludedIds` + pool propaga `aiRiddleId` | Implementado (Tareas 7.1–7.3). |
| Playwright e2e con fixtures `riddleId` y assertion de `excludedIds` en el segundo request | Implementado (Tarea 8.1). |
| Caché legacy (`ai-trivia-cache.ts`, `AI_TRIVIA_CACHE_TTL_MS`) borrada | Hecho (Tarea 9.1). |
| `.env.example`, `convex-setup/00-entorno-convex-vercel.md` §6 e índice padre actualizados | Hecho (Tarea 9.2). |

**No hay código pendiente para la feature.** Lo que queda es smoke local + activación en Vercel + smoke HTTPS.

---

## 2. Tarea 8.2 — Smoke local prod-like (antes de pushear, recomendado)

> Si el push ya disparó el deploy preview, igual conviene hacer este smoke en local para acortar el ciclo de diagnóstico si algo falla en HTTPS.

### 2.1 Prerrequisitos en `.env.local`

Confirmar que existen (sin commitear):

```bash
CONVEX_DEPLOYMENT=dev:unique-echidna-841
# Catálogo compartido con prod (recomendado):
CONVEX_URL=https://standing-fox-900.convex.cloud
GEMINI_API_KEY=<key real o vacía para forzar LLM_UNAVAILABLE>
```

> Ver decisión de catálogo único en [`../../../operations/deployment-state.md`](../../../operations/deployment-state.md) §Decisiones de operación.

### 2.2 Levantar el stack

```bash
# Terminal 1 — sincroniza convex/ con el deployment dev
npm run convex:dev

# Terminal 2 — API Vercel + carga .env.local en api/
npm run dev:api   # equivalente a `vercel dev` con env local
```

Verificar Convex desde el Dashboard ([unique-echidna-841](https://dashboard.convex.dev/d/unique-echidna-841)):

```bash
# Smoke base del deployment
npx convex run ping:health
# Esperado: { ok: true }

# Insert manual para popular catálogo (opcional, para evitar tocar Gemini)
# Se puede hacer desde el Dashboard → Functions → riddles:insert con un objeto
# que respete el shape de StoredRiddle.
```

### 2.3 Casos de aceptación

```bash
# 1. Cache miss: primer request gatilla LLM + valida + persiste en Convex.
curl -i -X POST "http://localhost:3000/api/v1/prompts/generate" \
  -H 'Content-Type: application/json' \
  --data '{"items":[{"iso2":"AR"}],"tags":["historia"],"locale":"es"}'

# Esperado: 200 con { items: [{ riddleId: "...", iso2: "AR", riddle: "...", source: { title, locale, url } }] }
# Logs: ai_trivia.cache_miss + ai_trivia.llm_request + (eventual) ai_trivia.validation_failure.

# 2. Cache hit L1 (mismo proceso): repetir la misma request sin reiniciar `vercel dev`.
# Esperado: 200 con riddleId potencialmente igual al anterior; log ai_trivia.cache_hit_l1 y
# SIN llamada al LLM.

# 3. Dedupe con excludedIds: repetir pidiendo que excluya el primer riddleId.
RIDDLE_ID_1=<copiar de la respuesta anterior>
curl -i -X POST "http://localhost:3000/api/v1/prompts/generate" \
  -H 'Content-Type: application/json' \
  --data "{\"items\":[{\"iso2\":\"AR\"}],\"tags\":[\"historia\"],\"locale\":\"es\",\"excludedIds\":[\"$RIDDLE_ID_1\"]}"

# Esperado (si hay ≥ 2 variantes para AR/historia/es en Convex): 200 con otro riddleId.
# Si solo hay 1 variante: el server vuelve a gatillar LLM, valida e inserta una nueva fila
# en Convex (segundo riddleId distinto del primero).

# 4. CONVEX_UNAVAILABLE: matar Terminal 1 (Convex dev) o exportar
#    `CONVEX_URL=https://invalid.invalid` y reintentar el primer curl.
# Esperado: 503 con { error: { code: "CONVEX_UNAVAILABLE", ... } }; log ai_trivia.convex_errors.

# 5. Validación request: excludedIds con > 500 ids o id con length > 64 → 400 INVALID_REQUEST.
```

Smoke adicional antes de pushear:

```bash
npm run build
node scripts/check-no-secrets-in-bundle.mjs
# Esperado: OK; CONVEX_URL no debe aparecer en dist/ (es server-only).
```

Cuando todos estos casos pasen, marcar los checkboxes de **Tarea 8.2** en [`02-plan-implementacion-riddle-storage-convex.md`](./02-plan-implementacion-riddle-storage-convex.md).

---

## 3. Tarea 9.3 — Checklist de configuración en Vercel

> Hacerlo por dashboard o `vercel env add ...`. Nunca commitear valores.

### 3.1 Build Command

En **Vercel → Settings → Build & Development Settings**, confirmar:

```bash
npx convex deploy --typecheck=disable --cmd 'npm run build'
```

(Ya documentado en [`../convex-setup/00-entorno-convex-vercel.md`](../convex-setup/00-entorno-convex-vercel.md) §4. Con `riddles` en uso es **obligatorio**.)

**Nota `--typecheck=disable`:** el CLI de Convex corre un typecheck propio sobre `api/` + `server/` con defaults distintos a `tsconfig.api.json`. Eso generaba líneas `error TS2339` en los build logs de Vercel aunque `npm run build` (`tsc -b`) pasara bien. Desactivarlo no relaja la calidad: el proyecto ya typechequea en `tsc -b` antes de `vite build`.

### 3.2 Variables de entorno (Preview + Production)

| Variable | Origen | Notas |
|----------|--------|-------|
| `CONVEX_URL` | Convex Dashboard → deployment **prod** del proyecto `convex-country-riddles` → *Deployment URL* | `https://....convex.cloud`. **No** el `unique-echidna-841` (ese es dev). Solo servidor; nunca `VITE_*`. |
| `CONVEX_DEPLOY_KEY` | Provisionada por Vercel Marketplace | Solo build (`npx convex deploy`). Verificar `npx vercel env ls` lista la variable. |
| `CONVEX_DEPLOYMENT` | Convex Dashboard | Opcional (`prod:<slug>`). |
| `GEMINI_API_KEY` | Heredada de modo AI trivia | Sin cambios; si falta → 503 `LLM_UNAVAILABLE`. |
| `ALLOWED_ORIGINS` | Heredada | Sin cambios. |
| `RATE_LIMIT_*` | Heredadas | Sin cambios; el bucket `prompts:` sigue activo. |
| `AI_TRIVIA_METRICS_LOG` | Opcional | `1` para inspeccionar `cache_hit_l1` / `cache_hit_l2` / `cache_miss` / `convex_errors` en `vercel logs`. |

> **Importante (privacy.mdc):** `CONVEX_URL` y `CONVEX_DEPLOY_KEY` van **solo** en envs de servidor. Nunca usar `VITE_CONVEX_*` para escribir riddles — el frontend no debe contactar Convex en v1.

---

## 4. Smoke HTTPS post-deploy

Después del primer deploy con `CONVEX_URL` configurada y la URL apuntando al **prod** Convex:

```bash
HOST="https://thismapworld.com"   # ajustar si es preview
ORIGIN="https://thismapworld.com"

# 1. Cache miss → save en Convex prod.
curl -i -X POST "$HOST/api/v1/prompts/generate" \
  -H 'Content-Type: application/json' \
  -H "Origin: $ORIGIN" \
  --data '{"items":[{"iso2":"AR"}],"tags":["historia"],"locale":"es"}'

# Esperado: 200 con { items: [{ riddleId, ... }] }. Si Gemini no está configurado: 503 LLM_UNAVAILABLE.
# Si Convex no está accesible: 503 CONVEX_UNAVAILABLE. NUNCA 500.

# 2. Dedupe HTTPS: segundo request con excludedIds del primero.
RIDDLE_ID_1=<copiar de la respuesta anterior>
curl -i -X POST "$HOST/api/v1/prompts/generate" \
  -H 'Content-Type: application/json' \
  -H "Origin: $ORIGIN" \
  --data "{\"items\":[{\"iso2\":\"AR\"}],\"tags\":[\"historia\"],\"locale\":\"es\",\"excludedIds\":[\"$RIDDLE_ID_1\"]}"

# Esperado: 200 con un riddleId DISTINTO al primero (si hay ≥ 2 variantes; si no, se persiste una nueva).

# 3. Validación: excludedIds con id de longitud 65 → 400 INVALID_REQUEST.
curl -i -X POST "$HOST/api/v1/prompts/generate" \
  -H 'Content-Type: application/json' \
  -H "Origin: $ORIGIN" \
  --data '{"items":[{"iso2":"AR"}],"tags":[],"locale":"es","excludedIds":["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]}'

# 4. Rate limit: el bucket `prompts:` sigue activo (heredado de modo AI trivia).
for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    "$HOST/api/v1/prompts/generate" \
    -H 'Content-Type: application/json' \
    -H "Origin: $ORIGIN" \
    --data '{"items":[{"iso2":"AR"}],"tags":[],"locale":"es"}'
done | sort | uniq -c
# Esperado: mezcla de 200/503 hasta llegar a 429 (depende de RATE_LIMIT_MAX).
```

Cuando los casos 1–3 pasen, marcar los checkboxes de **Tarea 9.3** en [`02-plan-implementacion-riddle-storage-convex.md`](./02-plan-implementacion-riddle-storage-convex.md).

---

## 5. Revisión inicial de métricas `ai_trivia.*` (RNF-T10)

Con `AI_TRIVIA_METRICS_LOG=1` cada evento se imprime como JSON en stdout. En `vercel logs`:

```bash
vercel logs --since=1h | rg 'ai_trivia'
```

Eventos nuevos a vigilar las primeras 24–48 h (Tarea 9.3):

| Evento (`kind`) | Qué indica |
|-----------------|-----------|
| `cache_hit_l1` | Hit en L1 in-memory del mismo proceso. Mientras la Function siga caliente (Fluid Compute), debería subir con tráfico. Si es 0 % siempre → revisar que el `sharedRepository` se está reutilizando entre invocaciones. |
| `cache_hit_l2` | Hit en Convex (query `listByLookup`). Mide cuántos riddles se sirven sin LLM. Esperar que crezca con el catálogo. |
| `cache_miss` | Trio `(iso2, tag, locale)` sin variantes elegibles tras filtrar `excludedIds`. Dispara LLM + `save`. |
| `convex_errors` | Excepciones del adaptador Convex. Si supera 1 % sostenido → revisar Convex Dashboard, cuotas free tier, `CONVEX_URL`. Cada error devuelve 503 `CONVEX_UNAVAILABLE` al cliente. |

Hereda de modo AI trivia (siguen vigentes):

| Evento | Sigue indicando |
|--------|-----------------|
| `llm_request` | Volumen real al proveedor + ítems por request. |
| `validation_failure{rule}` | Tasa de fallos por V1–V8. Picos en V6 = problemas de grounding. |

> **RNF-S11 / privacy.mdc:** el logger NO debe ser ampliado para incluir la lista completa de `excludedIds`, ni `riddle`, `justification`, o respuesta cruda del proveedor. Cualquier debugging temporal con esos datos debe ir en una rama feature aislada y revertirse antes del merge.

---

## 6. Rollback

Niveles de degradación (de menos a más invasivo):

1. **Convex caído / mal configurado.** El handler ya devuelve 503 `CONVEX_UNAVAILABLE` automáticamente. El frontend muestra `AiPromptsErrorView`; modos `country` / `capital` siguen sin tocar nada. **No requiere acción** salvo restaurar `CONVEX_URL` o esperar a que Convex se reponga.
2. **Apagar el modo AI temporalmente.** Setear `GEMINI_API_KEY=` (vacío) o eliminar la variable en Vercel → el handler responde `LLM_UNAVAILABLE`; cache hits L2 siguen funcionando (no llaman a Gemini), pero los miss devolverán 503. Útil si el coste/calidad del LLM se descontrolaron.
3. **Cortar `/api/v1/prompts/generate` por completo.** Último recurso: redirección 410 en `vercel.ts` apuntando esa ruta a un response inmediato. Documentar en la incidencia antes de hacerlo.
4. **Revertir la feature.** `git revert` del merge a `main` y redeploy. Atención: el código viejo asumía `cache: AiTriviaCache` (in-memory con TTL); volver a ese estado significa **perder** los riddles ya persistidos en Convex (no se borran del Dashboard, pero el server deja de leerlos). Si querés conservarlos para el siguiente intento, **no** revertir el schema Convex; solo el código del server.

---

## 7. Cierre

Cuando los pasos §3 y §4 se completen, los logs muestren métricas razonables durante 48 h y la tabla `riddles` en el deployment **prod** de Convex tenga datos reales:

- Marcar los checkboxes de **Tareas 8.2 y 9.3** en [`02-plan-implementacion-riddle-storage-convex.md`](./02-plan-implementacion-riddle-storage-convex.md).
- Actualizar el encabezado de [`./README.md`](./README.md) y de [`../README.md`](../README.md) de `cerrado en repo, pendiente deploy` a `cerrado`.
- Actualizar [`docs/requirements/04-current-state-post-mvp.mdc`](../../../requirements/04-current-state-post-mvp.mdc) §1 añadiendo "Persistencia riddles en Convex" como iteración cerrada.
- Archivar este documento como referencia operativa.
