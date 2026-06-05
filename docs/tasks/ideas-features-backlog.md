# Backlog de ideas de features

Inbox liviano para anotar ideas que **aún no** están comprometidas. El objetivo es no perder ideas y priorizarlas sin contaminar las tareas activas.

> Este archivo **no** es la lista de tareas en ejecución ni el inventario de lo ya entregado.  
> **Producto entregado (iteraciones cerradas):** [`docs/requirements/04-current-state-post-mvp.mdc`](../requirements/04-current-state-post-mvp.mdc) §1.  
> **Operación (deploy, envs):** [`docs/operations/deployment-state.md`](../operations/deployment-state.md).

## Estados del backlog

| Sección | Significado |
|---------|-------------|
| **Ideas pendientes** | Idea anotada; nadie la comprometió todavía. |
| **En ejecución** | Se decidió trabajarla: hay carpeta de iteración (`docs/tasks/<nombre>/`) o trabajo activo equivalente. **No implica que esté terminada.** |
| **Cerradas** | Entregada en `main` (y en Production cuando aplique). Entrada breve + link; el detalle vive en §1 de `04-current-state-post-mvp.mdc`. |
| **Descartadas** | Decidimos no hacerla (con motivo). |

### Flujo

1. Nueva idea → **Ideas pendientes** (plantilla abajo).
2. Al **empezar** el trabajo → **En ejecución** + crear/usar carpeta de iteración (PRD, plan, etc.).
3. Al **cerrar** (merge + deploy si aplica) → **Cerradas** (una línea + links) y actualizar [`04-current-state-post-mvp.mdc`](../requirements/04-current-state-post-mvp.mdc) §1.
4. Si se descarta → **Descartadas** con motivo corto.

Mantener entradas **breves** en pendientes (1–3 líneas). El diseño y el checklist viven en la carpeta de iteración, no aquí.

### Plantilla por idea (solo **Ideas pendientes**)

```md
- **<Título corto y accionable>** — <fecha YYYY-MM-DD>
  - Contexto / problema: <qué dolor o oportunidad lo motiva>
  - Idea / dirección: <qué se imagina hacer, sin comprometerse al diseño>
  - Impacto estimado: <UX | datos | performance | accesibilidad | infra | otro> · <bajo | medio | alto>
  - Esfuerzo estimado: <bajo | medio | alto> (si ya hay intuición)
  - Notas: <links a archivos relevantes, dependencias, riesgos, descubrimientos>
```

---

## Ideas pendientes

<!-- Agregar nuevas entradas arriba de esta lista, las más recientes primero. -->

- **Modo AI — control de costo y robustez API (iteración candidata)** — 2026-05-27
  - Contexto / problema: el modo AI puede generar muchas llamadas al LLM; además el backend a veces devuelve menos adivinanzas válidas de las pedidas (validaciones V1–V8 u otras causas).
  - Sub-features:
    - **C1. Topes en Setup para modo AI** — **cerrado** (frontend) en [`setup-redesign/`](./setup-redesign/) (2026-06-04): máximo **2 jugadores** y **5 preguntas fijas** (ocultas en UI), reglas en `PRODUCT_RULES.ai` + `validateConfig` + schema Zod. Pendiente opcional: validación alineada en backend/request si aplica. El tope histórico de **3 jugadores** quedó sustituido por esta decisión.
    - **C2. Reintentos hasta completar el batch** — si la API devuelve menos ítems de los solicitados, volver a llamar (frontend u orquestación server-side) hasta alcanzar la cantidad pedida o un tope de reintentos. Definir impacto en rate limit (`prompts:`), timeout del handler y `excludedIds`.
  - Impacto estimado: infra / costos · alto.
  - Esfuerzo estimado: medio–alto.
  - Notas: al promover → `docs/tasks/modo-ai-trivia-cost-control/` con ADR sobre reintentos, límites y partial-failure. C1 y C2 son compensatorios (reintentos suben costo; topes lo acotan).

- **Modo AI — pista vía justification (iteración candidata)** — 2026-05-27
  - Contexto / problema: Convex ya persiste `justification` por riddle, pero el contrato `shared/ai-trivia-api.ts` (`AiPromptItem`) no lo expone al cliente; el jugador no puede pedir una pista ampliada durante la ronda.
  - Sub-features:
    - **H1. Exponer `justification` en la API** — extender `AiPromptItem` y el mapeo desde Convex/LLM.
    - **H2. UX de pista en juego** — botón u opción “Pista” que muestra la ampliación del texto; definir si cuesta puntos, cuántas pistas por ronda y en qué intento está disponible.
    - **H3. Persistencia en sesión** — registrar si se usó pista en `AiAttempt` o metadatos de ronda para el resumen final.
  - Impacto estimado: UX / feature · medio.
  - Esfuerzo estimado: medio.
  - Notas: al promover → `docs/tasks/modo-ai-trivia-hints/` con `00-decision-*.md` + `01-prd-*.md` + callout en PRD AI trivia. Iteración separada del grupo UX-feedback: cambia contrato API y mecánica de juego.

- **Mapa — auto-zoom post-respuesta (fit-bounds)** — 2026-05-27
  - Contexto / problema: al cerrar una ronda con error, el mapa muestra el país correcto en amarillo y el seleccionado erróneo, pero la vista puede quedar lejos de ambos (ej. Japón vs Argentina). En modo AI, hasta 3 países erróneos + el correcto deben entrar en pantalla.
  - Idea / dirección: utilidad `fit-bounds` que, dado un conjunto de ISO2, calcule `zoom` + `offset` del `MapViewport` actual para encuadrarlos con padding. Cross-mode: 2 países en country/capital, hasta 4 en AI. Reutilizar geometrías del TopoJSON y respetar `VIEWPORT_LIMITS` en `WorldMap.tsx`.
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: medio (geometría + viewport).
  - Notas: entrada atómica; puede implementarse después del grupo **Modo AI — UX de intentos y feedback** (F2 pinta países; esta entrada mueve la cámara). Archivos: `WorldMap.tsx`, util nueva tipo `world-map-fit-bounds.ts`, `GameShell.tsx`.

- **Audio del juego — música de fondo + mute** — 2026-05-27
  - Contexto / problema: la experiencia es silenciosa; falta ambiente sonoro opcional sin molestar.
  - Idea / dirección: track de fondo en loop (asset con licencia clara: CC0 o propio), botón mute persistente en HUD o Setup, primer play tras interacción del usuario (autoplay policies iOS/Safari). Persistir preferencia en `localStorage` con clave versionada (mismo patrón que i18n).
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: medio.
  - Notas: al promover → `docs/tasks/audio-music/`; abstraer reproducción en servicio (`AudioController`) para testear sin hardware. Considerar `prefers-reduced-data` y `aria-label` del toggle.

- **Botón “Setup”: el label no comunica que se abandona la partida** — 2026-05-10
  - Contexto / problema: al tocar el botón de setup durante una partida se navega a la pantalla de configuración y **se pierde el progreso** de la ronda en curso; el texto “Setup” suena a ajustes menores y no advierte que implica **salir / reiniciar flujo** de juego.
  - Idea / dirección: renombrar o complementar el CTA (ej. “Nueva partida”, “Opciones y reinicio”, “Salir al menú de juego”) y/o pedir **confirmación** si hay partida activa; revisar `aria-label` y copy en mobile donde el espacio es corto.
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: bajo–medio (según si solo copy o también modal de confirmación).
  - Notas: al promover, ubicar el componente del HUD que renderiza el botón y el handler que cambia `view` o estado de partida; alinear tono con el resto de la UI.
  - Tener en cuenta que en docs/requirements/01-prd-mvp-producto-y-requerimientos.mdc se especifica este boton, al actualizar tmb actualizar ese PRD

- **Anticheat: no persistir puntaje y mensaje explícito al usuario** — 2026-05-10
  - Contexto / problema: si existe detección de uso indebido (scripts, automatización, manipulación de cliente), persistir puntajes daría una tabla de clasificación injusta y puede frustrar a jugadores legítimos si no entienden por qué “desapareció” el resultado.
  - Idea / dirección: cuando la sesión o la partida quede marcada como **no válida** por anticheat (reglas concretas por definir), **no guardar** puntajes en servidor ni en ranking local si aplica; mostrar un mensaje **muy claro** (no técnico): que la partida no cuenta para el ranking / historial, motivo en una línea comprensible y qué puede hacer el usuario (ej. jugar de nuevo sin interferencias). Evitar ambigüedad (“no se guardó” vs “falló la red”).
  - Impacto estimado: UX / integridad · medio–alto.
  - Esfuerzo estimado: medio–alto (depende de qué se considera trampa y cómo se audita en cliente vs servidor).
  - Notas: enlaza con **Persistencia de puntajes en servidor** del mismo backlog: la política anticheat debe documentarse junto al contrato de API. Definir falsos positivos y mensajes accesibles (`aria-live` si es toast/banner). No registrar datos personales innecesarios al bloquear.

- **Filtro por continente: priorizar territorio sobre institución (caso Guyana Francesa)** — 2026-05-10
  - Contexto / problema: con el filtro por continente, territorios dependientes quedan asignados al continente de la nación administradora. Ej.: con `americas` activo, Guyana Francesa no entra en juego porque el catálogo la lista como `Europe` (por pertenecer a Francia).
  - Idea / dirección: la regla del catálogo debe ser **territorial / geográfica**, no institucional. Auditar territorios dependientes (Guyana Francesa, Groenlandia, territorios de ultramar, etc.) y reasignarlos al continente físico. Documentar el criterio para que no se vuelva a mezclar.
  - Impacto estimado: datos / UX · medio (corrige una regla incorrecta percibida por el jugador).
  - Esfuerzo estimado: bajo–medio.
  - Notas: tocar `src/data/countries.ts`, ajustar tests en `src/data/countries.test.ts` y revisar coherencia con `docs/tasks/map-game-ux-and-data/04-catalogo-paises-completo.md`. Cuidar también la resolubilidad mapa↔catálogo (alias TopoJSON).

- **Pan del mapa: curva de movimiento poco natural al arrastrar** — 2026-05-10
  - Contexto / problema: al arrastrar el mapa, el desplazamiento se siente raro: arranca lento y “salta” rápido, como si hubiera aceleración o un factor distinto al delta del puntero.
  - Idea / dirección: revisar la conversión delta-puntero → `translate` y asegurar relación 1:1 respecto del `scale` CSS actual (sin easing implícito ni clamps que generen escalones). Verificar trackpad, mouse y touch.
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: medio.
  - Notas: archivos relevantes `src/components/WorldMap.tsx` y `src/components/world-map-baseline-viewport.ts`. Relación con MAP-UX-01.

- **Persistencia de puntajes en servidor** — 2026-05-10
  - Contexto / problema: los puntajes viven solo en memoria de la sesión; al cerrar la app se pierden.
  - Idea / dirección: investigar backend simple para guardar partidas y puntajes (Supabase, Firebase, Cloudflare D1, Vercel + Postgres, etc.). Definir esquema mínimo: jugador, modo, ronda, puntaje, fecha. Decidir auth (anónimo vs identificado) y política de privacidad (sin PII innecesaria).
  - Impacto estimado: feature / infra · alto.
  - Esfuerzo estimado: alto.
  - Notas: comparar costos, vendor-lock y flujos de despliegue antes de elegir. Pensar primero la API contractual y dejar la elección de proveedor por detrás.

- **Mensajes de error de respuesta más claros y empáticos** — 2026-05-10
  - Contexto / problema: el feedback al equivocarse de país es funcional pero plano.
  - Idea / dirección: mensajes que aporten información útil (país correcto, capital, distancia o pista contextual) y un tono amable, breve y consistente. Variantes según tipo de error (clic fuera de región, país equivocado, etc.).
  - Impacto estimado: UX · medio.
  - Esfuerzo estimado: bajo.
  - Notas: revisar copy actual del overlay de feedback (relacionado con MAP-UX-02 F2.4). La base i18n ES/EN ya está en repo; cualquier mejora de tono debe hacerse en recursos `src/i18n/resources/` y claves por idioma.

---

## En ejecución

<!-- Ideas promovidas con trabajo activo. Al cerrar, mover a Cerradas y actualizar 04-current-state-post-mvp.mdc §1. -->

_Sin iteraciones en ejecución._

---

## Cerradas

<!-- Índice breve. Detalle de producto: 04-current-state-post-mvp.mdc §1. Origen de la idea: fecha en que se anotó en el backlog. -->

- **Setup redesign — menos web, más game** — promovida 2026-06-01 · cerrada 2026-06-04. [`setup-redesign/`](./setup-redesign/) — lobby (cards de modo + Jugar ahora) + panel pergamino; modo AI con máx. 2 jugadores y 5 preguntas fijas ocultas; limpieza UX (sin JSON ni cartel de config válida). Cierra también la sub-feature **C1** de *Modo AI — control de costo* (topes en Setup).

- **Modo AI — UX de intentos y feedback** — promovida 2026-05-27 · cerrada 2026-05-28. [`modo-ai-trivia-ux-feedback/`](./modo-ai-trivia-ux-feedback/) (F1–F5: link gating, highlight, anti-cheat pausado, loader, resumen final).

- **Persistencia de riddles en Convex (modo AI trivia)** — promovida 2026-05-23 · cerrada 2026-05-27 (Production). [`backend-related-features/riddle-storage-convex/`](./backend-related-features/riddle-storage-convex/) · operación [`deployment-state.md`](../operations/deployment-state.md).

- **Preguntas con IA (tags temáticos) — modo AI trivia** — promovida 2026-05-22. [`backend-related-features/modo-ai-trivia/`](./backend-related-features/modo-ai-trivia/). Persistencia original in-memory → sustituida por iteración Convex (arriba).

- **Modo aprendizaje (explorar países sin penalizar)** — promovida 2026-05-18. [`backend-related-features/modo-aprendizaje/`](./backend-related-features/modo-aprendizaje/).

- **Multilenguaje (i18n) con selector de idioma** — promovida 2026-05-13. [`i18n-multilenguaje/`](./i18n-multilenguaje/).

- **Vite: acceso desde dispositivo móvil real en red local** — anotada 2026-05-10 · cerrada en repo (sin carpeta `NN-...md`). `server.host: true` en `vite.config.ts`. Pendiente opcional: documentar en README la URL LAN.

- **Mapa en mobile: pan y zoom táctil (MAP-UX-06)** — anotada 2026-05-13 · cerrada en repo (sin carpeta `NN-...md`). `WorldMap.tsx` + tests. Ver también [`map-game-ux-and-data/01-mapa-zoom-pan-contenedor.md`](./map-game-ux-and-data/01-mapa-zoom-pan-contenedor.md).

- **Atajos para “siguiente pregunta” (solo desktop)** — anotada 2026-05-13 · cerrada en repo (sin carpeta `NN-...md`). `GameShell.tsx` + tests.

---

## Descartadas

<!-- Conservar memoria de ideas que decidimos no hacer y por qué. -->

_Sin descartes todavía._
