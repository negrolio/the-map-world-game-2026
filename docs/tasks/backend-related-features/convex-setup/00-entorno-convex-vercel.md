# Convex + Vercel — entorno listo

**Proyecto Convex:** `convex-country-riddles` (team `leo-mol-s-projects`, Vercel Marketplace).  
**Dashboard dev:** [unique-echidna-841](https://dashboard.convex.dev/d/unique-echidna-841)  
**Deployment prod:** `standing-fox-900` → `https://standing-fox-900.convex.cloud`  
**Snapshot operativo (envs, build, decisiones):** [`../../../operations/deployment-state.md`](../../../operations/deployment-state.md)

Arquitectura acordada: **Opción 1** — lógica en Vercel Functions (`api/` + `server/`), Convex solo como almacén. El frontend **no** llama a Convex directamente.

---

## 1. Estado actual

| Pieza | Estado |
|-------|--------|
| `convex` en `package.json` | Instalado (`1.39.1`, `--ignore-scripts`) |
| Carpeta `convex/` | `schema.ts` (`riddles`), `riddles.ts`, `ping.ts`, `_generated/` commiteado |
| Deployment prod | `standing-fox-900` activo en Vercel (`CONVEX_URL` + build con `convex deploy`) |
| Deployment dev | `unique-echidna-841` — iteración local de schema/funciones (`npm run convex:dev`) |
| Vercel env | `CONVEX_URL`, `CONVEX_DEPLOY_KEY`, `GEMINI_API_KEY` (Production) |

---

## 2. Variables de entorno — mapa mental

| Variable | Dónde | Uso |
|----------|-------|-----|
| `CONVEX_DEPLOYMENT` | `.env.local` (dev) | CLI: `convex dev` / `convex deploy` |
| `VITE_CONVEX_URL` | `.env.local` (dev) | Generada por Convex para apps React; **no usamos** en v1 (Opción 1) |
| `VITE_CONVEX_SITE_URL` | `.env.local` (dev) | HTTP actions; **no usamos** en v1 |
| **`CONVEX_URL`** | `.env.local` + **Vercel** Preview/Production | `ConvexHttpClient` desde `server/` en runtime (mismo host que `VITE_CONVEX_URL`, sin prefijo `VITE_`) |
| `CONVEX_DEPLOY_KEY` | Vercel Preview/Production | Solo build: `npx convex deploy --cmd '...'` |

### Acción manual en `.env.local`

**Catálogo compartido (recomendado):** apuntar `CONVEX_URL` al deployment **prod** para que los riddles generados en local sirvan en Production (misma fuente de verdad que Vercel). Mantener `CONVEX_DEPLOYMENT=dev:unique-echidna-841` para que `npm run convex:dev` siga sincronizando código al deployment dev.

```bash
# Runtime del backend local (vercel dev / Functions). Mismo host que prod Convex.
CONVEX_URL=https://standing-fox-900.convex.cloud

# CLI: convex dev sigue usando el deployment dev (no mezcla datos con prod).
CONVEX_DEPLOYMENT=dev:unique-echidna-841
```

**Alternativa (solo sandbox de datos):** `CONVEX_URL` al deployment dev (`https://unique-echidna-841.convex.cloud`). Útil para probar schema sin escribir en prod; los riddles no se comparten con Production.

Sin `CONVEX_URL`, el adaptador Convex del backend no podrá conectar en local.

### Acción manual en Vercel (Preview + Production)

1. Convex Dashboard → proyecto `convex-country-riddles` → deployment de **producción** (no el dev `unique-echidna-841`).
2. Copiar **Deployment URL** → `https://....convex.cloud`.
3. Vercel → Settings → Environment Variables:

   | Name | Environments |
   |------|----------------|
   | `CONVEX_URL` | Production, Preview |
   | `CONVEX_DEPLOYMENT` | Production, Preview (opcional, ej. `prod:...`) |

Verificar: `npx vercel env ls` debe listar `CONVEX_URL`.

> **Importante:** el deployment **dev** (`unique-echidna-841`) es solo para local. Preview/Production deben apuntar al deployment **prod** de Convex, no al dev.

---

## 3. Desarrollo local (dos terminales)

```bash
# Terminal 1 — sincroniza convex/ al deployment dev
npm run convex:dev

# Terminal 2 — API Vercel + carga .env.local en api/
npm run dev:api

# Terminal 3 (opcional) — frontend Vite
npm run dev
```

Smoke test Convex:

```bash
npx convex run ping:health
# Esperado: { ok: true }
```

---

## 4. Deploy en Vercel

**Build Command** (Dashboard → Settings → Build & Development Settings):

```bash
npx convex deploy --typecheck=disable --cmd 'npm run build'
```

Requisitos:

- `CONVEX_DEPLOY_KEY` ya provisionada por Marketplace.
- `CONVEX_URL` apuntando al deployment **prod** de Convex.

`--typecheck=disable` evita un segundo typecheck del CLI de Convex que duplica `tsc -b` del proyecto y emitía falsos errores de narrowing en unions del backend (`AiPromptsResult`, `LearnResult`, etc.). La validación real sigue en `npm run build`.

Cada deploy a Vercel sube schema + funciones de `convex/` a prod antes de compilar el front.

---

## 5. `convex/_generated/` en git

**Recomendación:** commitear `convex/_generated/` para que CI/typecheck no requiera `convex dev` previo. Regenerar con `npx convex dev` tras cambiar `schema.ts` o funciones.

---

## 6. Próximo paso (feature)

Estado actual: la feature **`riddle-storage-convex`** ya está implementada (tabla `riddles` con índice `by_lookup`, adaptadores `RiddleRepositoryConvex` + L1, integración con `generate-ai-prompts`, dedupe via `excludedIds` desde el cliente).

Documentos:

| Documento | Rol |
|-----------|-----|
| [`../riddle-storage-convex/00-decision-persistencia-riddles-convex.md`](../riddle-storage-convex/00-decision-persistencia-riddles-convex.md) | ADR (D1–D9) |
| [`../riddle-storage-convex/01-prd-riddle-storage-convex.md`](../riddle-storage-convex/01-prd-riddle-storage-convex.md) | PRD aprobado |
| [`../riddle-storage-convex/02-plan-implementacion-riddle-storage-convex.md`](../riddle-storage-convex/02-plan-implementacion-riddle-storage-convex.md) | Plan vivo en formato checklist (con ritual obligatorio entre tareas) |

`CONVEX_URL` queda **obligatorio** en el entorno del backend (Vercel Functions y `vercel dev`); sin ese valor, `/api/v1/prompts/generate` corta con `CONVEX_UNAVAILABLE` (HTTP 503).
