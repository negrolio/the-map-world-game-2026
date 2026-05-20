# Checklist — Fase 1 modo aprendizaje (cerrada en repo)

**Fecha cierre:** 2026-05-18  
**PRD:** [01-prd-modo-aprendizaje.md](./01-prd-modo-aprendizaje.md)

## Backend local

- [x] `vercel.json` + `api/v1/health`
- [x] `server/learn/` — validación, orquestador, Wikipedia, caché 24h
- [x] `GET /api/v1/countries/:iso2/learn` + CORS (`ALLOWED_ORIGINS`)
- [x] User-Agent documentado en [02-dev-local-p0.md](./02-dev-local-p0.md)
- [x] Vitest núcleo + mocks (sin Wikipedia en CI)

## Frontend

- [x] `learn-api-client.ts` + tipos `shared/`
- [x] i18n `errors` + `learn`
- [x] Home: idioma + CTA **Modo aprendizaje**
- [x] `LearnMapView` + `CountryLearnModal` + `useCountryLearn`
- [x] Caché cliente (`sessionStorage` última ficha)
- [x] `WorldMap.mapInteractionLocked` (modal abierto)

## Tests

- [x] Vitest: `server/learn`, `learn-api-client`, modal, hook
- [x] Playwright: `e2e/learn-flow.spec.ts` (API mock)
- [x] Regresión quiz: `e2e/game-flow.spec.ts` (`goToSetup` con locale en Home)

## Manual (desarrollador)

- [ ] `npx vercel login` + `npm run dev:api`
- [ ] `curl http://localhost:3000/api/v1/health`
- [ ] `curl "http://localhost:3000/api/v1/countries/AR/learn?locale=es"` (red real)
- [ ] Flujo UI: Home → aprendizaje → clic país → modal → cerrar

## Fase 2 (P8)

- [x] Rate limiting en `GET .../learn` (`RATE_LIMITED`, `429`, `Retry-After`)
- [ ] Deploy Vercel producción — ver [04-fase-2-deploy.md](./04-fase-2-deploy.md)
- [ ] Variables `ALLOWED_ORIGINS` + `VITE_API_BASE_URL` en dashboard
- [ ] Smoke HTTPS (`curl` health + learn)
