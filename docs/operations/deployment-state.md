# Estado del deployment (snapshot operativo)

**Última actualización:** 2026-05-27  
**Audiencia:** operador del proyecto (Vercel + Convex + modo AI trivia).  
**Sin secretos:** no incluir API keys ni deploy keys en este documento.

Referencias detalladas: [`../tasks/backend-related-features/convex-setup/00-entorno-convex-vercel.md`](../tasks/backend-related-features/convex-setup/00-entorno-convex-vercel.md), [`../tasks/backend-related-features/riddle-storage-convex/03-deploy-fase-2.md`](../tasks/backend-related-features/riddle-storage-convex/03-deploy-fase-2.md).

---

## Frontend + API (Vercel)

| Pieza | Valor / nota |
|-------|----------------|
| Proyecto | `the-map-world-game-2026` (team `leo-mol-s-projects`) |
| Production URL | `https://the-map-world-game-2026.vercel.app` |
| Build Command | `npx convex deploy --typecheck=disable --cmd 'npm run build'` |
| Runtime API | Vercel Functions en `api/`; lógica en `server/` |

### Env vars en Vercel (Production)

| Variable | Rol |
|----------|-----|
| `CONVEX_URL` | URL del deployment **prod** de Convex (runtime server) |
| `CONVEX_DEPLOY_KEY` | Solo build (`npx convex deploy`); Marketplace |
| `GEMINI_API_KEY` | LLM modo AI trivia (servidor) |
| `ALLOWED_ORIGINS` | CORS; debe incluir el origen exacto del front |
| `VITE_API_BASE_URL` | Build Vite; base URL del cliente HTTP |
| `RATE_LIMIT_*` | Rate limit en endpoints públicos |

---

## Convex

| Deployment | Slug | Tipo | Uso |
|------------|------|------|-----|
| Prod | `standing-fox-900` | prod | **Catálogo compartido** + Vercel Production/Preview (`CONVEX_URL`) |
| Dev | `unique-echidna-841` | dev | Iteración local de schema/funciones (`npm run convex:dev`); **no** es el catálogo de producción |

**Proyecto Convex:** `convex-country-riddles` (team `leo-mol-s-projects`).

Schema y funciones en prod (desde 2026-05-27): tabla `riddles` (índices `by_lookup`, `by_origin`), `convex/riddles.ts`, `convex/ping.ts`.

---

## LLM (modo AI trivia)

| Pieza | Valor |
|-------|-------|
| Proveedor | Gemini REST |
| Modelo por defecto | `gemini-3.1-flash-lite` |
| Env servidor | `GEMINI_API_KEY` |
| Local sin costo | `USE_FAKE_LLM=1` (no usar en Production) |

---

## Decisiones de operación

1. **Un solo catálogo de riddles:** local (`vercel dev`) y Production apuntan al deployment Convex **prod** (`standing-fox-900`) vía `CONVEX_URL`. Así los riddles generados en dev sirven en prod sin duplicar llamadas a Gemini.
2. **Deployment dev de Convex:** solo para sincronizar cambios de `convex/` con `npm run convex:dev`; los datos de riddles en dev no se usan como fuente de verdad.
3. **`--typecheck=disable` en build:** el typecheck de Convex CLI duplicaba el de `tsc -b` y emitía falsos errores de narrowing en unions (`AiPromptsResult`, etc.). La validación real sigue en `npm run build` → `tsc -b`.
4. **Frontend no llama Convex:** Opción 1 del ADR; solo `server/` usa `ConvexHttpClient`.

---

## Cambios habituales

| Qué cambiar | Dónde |
|-------------|--------|
| Schema o funciones Convex | Editar `convex/` → push a `main` (build en Vercel ejecuta `convex deploy`) o `npx convex deploy` manual |
| `CONVEX_URL`, `GEMINI_API_KEY`, CORS | Vercel → Settings → Environment Variables → redeploy |
| Rotar `GEMINI_API_KEY` | Google AI Studio → actualizar Vercel + `.env.local` |
| Build Command | Vercel → Settings → Build & Development Settings |

---

## Smoke rápido (Production)

```bash
curl -sS -X POST 'https://the-map-world-game-2026.vercel.app/api/v1/prompts/generate' \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"iso2":"AR"}],"tags":["historia"],"locale":"es"}'
```

| Respuesta | Significado |
|-----------|-------------|
| `200` + `items[].riddleId` | OK (Convex + Gemini) |
| `503 CONVEX_UNAVAILABLE` | Revisar `CONVEX_URL` o funciones no desplegadas en prod |
| `503 LLM_UNAVAILABLE` | Falta o inválida `GEMINI_API_KEY` |
| CORS en preview | Origen del preview no está en `ALLOWED_ORIGINS`, o preview llama a API de prod con origen distinto |
