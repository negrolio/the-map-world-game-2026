# Modo AI trivia — Deploy Fase 2

**Audiencia:** operador humano del proyecto Vercel.
**Estado:** ready (la lógica está implementada y probada; este checklist sólo guía la activación en preview/production).
**Referencias:** [`02-plan-implementacion-modo-ai-trivia.md`](./02-plan-implementacion-modo-ai-trivia.md) §10, [`.cursor/rules/privacy.mdc`](../../../../.cursor/rules/privacy.mdc), [`.cursor/rules/dependency-security.mdc`](../../../../.cursor/rules/dependency-security.mdc).

Esta guía cubre el lote **L9 — Fase 2** del plan: activar el rate limit reusado, configurar env vars sensibles en Vercel, validar HTTPS end-to-end, y dejar las métricas listas para inspección.

---

## 1. Estado de la implementación (lo que ya está en `main`)

| Capa | Estado |
|------|--------|
| `applyPromptsRateLimitIfNeeded` registrado en [`api/v1/prompts/generate.ts`](../../../../api/v1/prompts/generate.ts) | Activo. Respeta `RATE_LIMIT_DISABLED=1`. |
| Bucket dedicado `prompts:${ip}` en [`api/_lib/apply-prompts-rate-limit.ts`](../../../../api/_lib/apply-prompts-rate-limit.ts) | Implementado. |
| Logger `ai_trivia.*` sin PII en [`server/prompts/ai-trivia-logger.ts`](../../../../server/prompts/ai-trivia-logger.ts) | Implementado. Emite por `console.log` si `AI_TRIVIA_METRICS_LOG=1`. |
| Smoke local "no hay secretos en bundle" en [`scripts/check-no-secrets-in-bundle.mjs`](../../../../scripts/check-no-secrets-in-bundle.mjs) | Ejecutable manualmente o desde CI con `node scripts/check-no-secrets-in-bundle.mjs`. |
| CORS lee `ALLOWED_ORIGINS` desde env (POST incluido) | Implementado en [`api/_lib/cors.ts`](../../../../api/_lib/cors.ts). |

Por lo tanto **no hay código pendiente**. Lo único que queda es configuración del proyecto en Vercel.

---

## 2. Checklist de configuración en Vercel (L9-1 + L9-2)

> Hacerlo por dashboard o `vercel env add ...`. Nunca commitear valores.

1. **`GEMINI_API_KEY`** (Production + Preview): clave de Google AI Studio.
   - Si se omite, el handler responde `LLM_UNAVAILABLE` (no rompe nada).
   - **No** marcarla como expuesta al cliente. **No** copiarla en variables `VITE_*`.
2. **`ALLOWED_ORIGINS`** (Production + Preview): lista separada por comas con el origen del frontend de producción (ej. `https://thismapworld.com,https://www.thismapworld.com`).
3. **`USE_FAKE_LLM`** (Preview opcional, Production = NO): si se setea `1`, fuerza el adaptador fake. Útil para una preview de demo sin gastar cupos.
4. **`RATE_LIMIT_DISABLED`** (Production = NO): asegurarse que **no** esté definida en production para que `applyPromptsRateLimitIfNeeded` se mantenga activo.
5. **`AI_TRIVIA_METRICS_LOG`** (Preview/Production opcional): `1` solo para hacer una pasada de inspección de métricas en `vercel logs`. Sin overhead notable, pero apagarla en estado estable.

Variables ya existentes que **no** hay que cambiar para el modo AI:

- `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`: el bucket `prompts:` hereda el mismo límite que `learn/`. Si se necesita un cupo distinto, ver §4.

---

## 3. Smoke HTTPS post-deploy

Después del primer deploy con `GEMINI_API_KEY` configurada:

```bash
# 1. Health: confirmar que el endpoint responde sin crash.
curl -i -X POST "https://thismapworld.com/api/v1/prompts/generate" \
  -H 'Content-Type: application/json' \
  -H "Origin: https://thismapworld.com" \
  --data '{"items":[{"iso2":"AR"}],"tags":[],"locale":"es"}'

# Esperado: 200 con { "items": [...] } o, si Gemini todavía no se configuró,
# 503 con { "error": { "code": "LLM_UNAVAILABLE", ... } }. NUNCA 500.

# 2. Validación de body: sin items → 400 INVALID_REQUEST.
curl -i -X POST "https://thismapworld.com/api/v1/prompts/generate" \
  -H 'Content-Type: application/json' \
  -H "Origin: https://thismapworld.com" \
  --data '{"items":[],"tags":[],"locale":"es"}'

# 3. CORS: una request preflight con un Origin no permitido debe omitir el
# header Access-Control-Allow-Origin (o devolverlo vacío).
curl -i -X OPTIONS "https://thismapworld.com/api/v1/prompts/generate" \
  -H 'Origin: https://malicious.test' \
  -H 'Access-Control-Request-Method: POST'

# 4. Rate limit: ejecutar la primera curl en bucle (por ejemplo 70 veces si
# RATE_LIMIT_MAX=60) y confirmar que alguna respuesta sea 429 con header
# `Retry-After`.
for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    "https://thismapworld.com/api/v1/prompts/generate" \
    -H 'Content-Type: application/json' \
    -H "Origin: https://thismapworld.com" \
    --data '{"items":[{"iso2":"AR"}],"tags":[],"locale":"es"}'
done | sort | uniq -c
# Esperado: una mezcla de 200/503 hasta llegar a 429.
```

Adicionalmente, antes de publicar:

```bash
# Build local + smoke de que la clave nunca llega al cliente.
npm run build
node scripts/check-no-secrets-in-bundle.mjs
# Debe imprimir: [check-no-secrets-in-bundle] OK ... no forbidden terms found
```

---

## 4. Revisión inicial de métricas `ai_trivia.*` (L9-3)

Con `AI_TRIVIA_METRICS_LOG=1` cada evento se imprime como JSON en stdout. En `vercel logs` se pueden filtrar:

```bash
vercel logs --since=1h | rg 'ai_trivia'
```

Eventos relevantes para vigilar la primera semana:

| Evento (`kind`) | Qué indica |
|-----------------|-----------|
| `cache_hit` / `cache_miss` | Eficacia del cache TTL. Apuntar a >50 % de hits tras 1–2 días con tráfico real. |
| `llm_request` | Volumen real de llamadas al proveedor + número de items por request. Útil para calcular costo. |
| `validation_failure` | Tasa de fallos por regla (V1–V8). Un pico de V6 indica problemas de grounding (Wikipedia no menciona el país). Un pico de V2 indica que el LLM "se sopla" la respuesta. |

Si alguna regla supera un fail-ratio sostenido > 30 %, abrir una task para ajustar el prompt o el catálogo de tags. **No** activar `RATE_LIMIT_DISABLED=1` para mitigar — siempre preferir corregir el blueprint.

> **Importante (RNF-T07 / privacy.mdc):** el logger no debe ser ampliado para incluir `riddle`, `justification`, o respuesta cruda del proveedor. Cualquier debugging temporal con esos datos debe ir en una rama feature aislada y revertirse antes del merge.

---

## 5. Rollback

- Si el modo AI falla en producción y bloquea el resto, basta con setear `GEMINI_API_KEY=` (vacío) o eliminar la variable: el handler devolverá `LLM_UNAVAILABLE`, el frontend muestra `AiPromptsErrorView`, y los modos `country` / `capital` siguen sin cambios.
- Para apagar por completo el endpoint (último recurso), agregar una redirección 410 en `vercel.ts` apuntando `/api/v1/prompts/generate` a un response inmediato. Documentar en la incidencia antes de hacerlo.

---

## 6. Cierre

Cuando los pasos §2 y §3 se completen y los logs muestren métricas razonables durante 48 h, marcar L9 como `completed` en el tablero y archivar este documento como referencia operativa.
