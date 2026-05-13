# The Map World Game 2026

SPA de juego de geografía sobre mapa mundial: configuración de partida (jugadores, modo país o capital, región, anti-cheat), turnos locales, puntuación y resultados. Este repositorio es la **reedición** del proyecto clásico **themapgame** (2016), que está en GitHub del autor y estaba hecho con **HTML, CSS y jQuery** y código del lado del cliente sin framework moderno. La intención aquí es conservar la **idea de juego similar**, pero con **stack actual** (React 19, TypeScript estricto, Vite, Tailwind, Vitest, Playwright) y un proceso de desarrollo apoyado en **agentes de IA** de principio a fin.

## Contexto técnico

- **Runtime:** Node.js 20+
- **Gestor:** npm 10+
- **Requisitos de producto y criterios de aceptación:** `docs/requirements/`
- **Plan de arquitectura MVP:** `docs/architecture/mvp_frontend_map_game_1b56bd4b.plan.mdc`
- **Checklist de implementación:** `docs/tasks/mvp-frontend-implementation-todos.mdc`

## Scripts

| Comando | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Verifica `datasetVersion`, compila TypeScript y genera el build de producción |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (unit / componentes) |
| `npm run e2e` | Playwright |
| `npm run check:dataset-version` | Comprueba que la versión del dataset esté definida (también se ejecuta en `build`) |

## Arranque rápido

```bash
npm install
npm run dev
```

Para probar e2e, suele hacer falta tener instalados los navegadores de Playwright (`npx playwright install` la primera vez).

## Estado del proyecto

El **MVP frontend** del plan (fases 0–8), la **iteración UX + datos** y la **internacionalización ES/EN** (selector en Setup, persistencia, prompts localizados; ver [`docs/requirements/04-current-state-post-mvp.mdc`](docs/requirements/04-current-state-post-mvp.mdc) y [`docs/tasks/i18n-multilenguaje/`](docs/tasks/i18n-multilenguaje/)) están implementados. Opcional en backlog: persistencia de sesión en `sessionStorage` y pantalla *about* de fuentes y licencias del dataset (ver sección P2 en `docs/tasks/mvp-frontend-implementation-todos.mdc`).

**Instalación:** si `npm install` falla por peer de `react-simple-maps` con React 19, probar `npm install --legacy-peer-deps` (ver `package-lock.json`).

## Estructura principal del código

- `src/features/setup` — configuración de partida
- `src/features/game` — partida en curso
- `src/services/` — lógica de dominio (pool, turnos, puntuación, anti-cheat, etc.)
- `src/types/` — tipos compartidos
- `src/data/` — dataset, versión y loaders
- `src/components/` — UI reutilizable (mapa, HUD, error boundary, etc.)
- `e2e/` — pruebas end-to-end
