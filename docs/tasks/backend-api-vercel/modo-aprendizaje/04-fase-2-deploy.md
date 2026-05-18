# Fase 2 — Deploy Vercel y rate limit (P8)

**Estado en repo:** rate limiting implementado (`api/_lib/rate-limit.ts`). Deploy y smoke HTTPS son pasos manuales en tu cuenta Vercel.

## Rate limit (ya en código)

| Variable | Default | Notas |
|----------|---------|--------|
| `RATE_LIMIT_MAX` | `60` | Peticiones por ventana por IP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana fija (ms) |
| `VERCEL_ENV` | — | `preview` / `production` activan el límite |
| `RATE_LIMIT_ENABLED` | — | `1` fuerza activación (p. ej. probar en local) |
| `RATE_LIMIT_DISABLED` | — | `1` desactiva aunque sea producción |

Respuesta bloqueada: `429` + `{ "error": { "code": "RATE_LIMITED", ... } }` + header `Retry-After`.

**Nota:** el contador es en memoria del runtime serverless (por instancia). Para tráfico alto, valorar Upstash/KV en una iteración posterior.

## Deploy (manual)

1. `npx vercel login`
2. En la raíz del repo: `npx vercel link` (genera `.vercel/` — no commitear)
3. Variables en el dashboard (Production y Preview):

   | Variable | Ejemplo |
   |----------|---------|
   | `ALLOWED_ORIGINS` | `https://tu-dominio.vercel.app` |
   | `VITE_API_BASE_URL` | Misma URL del deploy (build del front) |

4. `npx vercel --prod` (o push a la rama conectada al proyecto)

## Smoke HTTPS

```bash
curl -s "https://TU_DOMINIO/api/v1/health"
curl -s "https://TU_DOMINIO/api/v1/countries/AR/learn?locale=es"
```

Desde el navegador: Home → Modo aprendizaje → clic en un país (CORS debe incluir el origen del front en `ALLOWED_ORIGINS`).

## CORS en producción

`ALLOWED_ORIGINS` debe listar **exactamente** el origen del front (esquema + host + puerto si aplica), separado por comas. Sin barra final.

## Wikipedia en producción

Respetar la política de User-Agent (ver [02-dev-local-p0.md](./02-dev-local-p0.md)). Monitorizar `503` / `WIKIPEDIA_UNAVAILABLE` si Wikipedia limita el origen del datacenter.

## Troubleshooting: `FUNCTION_INVOCATION_FAILED` en `/learn`

Si `/api/v1/health` responde `200` pero `/api/v1/countries/XX/learn` devuelve **500** con `FUNCTION_INVOCATION_FAILED`, revisar los logs de la función en Vercel. Causa habitual en este repo: imports JSON en `server/` sin atributo ESM (`with { type: 'json' }`) — Node en Vercel no usa el bundler de Vite; el crash ocurre al **cargar** el módulo, antes de ejecutar la lógica.
