# Desarrollo local — P0 (infra Vercel)

**Estado:** P0 implementado en repo.  
**Fase 1 cerrada** — ver [03-fase-1-checklist.md](./03-fase-1-checklist.md).

### Probar endpoint learn (P3)

```bash
curl -s "http://localhost:3000/api/v1/countries/AR/learn?locale=es"
# Requiere red a Wikipedia en la primera petición (cache miss)
```

## Arranque

```bash
# Terminal 1: API + front vía Vercel (recomendado para probar /api)
npm run dev:api

# Alternativa solo front Vite (sin funciones serverless):
npm run dev
```

Con `npm run dev:api`, usa **solo** `http://localhost:3000` (raíz; Vercel define `VERCEL=1` y Vite usa `base: '/'`):

| Qué | URL |
|-----|-----|
| Juego | http://localhost:3000/ |
| Health API | http://localhost:3000/api/v1/health |

Si abrís `/the-map-world-game-2026/` (ruta de GitHub Pages), Vercel redirige a `/` para evitar bucles.

`vercel.json` **no** incluye rewrites SPA en dev (rompen el proxy a Vite). El fallback `→ index.html` para deploy en nube se añadirá en fase 2.

Con `npm run dev` (sin Vercel), el juego sigue en `http://localhost:5173/the-map-world-game-2026/` y **no hay** `/api`.

`vercel dev` define `PORT` y Vite lo usa en `vite.config.ts` (`strictPort` activo) para que el CLI detecte el dev server.

## Smoke test health

```bash
curl -s http://localhost:3000/api/v1/health
# Esperado: {"ok":true}
```

## Variables de entorno

Copiar [`.env.example`](../../../../.env.example) → `.env.local` en la raíz del repo.

**Primera vez:** ejecutar `npx vercel login` (o `vercel login`) antes de `npm run dev:api`; el CLI lo pide si no hay credenciales.

| Variable | Uso |
|----------|-----|
| `VITE_API_BASE_URL` | Base URL del cliente (build Vite) |
| `ALLOWED_ORIGINS` | CORS en handlers (P3+) |
| `RATE_LIMIT_ENABLED` | `1` para probar rate limit en local (por defecto off) |

## User-Agent Wikipedia (P2)

Constante en [`server/learn/wikipedia-user-agent.ts`](../../../../server/learn/wikipedia-user-agent.ts):

```
MapWorldGame/1.0 (https://github.com/negrolio/the-map-world-game-2026; map-world-game-dev@users.noreply.github.com)
```

Requisito de la [política de User-Agent](https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy) de Wikimedia. Todas las peticiones en `wikipedia-http.ts` envían el header `User-Agent`.

## Estructura creada en P0

```
api/v1/health.ts
server/learn/
server/prompts/
shared/
vercel.json
```
