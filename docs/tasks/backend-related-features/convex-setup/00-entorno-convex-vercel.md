# Convex + Vercel — entorno listo (pre-feature)

**Proyecto Convex:** `convex-country-riddles` (team `leo-mol-s-projects`, Vercel Marketplace).  
**Dashboard dev:** [unique-echidna-841](https://dashboard.convex.dev/d/unique-echidna-841)

Arquitectura acordada: **Opción 1** — lógica en Vercel Functions (`api/` + `server/`), Convex solo como almacén. El frontend **no** llama a Convex directamente.

---

## 1. Estado actual (post `npx convex dev --once`)

| Pieza | Estado |
|-------|--------|
| `convex` en `package.json` | Instalado (`1.39.1`, `--ignore-scripts`) |
| Carpeta `convex/` | `_generated/`, `schema.ts` (vacío), `ping.ts` |
| Credenciales CLI | `~/.convex/config.json` (local, no commitear) |
| `.env.local` | Convex añadió `CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` |
| Vercel env | `CONVEX_DEPLOY_KEY` en Preview + Production (Marketplace) |

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

Añadir (copiar el valor de `VITE_CONVEX_URL`):

```bash
# Mismo URL que VITE_CONVEX_URL; solo servidor (vercel dev / Functions). No usar VITE_* en server/.
CONVEX_URL=https://<tu-deployment-dev>.convex.cloud
```

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

## 4. Deploy en Vercel (cuando existan funciones en `convex/`)

**Build Command** (Dashboard → Settings → Build & Development Settings):

```bash
npx convex deploy --cmd 'npm run build'
```

Requisitos:

- `CONVEX_DEPLOY_KEY` ya provisionada por Marketplace.
- `CONVEX_URL` apuntando al deployment **prod** de Convex.

Hasta que no haya tablas/funciones de negocio, el build actual (`npm run build`) sigue funcionando sin este paso.

---

## 5. `convex/_generated/` en git

**Recomendación:** commitear `convex/_generated/` para que CI/typecheck no requiera `convex dev` previo. Regenerar con `npx convex dev` tras cambiar `schema.ts` o funciones.

---

## 6. Próximo paso (feature)

PRD y decisión: [`../riddle-storage-convex/00-decision-persistencia-riddles-convex.md`](../riddle-storage-convex/00-decision-persistencia-riddles-convex.md), [`../riddle-storage-convex/01-prd-riddle-storage-convex.md`](../riddle-storage-convex/01-prd-riddle-storage-convex.md). Implementación: `RiddleRepository` + tabla `riddles`, dedupe por `excludedIds` en el cliente.
